"use client";

import { LogOut, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSound } from "@/components/SoundProvider";
import { ThemePickerPopover } from "@/components/ThemePickerPopover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { getRefreshToken, removeRefreshToken, removeToken } from "@/lib/auth";
import { type AuthUser, useAuthStore } from "@/stores/useAuthStore";

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

  useEffect(() => {
    if (user) return;
    api
      .get<AuthUser>("/auth/me")
      .then(setUser)
      .catch(() => {
        // The frontend contract is ready even if the current backend lacks /auth/me.
      });
  }, [setUser, user]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout", { refresh_token: getRefreshToken() });
    } catch {
      // Clear local auth even if the assumed logout endpoint is unavailable.
    }
    removeToken();
    removeRefreshToken();
    clearUser();
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-primary)]">
      <header
        className="sticky top-0 z-40 bg-[var(--bg)]"
        style={{
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="relative mx-auto flex h-14 max-w-[1000px] items-center justify-between px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
          >
            devnotes
          </Link>

          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-3 text-sm sm:flex">
            <Link
              href="/dashboard"
              className="transition-colors"
              style={{
                color:
                  pathname === "/dashboard"
                    ? "var(--accent)"
                    : "var(--text-secondary)",
              }}
            >
              my notes
            </Link>
            <span className="text-[var(--text-secondary)]">·</span>
            <Link
              href="/dashboard/explore"
              className="transition-colors"
              style={{
                color: pathname.startsWith("/dashboard/explore")
                  ? "var(--accent)"
                  : "var(--text-secondary)",
              }}
            >
              explore
            </Link>
          </nav>

          <div className="flex items-center gap-1">
            {user?.name && (
              <span
                className="hidden max-w-32 truncate px-2 text-xs md:inline"
                style={{ color: "var(--text-secondary)" }}
                title={user.name}
              >
                {user.name}
              </span>
            )}
            <div className="hidden sm:block">
              <ThemePickerPopover />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSound}
                  className="h-8 w-8"
                  style={{
                    color: soundEnabled
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                  }}
                  aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
                >
                  {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{soundEnabled ? "Mute sounds" : "Enable sounds"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-8 w-8"
                  style={{ color: "var(--text-secondary)" }}
                  aria-label="Logout"
                >
                  <LogOut size={15} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Sign out</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <nav
          className="flex h-10 items-center justify-center gap-3 text-sm sm:hidden"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <Link
            href="/dashboard"
            className="transition-colors"
            style={{
              color:
                pathname === "/dashboard"
                  ? "var(--accent)"
                  : "var(--text-secondary)",
            }}
          >
            my notes
          </Link>
          <span className="text-[var(--text-secondary)]">·</span>
          <Link
            href="/dashboard/explore"
            className="transition-colors"
            style={{
              color: pathname.startsWith("/dashboard/explore")
                ? "var(--accent)"
                : "var(--text-secondary)",
            }}
          >
            explore
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
