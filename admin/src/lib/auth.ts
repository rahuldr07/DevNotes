/**
 * Authentication Helpers — CLIENT-SIDE cookie management.
 *
 * This file manages the JWT token in browser cookies using js-cookie.
 * The token is set during login and read by:
 *   - api.ts → attaches it as Authorization header on every request
 *   - middleware.ts → reads it server-side to protect routes
 *     (middleware uses request.cookies, NOT this file, because
 *      js-cookie only works in the browser)
 *
 * Cookie name: "auth_token"
 */
import Cookies from "js-cookie";

/** Store the JWT token in a browser cookie after successful login */
export function saveToken(token: string) {
  Cookies.set("auth_token", token);
}

/** Retrieve the JWT token from the cookie (undefined if not logged in) */
export function getToken(): string | undefined {
  return Cookies.get("auth_token");
}

/** Remove the JWT token — used during logout */
export function removeToken() {
  Cookies.remove("auth_token");
}

/**
 * Quick check if the user has a token.
 * !! converts a value to boolean:
 *   !!undefined → false (not logged in)
 *   !!"abc123"  → true  (logged in)
 *
 * Note: This only checks if a token EXISTS, not if it's valid/expired.
 * Token validation happens on the backend (FastAPI).
 */
export function isAuthenticated(): boolean {
  return !!getToken();
}
