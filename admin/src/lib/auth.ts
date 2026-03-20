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

const TOKEN_KEY = "auth_token";
const REMEMBER_ME_DAYS = 30;

const TOKEN_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

interface SaveTokenOptions {
  remember?: boolean;
}

/** Store the JWT token in a browser cookie after successful login */
export function saveToken(token: string, options: SaveTokenOptions = {}) {
  const { remember = false } = options;
  Cookies.set(
    TOKEN_KEY,
    token,
    remember
      ? { ...TOKEN_COOKIE_OPTIONS, expires: REMEMBER_ME_DAYS }
      : TOKEN_COOKIE_OPTIONS,
  );
}

/** Retrieve the JWT token from the cookie (undefined if not logged in) */
export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY);
}

/** Remove the JWT token — used during logout */
export function removeToken() {
  Cookies.remove(TOKEN_KEY, { path: "/" });
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
