/**
 * Signup Page — Creates a new user account.
 *
 * Route: /auth/signup
 *
 * Flow:
 * 1. User fills in name, email, password, confirm password
 * 2. Client-side validation (all fields, password match, min length)
 * 3. Form submits → POST /api/auth/register (proxied to FastAPI)
 * 4. FastAPI creates the user in PostgreSQL → returns user data
 * 5. User is redirected to /auth/login to log in with new account
 *
 * Note: The backend does NOT return a token on signup, so we
 * redirect to login instead of auto-logging in.
 */
'use client';

import { useState,useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveToken } from '@/lib/auth';

/**
 * Shape of the response from POST /auth/register.
 * Matches the UserResponse schema in FastAPI (backend/app/schemas/user.py).
 */
interface SignupResponse {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
    updated_at: string | null;
}

export default function SignUpPage() {
    // Form state for all input fields
    const [email,setEmail] = useState('');
    const [name,setName] = useState('');
    const [password,setPassword] = useState('');
    const [error,setError] = useState('');
    const [loading,setLoading] = useState(false);
    const [confirmPassword,setConfirmPassword] = useState('');

    const router = useRouter();

    /**
     * Form submission handler with client-side validation.
     *
     * Validates:
     * - All fields are filled
     * - Password matches confirmation
     * - Password meets minimum length (8 chars)
     *
     * Then sends registration request to the backend.
     */
    const handleSignUp = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate all fields are filled
        if ( !name || !email || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        // Validate password confirmation matches
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        
        // Validate minimum password length
        if (password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        try {
            setLoading(true);
            setError('');

            // Send registration request through the proxy:
            // Browser → /api/auth/register → FastAPI → creates user
            const response = await api.post<SignupResponse>('/auth/register', {
                name,
                email,
                password,
            });

            // Redirect to login page (backend doesn't return a token on signup)
            router.push("/auth/login");
        }catch (err:any) {
            // Display error from FastAPI (e.g., "Email already registered")
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    },[email,password,confirmPassword,router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 dark:text-white">Sign Up</h1>

                {error && (
                    <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignUp}>
                    {/* Name Input */}
                    <div className="mb-4">
                        <label className="block text-gray-700 dark:text-gray-300 mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName( e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                            placeholder='John Doe'
                            />
                    </div>
                    
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
                        <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
                            Minimum 8 characters
                        </p>
                    </div>

                    {/*Confirm Password Input */}
                    <div className="mb-6">
                        <label className='block text-gray-700 dark:text-gray-300 font-bold mb-2'>
                            Confirm Password
                        </label>
                        <input
                            type='password'
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white'
                            placeholder='••••••••'
                        />
                    </div>

                    {/* Sign Up Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className='w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400'
                    >
                        {loading ? 'Signing up...' : 'Sign Up'}
                    </button>
                </form>

                {/* Signup Link */}
                <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <a href='/auth/login' className="text-blue-600 hover:underline">
                        Login
                    </a>
                </p>
            </div>
        </div>
    );
}
