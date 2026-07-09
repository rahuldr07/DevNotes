import { type NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
]);

const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const ACCESS_COOKIE = "auth_token";
const REFRESH_COOKIE = "devnotes_refresh_token";

interface TokenPayload {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  remember_me?: boolean;
  refresh_expires_in?: number;
}

const DEFAULT_REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

function buildBackendEndpoint(request: NextRequest, path: string[]) {
  const endpoint = `/${path.map(encodeURIComponent).join("/")}`;
  return `${endpoint}${request.nextUrl.search}`;
}

function readCookieFromHeader(request: NextRequest, name: string) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const match = cookies.find((cookie) => cookie.startsWith(prefix));
  if (!match) return undefined;

  return decodeURIComponent(match.slice(prefix.length));
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers();

  for (const [key, value] of request.headers.entries()) {
    const lowerKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerKey)) continue;

    // The browser-facing cookie is handled by the client API layer through the
    // Authorization header today. Avoid leaking Next.js/session cookies to the
    // FastAPI service until the HttpOnly BFF auth flow is implemented.
    if (lowerKey === "cookie") continue;

    headers.set(key, value);
  }

  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  if (!headers.has("authorization")) {
    const token =
      request.cookies.get(ACCESS_COOKIE)?.value ??
      readCookieFromHeader(request, ACCESS_COOKIE);
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
  }

  return headers;
}

function buildResponseHeaders(response: Response) {
  const headers = new Headers();

  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerKey)) return;
    if (lowerKey === "content-encoding") return;
    if (lowerKey === "content-length") return;
    headers.set(key, value);
  });

  return headers;
}

function isTokenEndpoint(endpoint: string) {
  const path = endpoint.split("?")[0];
  return path === "/auth/login" || path === "/auth/refresh";
}

function isLogoutEndpoint(endpoint: string) {
  return endpoint.split("?")[0] === "/auth/logout";
}

function cookieSecure(request: NextRequest) {
  return request.nextUrl.protocol === "https:";
}

function applyAuthCookies(
  request: NextRequest,
  response: NextResponse,
  tokens: TokenPayload,
) {
  if (tokens.access_token) {
    response.cookies.set(ACCESS_COOKIE, tokens.access_token, {
      httpOnly: false,
      secure: cookieSecure(request),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 30,
    });
  }

  if (tokens.refresh_token) {
    // Remember-me sessions persist across browser restarts; otherwise the
    // refresh cookie is a session cookie (no maxAge) and dies with the browser.
    response.cookies.set(REFRESH_COOKIE, tokens.refresh_token, {
      httpOnly: true,
      secure: cookieSecure(request),
      sameSite: "lax",
      path: "/",
      ...(tokens.remember_me
        ? { maxAge: tokens.refresh_expires_in ?? DEFAULT_REFRESH_MAX_AGE }
        : {}),
    });
  }
}

function clearAuthCookies(response: NextResponse) {
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
}

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const endpoint = buildBackendEndpoint(request, path);
    const headers = buildForwardHeaders(request);

    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
      cache: "no-store",
    };

    if (BODY_METHODS.has(request.method)) {
      fetchOptions.body = await request.arrayBuffer();
    }

    const response = await backendFetch(endpoint, fetchOptions);
    const responseHeaders = buildResponseHeaders(response);

    if (response.status === 204 || response.status === 304) {
      const nextResponse = new NextResponse(null, {
        status: response.status,
        headers: responseHeaders,
      });
      if (isLogoutEndpoint(endpoint)) clearAuthCookies(nextResponse);
      return nextResponse;
    }

    if (response.ok && isTokenEndpoint(endpoint)) {
      const body = await response.text();
      const nextResponse = new NextResponse(body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });

      try {
        applyAuthCookies(
          request,
          nextResponse,
          JSON.parse(body) as TokenPayload,
        );
      } catch {
        // Keep the original token response intact even if cookie hydration fails.
      }

      return nextResponse;
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("API proxy failure", error);
    return NextResponse.json(
      { detail: "Backend service unavailable" },
      { status: 502 },
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
