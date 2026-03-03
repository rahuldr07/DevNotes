/**
 * ThemeProvider — Manages dark/light mode across the entire app.
 *
 * How it works:
 * 1. On first load, checks localStorage for a saved theme preference
 * 2. If none exists, falls back to the OS/browser preference (prefers-color-scheme)
 * 3. Adds or removes the 'dark' class on the <html> element
 * 4. globals.css has .dark { ... } CSS variables that activate when
 *    the 'dark' class is present → all dark: Tailwind classes take effect
 *
 * Uses React Context so any component can access the theme state
 * and toggle function without prop drilling (passing props through every level).
 *
 * Wrapped around the entire app in src/app/layout.tsx:
 *   <ThemeProvider>
 *     {children}
 *   </ThemeProvider>
 */
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

/** The two possible theme values */
type Theme = 'light' | 'dark';

/** Shape of the context — current theme + function to toggle it */
interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

/**
 * React Context — a way to pass data through the component tree
 * without manually passing props at every level.
 *
 * createContext(undefined) means there's no default value —
 * components MUST be inside <ThemeProvider> to access it.
 */
const themeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Initialize as 'light' — safe default for server-side rendering
    // (localStorage isn't available on the server)
    const [theme, setTheme] = useState<Theme>('light');
    // Track whether the component has mounted in the browser
    const [mounted, setMounted] = useState(false);

    /**
     * On first mount (client-side only):
     * 1. Check localStorage for a saved preference
     * 2. If none, check the OS/browser dark mode setting
     * 3. Mark as mounted so we can safely render
     *
     * Why useEffect? localStorage and window.matchMedia are browser-only APIs.
     * They don't exist on the server, so we wait until the component mounts.
     */
    useEffect(() => {
        const stored = localStorage.getItem('theme') as Theme | null;

        if (stored) {
            // User previously chose a theme — respect it
            setTheme(stored);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            // No saved preference — check if OS is in dark mode
            setTheme('dark');
        }

        // Signal that we're in the browser and have read the real preference
        setMounted(true);
    },[]);

    /**
     * Whenever the theme changes, sync it to:
     * 1. The <html> element's class list (for Tailwind dark: classes)
     * 2. localStorage (so it persists across page reloads)
     *
     * When <html> has class="dark", every Tailwind dark: class activates:
     *   bg-white dark:bg-gray-800 → bg-gray-800 is applied
     */
    useEffect(() => {
        if (!mounted) return; // Don't run on initial server render

        const root = document.documentElement; // The <html> element

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Persist to localStorage so theme survives page reloads
        localStorage.setItem('theme', theme);
    }, [theme, mounted]);

    /** Toggles between light and dark using functional state update */
    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    // Prevent flash of wrong theme (FOUC):
    // Render nothing until we know the correct theme from localStorage/OS.
    // This avoids showing light theme briefly before switching to dark.
    if (!mounted) {
        return null;
    }

    // Provide theme state and toggle function to all child components
    return (
        <themeContext.Provider value={{ theme, toggleTheme}}>
            {children}
        </themeContext.Provider>
    );
}

/**
 * Custom hook — shortcut for consuming the theme context.
 *
 * Usage in any component:
 *   const { theme, toggleTheme } = useTheme();
 *
 * Throws an error if used outside of <ThemeProvider> — this is
 * intentional to catch bugs early during development.
 */
export function useTheme() {
    const context = useContext(themeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}