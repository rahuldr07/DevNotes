"use client";

import {
  Compass,
  FileText,
  Library,
  LogOut,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSound } from "@/components/SoundProvider";
import { ThemePickerPopover } from "@/components/ThemePickerPopover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-color)", color: "var(--text-color)" }}
    >
      {/* Sticky top navbar */}
      <header
        className="sticky top-0 z-40"
        style={{
          backgroundColor: "var(--sub-alt-color)",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity group-hover:opacity-80"
              style={{ backgroundColor: "var(--main-color)" }}
            >
              <FileText size={14} color="var(--bg-color)" strokeWidth={2.5} />
            </div>
            <span
              className="text-base font-bold tracking-tight"
              style={{ color: "var(--text-color)" }}
            >
              DevNotes
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6 ml-8 mr-auto">
            <Link
              href="/dashboard"
              className="text-sm font-medium transition-colors flex items-center gap-2"
              style={{
                color:
                  pathname === "/dashboard"
                    ? "var(--main-color)"
                    : "var(--sub-color)",
              }}
            >
              <Library size={16} />
              My Notes
            </Link>
            <Link
              href="/dashboard/explore"
              className="text-sm font-medium transition-colors flex items-center gap-2"
              style={{
                color: pathname.startsWith("/dashboard/explore")
                  ? "var(--main-color)"
                  : "var(--sub-color)",
              }}
            >
              <Compass size={16} />
              Explore
            </Link>
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-1">
            <ThemePickerPopover />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSound}
                  className="h-8 w-8 transition-opacity hover:opacity-70"
                  style={{
                    color: soundEnabled
                      ? "var(--main-color)"
                      : "var(--sub-color)",
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
            <Separator
              orientation="vertical"
              className="h-5 mx-1"
              style={{ backgroundColor: "var(--border-color)" }}
            />
            {user?.name && (
              <span
                className="hidden max-w-36 truncate px-2 text-xs md:inline"
                style={{ color: "var(--text-secondary)" }}
                title={user.name}
              >
                {user.name}
              </span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-8 w-8 transition-opacity hover:opacity-70"
                  style={{ color: "var(--sub-color)" }}
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
      </header>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
