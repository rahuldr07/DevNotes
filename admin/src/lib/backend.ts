/**
 * Backend Fetch Utility — SERVER-SIDE ONLY.
 *
 * This file is the ONLY place that knows the real FastAPI backend URL.
 * It is imported exclusively by Route Handlers (src/app/api/), which
 * run on the Next.js server — never in the browser.
 *
 * Architecture:
 *   Browser → /api/* (Next.js) → backendFetch() → FastAPI (localhost:8000)
 *
 * Why this exists:
 * - Hides the backend URL from the browser (security)
 * - Single source of truth for the backend URL
 * - To switch environments (dev → prod), change one env variable
 */

/**
 * The actual FastAPI backend URL.
 *
 * Uses process.env.BACKEND_URL (WITHOUT the NEXT_PUBLIC_ prefix).
 * In Next.js:
 *   - NEXT_PUBLIC_* → bundled into browser JS (visible to users)
 *   - Everything else → server-only (never reaches the browser)
 *
 * Set this in your .env.local file for different environments:
 *   Development: BACKEND_URL=http://localhost:8000
 *   Production:  BACKEND_URL=https://api.yourdomain.com
 */
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * Forwards an HTTP request to the FastAPI backend.
 *
 * This is a thin wrapper around fetch() that:
 * 1. Prepends the backend URL to the endpoint
 * 2. Sets 'Content-Type: application/json' as default
 * 3. Returns the raw Response (not parsed JSON) so the caller
 *    can inspect status codes, headers, etc.
 *
 * @param endpoint - The API path (e.g., '/auth/login', '/notes/5')
 * @param options  - Standard fetch options (method, headers, body)
 * @returns Raw fetch Response object
 *
 * @example
 *   // Called from the catch-all Route Handler:
 *   const response = await backendFetch('/auth/login', {
 *       method: 'POST',
 *       body: '{"email":"a@b.com","password":"123"}',
 *       headers: { Authorization: 'Bearer token123' }
 *   });
 */
export async function backendFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  return fetch(`${BACKEND_URL}${endpoint}`, {
    ...options,
    headers: {
      // Default to JSON — FastAPI expects this
      "Content-Type": "application/json",
      // Caller's headers (e.g., Authorization) override/merge with defaults
      ...options.headers,
    },
  });
}
