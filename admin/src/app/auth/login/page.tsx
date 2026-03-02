'use client';

import { useState,useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveToken } from '@/lib/auth';

interface LoginResponse {
    access_token: string;
    token_type: string;
}

export default function LoginPage() {
    //state for form inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    const handleLogin = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Please enter both email and password');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await api.post<LoginResponse>('/auth/login', {
                email,
                password,
            });

            saveToken(response.access_token);

            router.push('/dashboard');
        }catch (err:any) {
            setError(err.message || 'Login failed');
        }finally {
            setLoading(false);
        }
    },[email,password,router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6">Login</h1>

                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    {/* Email Input */}
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail( e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder='user@example.com'
                        />
                    </div>

                    {/*Password Input */}
                    <div className="mb-6">
                        <label className='block text-gray-700 font-bold mb-2'>
                            Password
                        </label>
                        <input
                            type='password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className='w-full px-3 py-2 border border-gray-300 rounded-lg'
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
                <p className="mt-4 text-center text-gray-600">
                    Dont Have an account?
                    <a href='/auth/register' className="text-blue-600 hover:underline">
                        Sign Up
                    </a>
                </p>
            </div>
        </div>
    );
}