/**
 * Root Layout — wraps EVERY page in the application.
 *
 * In Next.js App Router, layout.tsx files define shared UI that
 * persists across page navigations. This root layout is the
 * outermost wrapper — it provides the <html> and <body> tags.
 *
 * This is a SERVER COMPONENT (no 'use client') — it renders on
 * the server and sends HTML to the browser. Good for SEO and performance.
 *
 * File: src/app/layout.tsx → applies to ALL routes (/, /auth/*, /dashboard/*)
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

/**
 * Google Font loading — Next.js automatically optimizes these:
 * - Downloads at build time (no runtime requests to Google)
 * - Self-hosts the font files
 * - Sets CSS variables for use in Tailwind/CSS
 */
const geistSans = Geist({
  variable: "--font-geist-sans",  // CSS variable name for Tailwind
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Page metadata — sets <title> and <meta description> in <head>.
 * This is used by search engines (SEO) and browser tabs.
 * Individual pages can override this with their own metadata export.
 */
export const metadata: Metadata = {
  title: "DevNotes",
  description: "A full-stack developer note-taking and blog platform",
};

/**
 * The root layout component.
 *
 * @param children — The page content. Next.js injects the current
 *                   page's component here based on the URL.
 *
 * Readonly<{ children: React.ReactNode }> — TypeScript type that:
 * - Readonly<> → prevents accidentally mutating the props
 * - React.ReactNode → children can be any valid React content
 *
 * The className applies both font CSS variables and Tailwind's
 * 'antialiased' for smoother font rendering.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
