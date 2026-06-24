"use client";

import {
  Bot,
  Code2,
  Compass,
  Files,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
  UserCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NoteSearchPalette } from "@/components/NoteSearchPalette";
import { useSound } from "@/components/SoundProvider";
import { ThemePickerPopover } from "@/components/ThemePickerPopover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ApiError, api } from "@/lib/api";
import { getRefreshToken, removeRefreshToken, removeToken } from "@/lib/auth";
import { getUserNotesPage } from "@/lib/note-api";
import { type AuthUser, useAuthStore } from "@/stores/useAuthStore";
import type { Note } from "@/types/notes";

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

const activityItems = [
  { label: "Explorer", icon: Files, active: true },
  { label: "Search", icon: Search, active: false },
  { label: "AI", icon: Bot, active: false },
  { label: "Runbook", icon: LayoutDashboard, active: false },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { soundEnabled, toggleSound } = useSound();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchNotes, setSearchNotes] = useState<Note[]>([]);
  const [searchHydrated, setSearchHydrated] = useState(false);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  useEffect(() => {
    const redirectToLogin = () => {
      clearUser();
      router.replace("/auth/login");
    };

    window.addEventListener("devnotes:auth-expired", redirectToLogin);

    api
      .get<AuthUser>("/auth/me")
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
      } else if (!inInput && event.key === "/") {
        event.preventDefault();
        openSearch();
      }
    };

    const onOpenSearch = () => openSearch();
    window.addEventListener("keydown", onGlobalShortcut);
    window.addEventListener("devnotes:open-search", onOpenSearch);
    return () => {
      window.removeEventListener("keydown", onGlobalShortcut);
      window.removeEventListener("devnotes:open-search", onOpenSearch);
    };
  }, [openSearch]);

  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken();
      await api.post(
        "/auth/logout",
        refreshToken ? { refresh_token: refreshToken } : undefined,
      );
    } catch {
      // Clear local auth even if logout fails or the backend is offline.
    }
    removeToken();
    removeRefreshToken();
    clearUser();
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-[-12rem] top-[-10rem] h-80 w-80 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-8rem] h-96 w-96 rounded-full bg-[var(--main-color)]/10 blur-3xl" />
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

      <div className="relative grid min-h-screen lg:grid-cols-[3.5rem_17rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-[var(--border)] bg-[var(--bg-secondary)]/75 py-3 backdrop-blur-xl lg:flex lg:flex-col lg:items-center">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--bg)] shadow-lg shadow-black/10">
            <LayoutDashboard size={17} />
          </div>
          <nav className="flex flex-1 flex-col items-center gap-2">
            {activityItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.label === "Search" ? openSearch : undefined}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    item.active
                      ? "bg-[var(--bg)] text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg)]/70 hover:text-[var(--text-primary)]"
                  }`}
                  title={item.label}
                  aria-label={item.label}
                >
                  {item.active && (
                    <span className="absolute -left-2 h-5 w-1 rounded-r-full bg-[var(--accent)]" />
                  )}
                  <Icon size={18} />
                </button>
              );
            })}
          </nav>
        </aside>

        <aside className="hidden border-r border-[var(--border)] bg-[var(--bg)]/80 p-4 backdrop-blur-xl lg:flex lg:flex-col">
          <Link
            href="/dashboard"
            className="group mb-8 flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--accent)] shadow-lg shadow-black/10 transition-transform group-hover:scale-105">
              <LayoutDashboard size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.22em] text-[var(--text-primary)] uppercase">
                DevNotes
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                knowledge cockpit
              </p>
            </div>
          </Link>

          <div className="mb-3 flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            <span>Explorer</span>
            <span className="text-[var(--accent)]">main</span>
          </div>

          <nav className="space-y-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/35 p-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.matcher(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all ${
                    active
                      ? "bg-[var(--bg-secondary)] text-[var(--accent)] shadow-sm"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
              <Sparkles size={14} />
              next up
            </div>
            <p className="text-sm leading-6 text-[var(--text-primary)]">
              AI semantic search, snippets, and beautiful public publishing are
              staged after this Cockpit foundation.
            </p>
          </div>

          <div className="mt-auto space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg)] text-[var(--accent)]">
                <UserCircle size={18} />
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
              <ThemePickerPopover />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSound}
                    className="h-9 w-9"
                    style={{
                      color: soundEnabled
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                    }}
                    aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
                  >
                    {soundEnabled ? (
                      <Volume2 size={16} />
                    ) : (
                      <VolumeX size={16} />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{soundEnabled ? "Mute sounds" : "Enable sounds"}</p>
                </TooltipContent>
              </Tooltip>
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

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/82 px-4 py-2.5 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 lg:hidden"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--accent)]">
                  <LayoutDashboard size={16} />
                </span>
                <span className="text-sm font-semibold tracking-[0.18em] uppercase">
                  DevNotes
                </span>
              </Link>

              <button
                type="button"
                onClick={openSearch}
                className="hidden min-w-0 flex-1 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)]/70 px-4 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)] sm:flex lg:max-w-xl"
              >
                <Search size={15} />
                <span className="min-w-0 flex-1 truncate">
                  Search notes, snippets, tags, or deep search...
                </span>
                <kbd className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                  ⌘K
                </kbd>
                <kbd className="rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">
                  /
                </kbd>
              </button>

              <div className="flex items-center gap-2">
                <Link href="/dashboard/create_note">
                  <Button className="gap-2 rounded-2xl bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)]">
                    <Plus size={15} />
                    <span className="hidden sm:inline">New note</span>
                  </Button>
                </Link>
                <div className="lg:hidden">
                  <ThemePickerPopover />
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

            <nav className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.matcher(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors ${
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

          <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>

          <div className="hidden h-7 items-center justify-between border-t border-[var(--border)] bg-[var(--bg-secondary)]/70 px-3 text-[11px] text-[var(--text-secondary)] lg:flex">
            <span className="text-[var(--accent)]">● master</span>
            <span>DevNotes Workbench · TypeScript · FastAPI · PostgreSQL</span>
            <span>UTF-8 · LF</span>
          </div>
        </div>
      </div>
      <NoteSearchPalette
        open={searchOpen}
        notes={searchNotes}
        indexLoading={searchOpen && !searchHydrated}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  );
}
