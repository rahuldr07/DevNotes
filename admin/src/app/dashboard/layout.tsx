/**
 * Dashboard Layout — Shared wrapper for all /dashboard/* pages.
 *
 * Route: /dashboard/* (all dashboard sub-routes)
 *
 * In Next.js App Router, a layout.tsx wraps all pages in its folder
 * and subfolders. This layout provides:
 *   - Shared header with logo, dark mode toggle, and logout button
 *   - Consistent background and max-width container
 *   - Dark mode support via ThemeProvider context
 *
 * The {children} prop is replaced by the actual page content:
 *   /dashboard         → dashboard/page.tsx
 *   /dashboard/create  → dashboard/create_note/page.tsx
 *   /dashboard/edit    → dashboard/edit_note/page.tsx
 *
 * 'use client' is required because this layout uses hooks
 * (useRouter, useTheme) and handles user interactions (logout, toggle).
 */
'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';              // Prefetches routes for faster navigation
import { useTheme } from '@/components/ThemeProvider';  // Dark mode context
import { Sun, Moon } from 'lucide-react';  // Theme toggle icons
import { removeToken } from '@/lib/auth';  // Clears JWT cookie on logout

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    // Read current theme and toggle function from ThemeProvider context
    const { theme, toggleTheme } = useTheme();

    /**
     * Logout handler — clears the auth cookie and redirects to login.
     * Uses router.push (not <Link>) because this is an action, not navigation.
     */
    const handleLogout = () => {
        removeToken();
        router.push('/auth/login');
    };

    return (
        <div className='min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors'>
            {/* Shared Header - appears on all /dashboard pages */}
            <header className='bg-white dark:bg-gray-800 shadow transition-colors'>
                <div className='max-w-6xl mx-auto px-4 py-6 flex justify-between items-center'>
                    <Link href='/dashboard' className='text-3xl font-bold dark:text-white'>
                        DevNotes
                    </Link>
                    <div className='flex items-center gap-3'>
                        {/* Theme Toggle Button */}
                        <button 
                            onClick={toggleTheme}
                            className='p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors'
                            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                            >
                                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} className='text-yellow-400' />}
                        </button>
                        <button 
                            onClick={handleLogout}
                            className='bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700'>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content - rendered by child pages */}
            <main className='max-w-6xl mx-auto px-4 py-8'>
                {children}
            </main>
        </div>
    );
}