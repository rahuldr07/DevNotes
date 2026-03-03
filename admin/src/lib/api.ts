/**
 * API Client — The browser's HTTP layer.
 *
 * This file runs CLIENT-SIDE (in the browser). It is the single entry
 * point for all API calls made by React components.
 *
 * Flow: Browser → /api/* (Next.js proxy) → FastAPI backend
 *
 * The browser NEVER talks directly to FastAPI. Instead, all requests
 * go to /api/* on the same origin, where the catch-all Route Handler
 * (src/app/api/[...path]/route.ts) proxies them to the backend.
 *
 * This eliminates CORS issues and hides the backend URL from the browser.
 */
import Cookies from "js-cookie";

/**
 * Base URL for all API calls.
 *
 * Set to "/api" so requests go to the same Next.js server:
 *   api.get('/auth/login') → fetch('/api/auth/login')
 *
 * The catch-all Route Handler then strips '/api' and forwards to FastAPI:
 *   /api/auth/login → http://localhost:8000/auth/login
 */
const API_BASE_URL = "/api";

/**
 * Shape of API errors thrown by the client.
 * FastAPI returns errors as { detail: "message" }, which we map to this.
 */
interface ApiError {
    message : string;
    status: number;
}

/**
 * Centralized HTTP client for making API requests.
 *
 * Usage in components:
 *   import { api } from '@/lib/api';
 *   const notes = await api.get<Note[]>('/notes/notes');
 *   const note  = await api.post<Note>('/notes/create', { title, content });
 *
 * The generic <T> lets TypeScript know the shape of the response:
 *   api.get<Note[]>(...) → returns Promise<Note[]>
 *   api.post<LoginResponse>(...) → returns Promise<LoginResponse>
 */
class ApiClient {
    /**
     * Core request method — all public methods (get, post, etc.) call this.
     *
     * Responsibilities:
     * 1. Reads JWT token from cookies and attaches as Authorization header
     * 2. Sends the request to /api/* (proxied to FastAPI)
     * 3. Handles error responses (throws ApiError)
     * 4. Handles 204 No Content (e.g., DELETE responses with no body)
     * 5. Parses and returns JSON response
     *
     * @param endpoint - API path like '/auth/login' or '/notes/5'
     * @param options  - Standard fetch options (method, body, headers)
     * @returns Parsed JSON response typed as T
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        // Read the JWT token from the browser cookie (set during login)
        // This is undefined if the user is not logged in
        const token = Cookies.get("auth_token");

        // Set default headers — Content-Type for JSON, plus any custom headers
        const headers: HeadersInit = {
            "Content-Type": "application/json",
            ...options.headers,
        };

        // If user is authenticated, attach the Bearer token
        // The proxy (route.ts) forwards this header to FastAPI
        if (token) {
            Object.assign(headers, { Authorization: `Bearer ${token}` });
        }

        // Make the actual fetch call to /api/* (same origin)
        const response = await fetch(`${API_BASE_URL}${endpoint}`,{
            ...options,
            headers,
        });

        // If the response is not OK (status 400, 401, 404, 500, etc.)
        // parse the error body and throw it so the calling component can catch it
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw {
                message: error.detail || "An error occurred",
                status: response.status,
            } as ApiError;
        }

        // Handle 204 No Content — returned by DELETE endpoints
        // Calling response.json() on a 204 would crash (no body to parse)
        if (response.status === 204) {
            return undefined as T;
        }

        // Parse and return the JSON response body
        return response.json();
    }

    /** GET request — for fetching data (notes list, single note, etc.) */
    async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: "GET" });
    }

    /** POST request — for creating resources (login, register, create note) */
    async post<T>(endpoint: string,body: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: "POST",
            body: JSON.stringify(body),
        });
    }

    /** PUT request — for full resource replacement */
    async put<T>(endpoint: string,body: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: "PUT",
            body: JSON.stringify(body),
        });
    }

    /** PATCH request — for partial updates (update note title/content) */
    async patch<T>(endpoint: string,body: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: "PATCH",
            body: JSON.stringify(body),
        });
    }

    /** DELETE request — for removing resources (delete note) */
    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: "DELETE" });
    }
}

/** Singleton instance — import this in components: import { api } from '@/lib/api' */
export const api = new ApiClient();
