/**
 * Landing Page — Public marketing page for DevNotes.
 *
 * Route: / (root URL)
 *
 * Guests see the product story: hero, editor preview, feature grid,
 * the knowledge loop, and CTAs into signup/login.
 * Authenticated users are redirected straight to /dashboard by the
 * middleware (src/proxy.ts), which can read the HttpOnly auth cookie.
 */
"use client";

import {
  ArrowRight,
  Code2,
  Command,
  Globe2,
  History,
  Search,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { ThemeStudioTrigger } from "@/components/ThemeStudio";

const FEATURES = [
  {
    icon: Zap,
    title: "quick capture",
    body: "Save a note, snippet, link, or task from the dashboard in one submit. No modal, no ceremony.",
    chip: "enter to save",
  },
  {
    icon: Code2,
    title: "snippet vault",
    body: "Code-first notes with language lanes, copy-ready blocks, and metadata built for reuse.",
    chip: "copy in one click",
  },
  {
    icon: Search,
    title: "ranked search",
    body: "Postgres full-text search with real ranking, wrapped in a keyboard-first command palette.",
    chip: "ctrl+k anywhere",
  },
  {
    icon: History,
    title: "version history",
    body: "Every edit snapshots the previous version. Roll back or diff your thinking over time.",
    chip: "20 versions per note",
  },
  {
    icon: Globe2,
    title: "publish beautifully",
    body: "Turn private notes into editorial public pages with author cards, reading time, and related notes.",
    chip: "own your profile",
  },
  {
    icon: ShieldCheck,
    title: "sessions done right",
    body: "Rotating refresh tokens with reuse detection, HttpOnly cookies, and per-device sessions.",
    chip: "private by default",
  },
];

const LOOP_STEPS = [
  "capture",
  "organize",
  "retrieve",
  "reuse",
  "publish",
  "grow",
];

// Signed-in users skip the marketing page and land in their cockpit — the
// middleware (src/proxy.ts) handles that redirect, since the auth cookie is
// HttpOnly and unreadable from client JS.
export default function Home() {
  return (
    <div
      className="auth-workbench-shell relative flex min-h-screen flex-col overflow-hidden"
      style={{ backgroundColor: "var(--bg)", color: "var(--text-primary)" }}
    >
      <div className="pointer-events-none absolute inset-0 auth-workbench-grid" />
      <div className="pointer-events-none absolute -left-36 top-24 h-80 w-80 rounded-none auth-orb-1" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-96 w-96 rounded-none auth-orb-2" />

      {/* ── Top nav ── */}
      <header className="relative z-10 mx-auto flex w-full max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8">
        <span
          className="type-logo rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-2 text-xs backdrop-blur"
          style={{ color: "var(--accent)" }}
        >
          devnotes
        </span>
        <nav className="flex items-center gap-2">
          <Link
            href="/auth/login"
            className="rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-2 text-xs lowercase text-[var(--text-secondary)] backdrop-blur transition-all hover:-translate-y-0.5 hover:text-[var(--accent)]"
          >
            sign in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-none px-3 py-2 text-xs lowercase transition-all hover:-translate-y-0.5 hover:opacity-90"
            style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}
          >
            start writing
          </Link>
          <ThemeStudioTrigger />
        </nav>
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 mx-auto w-full max-w-[1180px] flex-1 px-5 pb-16 sm:px-8">
        <section className="grid items-center gap-10 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
          <div>
            <p className="type-eyebrow text-[var(--text-secondary)]">
              developer knowledge cockpit
            </p>
            <h1 className="type-hero mt-4 text-[var(--text-primary)]">
              capture fast.
              <br />
              reuse smarter.
              <br />
              <span style={{ color: "var(--accent)" }}>
                publish beautifully.
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              DevNotes is where your commands, configs, fixes, and guides stop
              rotting in scratch files — searchable in milliseconds, copy-ready
              when you need them, and publishable as pages worth sharing.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/auth/signup"
                className="inline-flex h-11 items-center gap-2 rounded-none px-5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:opacity-90"
                style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}
              >
                start your workspace
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex h-11 items-center gap-2 rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-5 text-sm text-[var(--text-secondary)] backdrop-blur transition-all hover:-translate-y-0.5 hover:text-[var(--accent)]"
              >
                sign in
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {["ctrl+k command palette", "n new note", "free forever"].map(
                (hint) => (
                  <span
                    key={hint}
                    className="dev-chip px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                  >
                    {hint}
                  </span>
                ),
              )}
            </div>
          </div>

          {/* ── Editor preview mock ── */}
          <div className="auth-command-card w-full p-5">
            <div
              className="mb-4 flex items-center gap-2 border-b pb-3"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                className="h-2.5 w-2.5 rounded-none"
                style={{ backgroundColor: "var(--error-color)" }}
              />
              <span
                className="h-2.5 w-2.5 rounded-none"
                style={{ backgroundColor: "var(--accent)" }}
              />
              <span
                className="h-2.5 w-2.5 rounded-none"
                style={{ backgroundColor: "var(--success)" }}
              />
              <span className="ml-3 text-xs lowercase text-[var(--text-secondary)]">
                til-postgres-upsert.md
              </span>
              <span className="ml-auto dev-chip px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.12em] text-[var(--accent)]">
                snippet
              </span>
            </div>
            <p className="text-base font-medium text-[var(--text-primary)]">
              Upsert in Postgres without a race
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["postgres", "sql", "til"].map((tag) => (
                <span
                  key={tag}
                  className="dev-chip px-2 py-0.5 text-[0.68rem] text-[var(--text-secondary)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <pre
              className="mt-4 overflow-x-auto rounded-none border p-4 text-[0.78rem] leading-6"
              style={{
                borderColor: "var(--border)",
                background: "color-mix(in srgb, var(--bg-color) 84%, black)",
              }}
            >
              <code>
                <span style={{ color: "var(--accent)" }}>INSERT INTO</span>
                {" notes (id, title)\n"}
                <span style={{ color: "var(--accent)" }}>VALUES</span>
                {" (1, 'ship it')\n"}
                <span style={{ color: "var(--accent)" }}>ON CONFLICT</span>
                {" (id) "}
                <span style={{ color: "var(--accent)" }}>DO UPDATE</span>
                {"\n"}
                <span style={{ color: "var(--text-secondary)" }}>
                  {"  SET title = EXCLUDED.title;"}
                </span>
              </code>
            </pre>
            <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <Command size={12} />
                found via “postgres upsert” in 12ms
              </span>
              <span className="dev-chip px-2 py-0.5 text-[0.68rem] text-[var(--accent)]">
                copied ✓
              </span>
            </div>
          </div>
        </section>

        {/* ── The loop ── */}
        <section className="mt-16">
          <div className="dev-panel flex flex-wrap items-center justify-center gap-2 p-4 sm:gap-3">
            {LOOP_STEPS.map((step, index) => (
              <span key={step} className="flex items-center gap-2 sm:gap-3">
                <span className="dev-chip px-3 py-1.5 text-xs lowercase text-[var(--text-secondary)]">
                  {step}
                </span>
                {index < LOOP_STEPS.length - 1 && (
                  <ArrowRight
                    size={13}
                    className="text-[var(--text-secondary)] opacity-60"
                  />
                )}
              </span>
            ))}
          </div>
        </section>

        {/* ── Feature grid ── */}
        <section className="mt-16">
          <p className="type-eyebrow text-[var(--text-secondary)]">
            built for the way developers remember
          </p>
          <h2 className="type-page-title mt-3 text-2xl text-[var(--text-primary)] sm:text-3xl">
            Everything between “I fixed this once” and “found it, shipped it.”
          </h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-none border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group bg-[var(--bg)] p-5 transition-colors hover:bg-[var(--bg-secondary)]/60"
              >
                <feature.icon
                  size={17}
                  className="text-[var(--accent)]"
                  aria-hidden
                />
                <p className="mt-3 text-sm font-medium lowercase text-[var(--text-primary)]">
                  {feature.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {feature.body}
                </p>
                <span className="mt-4 inline-block dev-chip px-2 py-0.5 text-[0.68rem] text-[var(--text-secondary)] transition-colors group-hover:text-[var(--accent)]">
                  {feature.chip}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="mt-16">
          <div className="dev-panel flex flex-col items-center gap-5 p-10 text-center">
            <p className="type-eyebrow text-[var(--text-secondary)]">
              your future self is searching already
            </p>
            <h2 className="type-page-title max-w-xl text-2xl text-[var(--text-primary)] sm:text-3xl">
              Start the workspace your snippets deserve.
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/auth/signup"
                className="inline-flex h-11 items-center gap-2 rounded-none px-5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:opacity-90"
                style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}
              >
                create free account
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex h-11 items-center rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-5 text-sm text-[var(--text-secondary)] backdrop-blur transition-all hover:-translate-y-0.5 hover:text-[var(--accent)]"
              >
                i already have one
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-[var(--border)]">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-5 text-xs lowercase text-[var(--text-secondary)] sm:px-8">
          <span className="type-logo text-[0.62rem] text-[var(--text-secondary)]">
            devnotes
          </span>
          <span>editor-grade notes, private by default</span>
          <a
            href="https://github.com/rahuldr07/DevNotes"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-[var(--accent)]"
          >
            github ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
