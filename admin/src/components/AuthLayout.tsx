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
      className="relative flex min-h-screen flex-col overflow-hidden auth-workbench-shell"
      style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)" }}
    >
      <div className="pointer-events-none absolute inset-0 auth-workbench-grid" />
      <div className="pointer-events-none absolute -left-36 top-24 h-80 w-80 rounded-full auth-orb-1" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-full auth-orb-2" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full auth-orb-3" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-full border px-3 py-2 text-sm shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:text-[var(--accent)]"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft
            size={14}
            className="transition-transform group-hover:-translate-x-0.5"
          />
          back to home
        </Link>
        <span
          className="hidden rounded-full border px-3 py-2 text-xs lowercase shadow-sm backdrop-blur sm:inline-flex"
          style={{ color: "var(--text-secondary)", letterSpacing: "0.02em" }}
        >
          {breadcrumb}
        </span>
        <ThemePickerPopover />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-8 sm:px-6">
        <div className="mb-8 flex flex-col items-center gap-3 text-center sm:mb-10">
          <span
            className="rounded-full border px-4 py-2 text-2xl font-semibold lowercase shadow-sm backdrop-blur"
            style={{ color: "var(--accent)" }}
          >
            devnotes
          </span>
          <span
            className="text-xs lowercase"
            style={{ color: "var(--text-secondary)" }}
          >
            editor-grade notes, private by default
          </span>
        </div>
        <div className="auth-command-card w-full max-w-md p-5 sm:p-6">
          <div
            className="mb-5 flex items-center gap-2 border-b pb-4"
            style={{ borderColor: "var(--border)" }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "var(--error-color)" }}
            />
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "var(--accent)" }}
            />
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: "var(--success)" }}
            />
            <span
              className="ml-3 text-xs lowercase"
              style={{ color: "var(--text-secondary)" }}
            >
              session.ts
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
