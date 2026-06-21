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

function buildBackendEndpoint(request: NextRequest, path: string[]) {
  const endpoint = `/${path.map(encodeURIComponent).join("/")}`;
  return `${endpoint}${request.nextUrl.search}`;
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
      return new NextResponse(null, {
        status: response.status,
        headers: responseHeaders,
      });
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
