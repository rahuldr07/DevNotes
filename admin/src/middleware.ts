/**
 * Next.js Middleware — Route protection layer.
 *
 * This runs SERVER-SIDE on EVERY request (before the page loads).
 * It checks if the user has an auth token and redirects accordingly:
 *
 *   - Unauthenticated user visits /dashboard → redirect to /auth/login
 *   - Authenticated user visits /auth/login  → redirect to /dashboard
 *
 * IMPORTANT: This runs on the Edge (server), NOT in the browser.
 * Therefore we use request.cookies (server-side API), NOT js-cookie
 * (which only works in the browser).
 */
import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Get the URL path the user is trying to visit
  const pathname = request.nextUrl.pathname;

  // Read the auth token from the cookie (server-side)
  // ?.value safely handles the case where the cookie doesn't exist
  const token = request.cookies.get("auth_token")?.value;

  // Routes that require authentication
  const protectedRoutes = ["/dashboard"];

  // Routes accessible without authentication
  const _publicRoutes = ["/auth/login", "/auth/signup", "/"];

  // Check if the current path starts with any protected route
  // e.g., /dashboard, /dashboard/create_note, /dashboard/edit_note
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route),
  );

  // GUARD: Unauthenticated user trying to access protected page → send to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/auth/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // GUARD: Authenticated user trying to access login/signup → send to dashboard
  // (No need to show login page if already logged in)
  if ((pathname === "/auth/login" || pathname === "/auth/signup") && token) {
    const loginUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // No redirect needed — allow the request to proceed
  return NextResponse.next();
}

/**
 * Matcher config — tells Next.js WHICH routes this middleware runs on.
 *
 * The regex '/((?!api|_next/static|_next/image|favicon.ico).*)' means:
 * "Run middleware on ALL routes EXCEPT:"
 *   - /api/*          → API Route Handlers (our proxy) — shouldn't be redirected
 *   - /_next/static/* → Static assets (JS, CSS bundles)
 *   - /_next/image/*  → Optimized images
 *   - /favicon.ico    → Browser icon
 *
 * Without this, middleware would intercept API calls and static files too,
 * causing infinite redirect loops or broken assets.
 */
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
