'use client';

import { useState,useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveToken } from '@/lib/auth';

interface SignupResponse {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
    updated_at: string | null;
}

export default function SignUpPage() {
    const [email,setEmail] = useState('');
    const [name,setName] = useState('');
    const [password,setPassword] = useState('');
    const [error,setError] = useState('');
    const [loading,setLoading] = useState(false);
    const [confirmPassword,setConfirmPassword] = useState('');

    const router = useRouter();

    const handleSignUp = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if ( !name || !email || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        
        if (password.length < 8) {
            setError("Password must be at least 8 characters long");
            return;
        }

        try {
            setLoading(true);
            setError('');

            const response = await api.post<SignupResponse>('/auth/register', {
                name,
                email,
                password,
            });

            router.push("/auth/login");
        }catch (err:any) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    },[email,password,confirmPassword,router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6">Sign Up</h1>

                {error && (
                    <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignUp}>
                    {/* Name Input */}
                    <div className="mb-4">
                        <label className="block text-gray-700 mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName( e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder='John Doe'
                            />
                    </div>
                    
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
                        <p className='text-sm text-gray-500 mt-1'>
                            Minimum 8 characters
                        </p>
                    </div>

                    {/*Confirm Password Input */}
                    <div className="mb-6">
                        <label className='block text-gray-700 font-bold mb-2'>
                            Confirm Password
                        </label>
                        <input
                            type='password'
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className='w-full px-3 py-2 border border-gray-300 rounded-lg'
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
                <p className="mt-4 text-center text-gray-600">
                    Already have an account?{' '}
                    <a href='/auth/login' className="text-blue-600 hover:underline">
                        Login
                    </a>
                </p>
            </div>
        </div>
    );
}
