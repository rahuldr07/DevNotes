"use client";

import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { ThemePickerPopover } from "@/components/ThemePickerPopover";
import { useTheme } from "@/components/ThemeProvider";

interface AuthLayoutProps {
  children: React.ReactNode;
  breadcrumb: string;
}

export function AuthLayout({ children, breadcrumb }: AuthLayoutProps) {
  const { currentThemeMeta } = useTheme();

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: "var(--bg-color)", color: "var(--text-color)" }}
    >
      {/* Floating orbs — use main-color + sub-alt blobs for depth */}
      <div
        className="auth-orb-1 pointer-events-none absolute rounded-full blur-[120px]"
        style={{
          width: "500px",
          height: "500px",
          top: "-120px",
          right: "-80px",
          backgroundColor: "var(--main-color)",
          opacity: currentThemeMeta.isDark ? 0.12 : 0.08,
        }}
      />
      <div
        className="auth-orb-2 pointer-events-none absolute rounded-full blur-[100px]"
        style={{
          width: "400px",
          height: "400px",
          bottom: "80px",
          left: "-100px",
          backgroundColor: "var(--main-color)",
          opacity: currentThemeMeta.isDark ? 0.1 : 0.07,
        }}
      />
      <div
        className="auth-orb-3 pointer-events-none absolute rounded-full blur-[140px]"
        style={{
          width: "300px",
          height: "300px",
          top: "40%",
          left: "55%",
          backgroundColor: "var(--sub-alt-color)",
          opacity: currentThemeMeta.isDark ? 0.5 : 0.4,
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--sub-color)" }}
        >
          <ArrowLeft size={14} />
          back to home
        </Link>
        <span
          className="text-xs font-mono tracking-widest uppercase"
          style={{ color: "var(--sub-color)" }}
        >
          {breadcrumb}
        </span>
        <ThemePickerPopover />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-4">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              backgroundColor: "var(--main-color)",
              boxShadow: `0 8px 24px color-mix(in srgb, var(--main-color) 40%, transparent)`,
            }}
          >
            <FileText size={20} color="var(--bg-color)" strokeWidth={2.5} />
          </div>
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-color)" }}
          >
            DevNotes
          </span>
        </div>

        {children}
      </div>
    </div>
  );
}
