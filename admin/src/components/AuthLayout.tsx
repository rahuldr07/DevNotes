"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ThemePickerPopover } from "@/components/ThemePickerPopover";

interface AuthLayoutProps {
  children: React.ReactNode;
  breadcrumb: string;
}

export function AuthLayout({ children, breadcrumb }: AuthLayoutProps) {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)" }}
    >
      <div className="relative z-10 mx-auto flex w-full max-w-[1000px] items-center justify-between px-8 py-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm transition-colors hover:text-[var(--accent)]"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={14} />
          back to home
        </Link>
        <span
          className="text-xs lowercase"
          style={{ color: "var(--text-secondary)", letterSpacing: "0.02em" }}
        >
          {breadcrumb}
        </span>
        <ThemePickerPopover />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="mb-12 flex items-center">
          <span
            className="text-2xl font-medium lowercase"
            style={{ color: "var(--accent)" }}
          >
            devnotes
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
