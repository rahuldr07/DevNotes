/**
 * Login Page — Authenticates users with email and password.
 *
 * Route: /auth/login
 *
 * Flow:
 * 1. User enters email + password
 * 2. Form submits → POST /api/auth/login (proxied to FastAPI)
 * 3. FastAPI validates credentials → returns JWT token
 * 4. Token is saved in a browser cookie (auth_token)
 * 5. User is redirected to /dashboard
 *
 * If the user is already logged in, middleware.ts redirects
 * them to /dashboard before this page even loads.
 *
 * 'use client' — Required because this page uses React hooks
 * (useState, useCallback, useRouter) and handles user interactions.
 */
'use client';

import { useState,useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveToken } from '@/lib/auth';

/**
 * Shape of the response from POST /auth/login.
 * FastAPI returns: { "access_token": "jwt...", "token_type": "bearer" }
 */
interface LoginResponse {
    access_token: string;
    token_type: string;
}

export default function LoginPage() {
    // Form state — each input has its own state variable
    // React re-renders the component when any of these change,
    // keeping the UI in sync with what the user types
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');       // Error message to display
    const [loading, setLoading] = useState(false); // Disables button while submitting

    // Next.js router for programmatic navigation (router.push)
    const router = useRouter();

    /**
     * Form submission handler.
     *
     * useCallback memoizes this function — it's only recreated when
     * email, password, or router change. Without useCallback, a new
     * function would be created on every render (minor optimization).
     *
     * @param e — The form submit event. e.preventDefault() stops the
     *            browser from doing a full page reload (default form behavior).
     */
    const handleLogin = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic client-side validation before sending to the backend
        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        try {
            setLoading(true);  // Show loading state on the button
            setError('');      // Clear any previous error

            // Send login request through the proxy:
            // Browser → /api/auth/login → FastAPI → returns JWT
            const response = await api.post<LoginResponse>('/auth/login', {
                email,
                password,
            });

            // Store the JWT token in a browser cookie for future requests
            saveToken(response.access_token);

            // Navigate to the dashboard
            router.push('/dashboard');
        }catch (err:any) {
            // Display error from FastAPI (e.g., "Invalid credentials")
            setError(err.message || 'Login failed');
        }finally {
            // Always reset loading state, whether success or failure
            setLoading(false);
        }
    },[email,password,router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 dark:text-white">Login</h1>

                {error && (
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    {/* Email Input */}
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail( e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            placeholder='user@example.com'
                        />
                    </div>

                    {/*Password Input */}
                    <div className="mb-6">
                        <label className='block text-gray-700 dark:text-gray-300 font-bold mb-2'>
                            Password
                        </label>
                        <input
                            type='password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white'
                            placeholder='••••••••'
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className='w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400'
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {/* Signup Link */}
                <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
                    Dont Have an account?
                    <a href='/auth/signup' className="text-blue-600 hover:underline">
                        Sign Up
                    </a>
                </p>
            </div>
        </div>
    );
}