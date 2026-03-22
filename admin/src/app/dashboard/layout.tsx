"use client";

import { FileText, LogOut, Volume2, VolumeX, Compass, Library } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSound } from "@/components/SoundProvider";
import { ThemePickerPopover } from "@/components/ThemePickerPopover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { removeToken } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { soundEnabled, toggleSound } = useSound();

  const handleLogout = () => {
    removeToken();
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
                 color: pathname === "/dashboard" ? "var(--main-color)" : "var(--sub-color)" 
               }}
             >
               <Library size={16} />
               My Notes
             </Link>
             <Link 
               href="/dashboard/explore" 
               className="text-sm font-medium transition-colors flex items-center gap-2" 
               style={{ 
                 color: pathname.startsWith("/dashboard/explore") ? "var(--main-color)" : "var(--sub-color)" 
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
