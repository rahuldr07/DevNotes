"use client";

import { createContext, useContext, useEffect, useState } from "react";

/* ─── Theme definitions ──────────────────────────────────────────────────── */

export type ThemeId =
  | "catppuccin-mocha"
  | "catppuccin-latte"
  | "serika-dark"
  | "nord"
  | "paper"
  | "midnight";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  isDark: boolean;
  /** 4 preview swatch colors: [bg, main, sub-alt, text] */
  swatches: [string, string, string, string];
}

export const THEMES: ThemeMeta[] = [
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    isDark: true,
    swatches: ["#1e1e2e", "#cba6f7", "#313244", "#cdd6f4"],
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    isDark: false,
    swatches: ["#eff1f5", "#8839ef", "#dce0e8", "#4c4f69"],
  },
  {
    id: "serika-dark",
    name: "Serika Dark",
    isDark: true,
    swatches: ["#323437", "#e2b714", "#2c2e31", "#d1d0c5"],
  },
  {
    id: "nord",
    name: "Nord",
    isDark: true,
    swatches: ["#2e3440", "#88c0d0", "#3b4252", "#eceff4"],
  },
  {
    id: "paper",
    name: "Paper",
    isDark: false,
    swatches: ["#f5f0e8", "#b5451b", "#e8e0d0", "#3d2b1f"],
  },
  {
    id: "midnight",
    name: "Midnight",
    isDark: true,
    swatches: ["#09090b", "#6366f1", "#111113", "#fafafa"],
  },
];

/* ─── Context shape ──────────────────────────────────────────────────────── */

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  themes: ThemeMeta[];
  currentThemeMeta: ThemeMeta;
  /** Whether user has completed the first-launch theme onboarding */
  isOnboarded: boolean;
  setOnboarded: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "devnotes-theme";
const ONBOARDED_KEY = "devnotes-onboarded";
const DEFAULT_THEME: ThemeId = "catppuccin-mocha";

/* ─── Provider ───────────────────────────────────────────────────────────── */

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [isOnboarded, setIsOnboarded] = useState(true); // true prevents flash
  const [mounted, setMounted] = useState(false);

  /* On mount: read saved theme + onboarding status from localStorage */
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    const savedOnboarded = localStorage.getItem(ONBOARDED_KEY) === "true";

    if (savedTheme && THEMES.some((t) => t.id === savedTheme)) {
      setThemeState(savedTheme);
    }

    // If never onboarded, show the picker dialog
    setIsOnboarded(savedOnboarded);
    setMounted(true);
  }, []);

  /* Apply theme to <html> whenever it changes */
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const meta = THEMES.find((t) => t.id === theme);
    if (!meta) return;

    // Set data-theme attribute — triggers CSS variable theme blocks in globals.css
    root.setAttribute("data-theme", theme);

    // Also toggle .dark class so shadcn components get their dark mode styles
    if (meta.isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  const setTheme = (id: ThemeId) => setThemeState(id);

  const setOnboarded = () => {
    localStorage.setItem(ONBOARDED_KEY, "true");
    setIsOnboarded(true);
  };

  const currentThemeMeta = THEMES.find((t) => t.id === theme);
  if (!currentThemeMeta) return null;

  // Prevent flash of wrong theme — render nothing until localStorage is read
  if (!mounted) return null;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes: THEMES,
        currentThemeMeta,
        isOnboarded,
        setOnboarded,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────────────────────── */

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
