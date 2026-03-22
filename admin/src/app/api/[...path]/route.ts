/**
 * Catch-All API Proxy — Routes ALL /api/* requests to FastAPI.
 *
 * This is the BFF (Backend-For-Frontend) pattern. Instead of the browser
 * talking directly to FastAPI, this single file acts as a proxy:
 *
 *   Browser → /api/auth/login → this handler → http://localhost:8000/auth/login
 *   Browser → /api/notes/5    → this handler → http://localhost:8000/notes/5
 *
 * The [...path] folder name is a "catch-all" dynamic segment:
 *   /api/auth/login      → path = ['auth', 'login']
 *   /api/notes           → path = ['notes']
 *   /api/notes/5/update  → path = ['notes', '5', 'update']
 *
 * Benefits:
 * - Backend URL is hidden from the browser (security)
 * - No CORS needed (same-origin requests)
 * - One file handles ALL endpoints — add 100 backend APIs, zero changes here
 * - Can add logging, rate limiting, or caching in one place later
 *
 * This file runs SERVER-SIDE only (Next.js Route Handler).
 */
import { type NextRequest, NextResponse } from "next/server";
import { backendFetch } from "@/lib/backend";

/**
 * Universal request handler for all HTTP methods.
 *
 * @param request - The incoming HTTP request from the browser
 * @param params  - Contains the catch-all path segments as a string array
 *                  In Next.js 15+, params is a Promise that must be awaited
 */
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    // 1. Reconstruct the backend endpoint from path segments
    //    ['auth', 'login'] → '/auth/login'
    //    ['notes', '5']    → '/notes/5'
    const { path } = await params;
    const endpoint = `/${path.join("/")}`;

    // 2. Forward the Authorization header (JWT token) if the browser sent one
    //    This allows authenticated requests to pass through to FastAPI
    const token = request.headers.get("Authorization");
    const headers: Record<string, string> = {
      ...(token ? { Authorization: token } : {}),
    };

    // 3. Mirror the original HTTP method (GET, POST, PATCH, DELETE, etc.)
    const fetchOptions: RequestInit = {
      method: request.method,
      headers,
    };

    // 4. Only read the request body for methods that carry data
    //    GET and DELETE don't have bodies; POST, PUT, PATCH do
    //    Using .text() instead of .json() avoids an unnecessary
    //    parse → stringify round-trip (body is already a JSON string)
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      fetchOptions.body = await request.text();
    }

    // 5. Forward the request to FastAPI via the backend utility
    const response = await backendFetch(endpoint, fetchOptions);

    // 6. Handle 204 No Content (e.g., successful DELETE)
    //    204 has no response body, so calling .json() would crash
    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    // 7. Forward FastAPI's response (data + status code) to the browser
    //    This includes both success (200, 201) and error (400, 401, 404) responses
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (_error) {
    // 8. Catches proxy-level failures (FastAPI is down, network error, etc.)
    //    NOT FastAPI validation errors — those are handled by step 7 above
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Export the same handler for every HTTP method.
 *
 * Next.js Route Handlers use named exports to declare which methods are accepted:
 *   export const GET  → accepts GET requests
 *   export const POST → accepts POST requests
 *   etc.
 *
 * Any method NOT exported auto-returns 405 Method Not Allowed.
 * Since our proxy supports all standard methods, we export all five.
 */
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
