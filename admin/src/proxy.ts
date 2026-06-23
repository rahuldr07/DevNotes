import { decodeJwt } from "jose";
import { type NextRequest, NextResponse } from "next/server";

const TOKEN_COOKIE = "auth_token";
const PROTECTED_ROUTES = ["/dashboard"];
const AUTH_ROUTES = ["/auth/login", "/auth/signup"];

function isTokenUsable(token: string | undefined): boolean {
  if (!token) return false;

  try {
    const payload = decodeJwt(token);
    if (typeof payload.exp !== "number") return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function redirectWithClearedToken(request: NextRequest, pathname: string) {
  const response = NextResponse.redirect(new URL(pathname, request.url));
  response.cookies.delete(TOKEN_COOKIE);
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const hasValidToken = isTokenUsable(token);
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route),
  );
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  if (isProtectedRoute && !hasValidToken) {
    return redirectWithClearedToken(request, "/auth/login");
  }

  if (isAuthRoute && hasValidToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (token && !hasValidToken) {
    const response = NextResponse.next();
    response.cookies.delete(TOKEN_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
