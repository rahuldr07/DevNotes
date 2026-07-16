"use client";

import {
  Code2,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NoteSearchPalette } from "@/components/NoteSearchPalette";
import { ShortcutsDialog } from "@/components/ShortcutsDialog";
import { openThemeStudio, ThemeStudioTrigger } from "@/components/ThemeStudio";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError, api } from "@/lib/api";
import { getMe } from "@/lib/auth-api";
import { getUserNotesPage } from "@/lib/note-api";
import { useAuthStore } from "@/stores/useAuthStore";
import type { Note } from "@/types/notes";

// g-chord targets: press g, then one of these keys, to jump anywhere.
const CHORD_ROUTES: Record<string, string> = {
  d: "/dashboard",
  s: "/dashboard/snippets",
  e: "/dashboard/explore",
  a: "/dashboard/ask",
  n: "/dashboard/create_note",
  p: "/dashboard/settings",
};

const CHORD_TIMEOUT_MS = 1400;

const navItems = [
  {
    href: "/dashboard",
    label: "Notes",
    icon: FileText,
    matcher: (pathname: string) => pathname === "/dashboard",
  },
  {
    href: "/dashboard/snippets",
    label: "Snippets",
    icon: Code2,
    matcher: (pathname: string) => pathname.startsWith("/dashboard/snippets"),
  },
  {
    href: "/dashboard/explore",
    label: "Explore",
    icon: Compass,
    matcher: (pathname: string) => pathname.startsWith("/dashboard/explore"),
  },
  {
    href: "/dashboard/ask",
    label: "Ask",
    icon: Sparkles,
    matcher: (pathname: string) => pathname.startsWith("/dashboard/ask"),
  },
  {
    href: "/dashboard/create_note",
    label: "New note",
    icon: Plus,
    matcher: (pathname: string) =>
      pathname.startsWith("/dashboard/create_note"),
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    matcher: (pathname: string) => pathname.startsWith("/dashboard/settings"),
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchNotes, setSearchNotes] = useState<Note[]>([]);
  const [searchHydrated, setSearchHydrated] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isMacPlatform, setIsMacPlatform] = useState(false);
  const [chordPending, setChordPending] = useState(false);
  const chordTimerRef = useRef<number | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  // Resolved after mount so SSR and first client render agree.
  useEffect(() => {
    setIsMacPlatform(/Mac|iPhone|iPad|iPod/i.test(navigator.platform));
  }, []);

  useEffect(() => {
    const route = pathname;
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    return () => {
      void route;
    };
  }, [pathname]);

  useEffect(() => {
    const redirectToLogin = () => {
      clearUser();
      router.replace("/auth/login");
    };

    window.addEventListener("devnotes:auth-expired", redirectToLogin);

    getMe()
      .then(setUser)
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          clearUser();
          router.replace("/auth/login");
        }
      });

    return () => {
      window.removeEventListener("devnotes:auth-expired", redirectToLogin);
    };
  }, [clearUser, router, setUser]);

  useEffect(() => {
    if (!searchOpen || searchHydrated) return;

    let cancelled = false;
    getUserNotesPage({ limit: 80 })
      .then((page) => {
        if (!cancelled) {
          setSearchNotes(page.items);
          setSearchHydrated(true);
        }
      })
      .catch(() => {
        if (!cancelled) setSearchHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [searchHydrated, searchOpen]);

  const clearChord = useCallback(() => {
    if (chordTimerRef.current !== null) {
      window.clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }
    setChordPending(false);
  }, []);

  useEffect(() => {
    const onGlobalShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      const inInput =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
        return;
      }
      if (
        inInput ||
        shortcutsOpen ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      // Second key of a pending g-chord wins over single-key shortcuts.
      if (chordPending) {
        clearChord();
        if (event.key.toLowerCase() === "t") {
          event.preventDefault();
          openThemeStudio();
          return;
        }
        const route = CHORD_ROUTES[event.key.toLowerCase()];
        if (route) {
          event.preventDefault();
          router.push(route);
        }
        return;
      }

      switch (event.key) {
        case "/":
          event.preventDefault();
          openSearch();
          break;
        case "n":
          event.preventDefault();
          router.push("/dashboard/create_note");
          break;
        case "?":
          event.preventDefault();
          setShortcutsOpen(true);
          break;
        case "g":
          setChordPending(true);
          chordTimerRef.current = window.setTimeout(() => {
            chordTimerRef.current = null;
            setChordPending(false);
          }, CHORD_TIMEOUT_MS);
          break;
      }
    };

    const onOpenSearch = () => openSearch();
    window.addEventListener("keydown", onGlobalShortcut);
    window.addEventListener("devnotes:open-search", onOpenSearch);
    return () => {
      window.removeEventListener("keydown", onGlobalShortcut);
      window.removeEventListener("devnotes:open-search", onOpenSearch);
    };
  }, [chordPending, clearChord, openSearch, router, shortcutsOpen]);

  const handleLogout = async () => {
    try {
      // The refresh cookie rides along; the proxy clears both auth cookies
      // from the logout response.
      await api.post("/auth/logout", undefined);
    } catch {
      // Continue to the login page even if logout fails or the backend is offline.
    }
    clearUser();
    router.push("/auth/login");
  };

  return (
    <div className="h-screen overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-[-12rem] top-[-10rem] h-80 w-80 rounded-none bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-8rem] h-96 w-96 rounded-none bg-[var(--main-color)]/10 blur-3xl" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(circle at top, black, transparent 68%)",
            opacity: 0.18,
          }}
        />
      </div>

      <div className="relative grid h-screen min-h-0 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="hidden h-screen min-h-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg)]/84 p-3 backdrop-blur-xl lg:flex lg:flex-col">
          <Link
            href="/dashboard"
            className="group mb-4 flex items-center gap-3 border border-[var(--border)] bg-[var(--bg-secondary)]/42 p-2"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-none border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--accent)] shadow-sm shadow-black/10 transition-transform group-hover:scale-105">
              <LayoutDashboard size={18} />
            </div>
            <div>
              <p className="type-logo text-sm text-[var(--text-primary)]">
                DevNotes
              </p>
              <p className="font-mono text-[10px] text-[var(--text-secondary)]">
                repo://knowledge
              </p>
            </div>
          </Link>

          <div className="mb-2 flex items-center justify-between px-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            <span>src/workspace</span>
            <span className="text-[var(--accent)]">main</span>
          </div>

          <nav className="border border-[var(--border)] bg-[var(--bg-secondary)]/28 p-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.matcher(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 border-l-2 px-3 py-2 text-sm transition-colors ${
                    active
                      ? "border-[var(--accent)] bg-[var(--bg-secondary)] text-[var(--accent)]"
                      : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon size={15} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {active && (
                    <span className="font-mono text-[10px]">open</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="relative mt-4 overflow-hidden border border-[var(--border)] bg-[var(--bg-secondary)]/42 p-3">
            <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-2 text-[var(--accent)]">
                <Sparkles size={13} /> Runtime
              </span>
              <span>online</span>
            </div>
            <div className="space-y-1.5">
              {[
                ["capture", "ready"],
                ["search", "warm"],
                ["publish", "armed"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-l border-[var(--border)] pl-2 text-[11px]"
                >
                  <span className="font-mono text-[var(--text-secondary)]">
                    {label}
                  </span>
                  <span className="font-mono text-[var(--accent)]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-2 border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-none bg-[var(--bg)] text-[var(--accent)]">
                <UserCircle size={16} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {user?.name ?? "Developer"}
                </p>
                <p className="truncate text-xs text-[var(--text-secondary)]">
                  {user?.email ?? "private workspace"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeStudioTrigger />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-9 w-9 text-[var(--text-secondary)]"
                    aria-label="Logout"
                  >
                    <LogOut size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Sign out</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col">
          <header className="z-40 shrink-0 border-b border-[var(--border)] bg-[var(--bg)]/90 px-4 py-2 backdrop-blur-xl sm:px-6 lg:px-7">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 lg:hidden"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-none border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--accent)]">
                  <LayoutDashboard size={16} />
                </span>
                <span className="text-sm font-semibold tracking-[0.18em] uppercase">
                  DevNotes
                </span>
              </Link>

              <div className="hidden items-center gap-2 font-mono text-[11px] text-[var(--text-secondary)] lg:flex">
                <span className="text-[var(--accent)]">devnotes</span>
                <span>/</span>
                <span>
                  {navItems.find((item) => item.matcher(pathname))?.label ??
                    "workspace"}
                </span>
              </div>

              <button
                type="button"
                onClick={openSearch}
                className="hidden min-w-0 flex-1 items-center gap-3 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/62 px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)] sm:flex lg:max-w-xl"
              >
                <Search size={15} />
                <span className="min-w-0 flex-1 truncate">
                  Search notes, snippets, tags
                </span>
                <Kbd>{isMacPlatform ? "⌘K" : "ctrl K"}</Kbd>
                <Kbd>/</Kbd>
              </button>

              <div className="flex items-center gap-2">
                <Link href="/dashboard/create_note">
                  <Button className="gap-2 rounded-none bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)]">
                    <Plus size={15} />
                    <span className="hidden sm:inline">New note</span>
                  </Button>
                </Link>
                <div className="lg:hidden">
                  <ThemeStudioTrigger />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-9 w-9 text-[var(--text-secondary)] lg:hidden"
                  aria-label="Logout"
                >
                  <LogOut size={16} />
                </Button>
              </div>
            </div>

            <nav className="scrollbar-none mt-3 flex gap-2 overflow-x-auto lg:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.matcher(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex shrink-0 items-center gap-2 rounded-none px-3 py-1.5 text-xs transition-colors ${
                      active
                        ? "bg-[var(--bg-secondary)] text-[var(--accent)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                    }`}
                  >
                    <Icon size={13} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          {/* Top padding lives on the inner wrapper, not the scroll container:
              sticky children pin to the scrollport's content edge, so padding
              here would leave a see-through gap above stuck toolbars. */}
          <main
            ref={mainRef}
            className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6 lg:px-7 lg:pb-5"
          >
            <div className="mx-auto max-w-[1180px] pt-4 lg:pt-5">
              {children}
            </div>
          </main>

          <div className="hidden h-7 shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--bg-secondary)]/70 px-3 text-[11px] text-[var(--text-secondary)] lg:flex">
            <span className="text-[var(--accent)]">● synced</span>
            <span>DevNotes Workbench · Next.js · FastAPI · PostgreSQL</span>
            <span className="flex items-center gap-3">
              {chordPending && (
                <span className="font-mono text-[var(--accent)]">
                  g · waiting for key…
                </span>
              )}
              <button
                type="button"
                onClick={() => setShortcutsOpen(true)}
                className="font-mono transition-colors hover:text-[var(--accent)]"
              >
                ? shortcuts
              </button>
              <span>UTF-8 · LF · main</span>
            </span>
          </div>
        </div>
      </div>
      <NoteSearchPalette
        open={searchOpen}
        notes={searchNotes}
        indexLoading={searchOpen && !searchHydrated}
        onClose={() => setSearchOpen(false)}
      />
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
}
