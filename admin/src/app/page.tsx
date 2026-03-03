/**
 * Home Page — Smart redirect based on authentication status.
 *
 * Route: / (root URL)
 *
 * This page doesn't show any real content. It just checks if the
 * user is logged in and redirects them to the appropriate page:
 *   - Authenticated   → /dashboard
 *   - Not authenticated → /auth/login
 *
 * 'use client' is required because we use hooks (useEffect, useRouter)
 * and read cookies (isAuthenticated uses js-cookie, a browser-only library).
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function Home() {
  const router = useRouter();

  // Runs once after the component mounts (empty dependency = [router])
  // Checks for auth token in cookies and redirects accordingly
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    } else {
      router.push('/auth/login');
    }
  },[router]);

  // Brief loading state shown while the redirect is in progress
  return (
    <div className='flex items-center justify-center min-h-screen'>
      <p className='text-gray-600 dark:text-gray-400'>Redirecting...</p>
    </div>
  );
}