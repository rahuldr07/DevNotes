"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_THEME_ID,
  getTheme,
  isThemeId,
  THEME_STORAGE_KEY,
  THEMES,
  type ThemeDefinition,
  type ThemeId,
} from "@/lib/themes";

// Re-exported so existing consumers keep a single import site.
export type { ThemeId, ThemeMeta } from "@/lib/themes";
export { THEMES } from "@/lib/themes";

/* ─── Context shape ──────────────────────────────────────────────────────── */

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  themes: ThemeDefinition[];
  currentThemeMeta: ThemeDefinition;
  /** Whether user has completed the first-launch theme onboarding */
  isOnboarded: boolean;
  setOnboarded: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ONBOARDED_KEY = "devnotes-onboarded";

/* ─── Provider ───────────────────────────────────────────────────────────── */

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [isOnboarded, setIsOnboarded] = useState(true); // true prevents flash
  const [mounted, setMounted] = useState(false);

  /* On mount: read saved theme + onboarding status from localStorage.
     The inline init script in the root layout already applied the saved
     theme before first paint — this only syncs React state with it. */
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const savedOnboarded = localStorage.getItem(ONBOARDED_KEY) === "true";

    if (isThemeId(savedTheme)) {
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
    const meta = getTheme(theme);

    // Set data-theme attribute — triggers the generated CSS variable blocks
    root.setAttribute("data-theme", theme);

    // Also toggle .dark class so shadcn components get their dark mode styles
    root.classList.toggle("dark", meta.isDark);

    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, mounted]);

  const setTheme = (id: ThemeId) => setThemeState(id);

  const setOnboarded = () => {
    localStorage.setItem(ONBOARDED_KEY, "true");
    setIsOnboarded(true);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes: THEMES,
        currentThemeMeta: getTheme(theme),
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
