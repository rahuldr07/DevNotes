"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_THEME_ID,
  FONT_STORAGE_KEY,
  type FontSetting,
  getTheme,
  isFontSetting,
  isRadiusSetting,
  isThemeId,
  RADIUS_STORAGE_KEY,
  type RadiusSetting,
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
  /** Typeface override — "auto" follows the colorway's curated pairing. */
  font: FontSetting;
  setFont: (font: FontSetting) => void;
  /** Corner override — "auto" follows the colorway's curated pairing. */
  radius: RadiusSetting;
  setRadius: (radius: RadiusSetting) => void;
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
  const [font, setFontState] = useState<FontSetting>("auto");
  const [radius, setRadiusState] = useState<RadiusSetting>("auto");
  const [isOnboarded, setIsOnboarded] = useState(true); // true prevents flash
  const [mounted, setMounted] = useState(false);

  /* On mount: read saved settings + onboarding status from localStorage.
     The inline init script in the root layout already applied them before
     first paint — this only syncs React state with it. */
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const savedFont = localStorage.getItem(FONT_STORAGE_KEY);
    const savedRadius = localStorage.getItem(RADIUS_STORAGE_KEY);
    const savedOnboarded = localStorage.getItem(ONBOARDED_KEY) === "true";

    if (isThemeId(savedTheme)) {
      setThemeState(savedTheme);
    }
    if (isFontSetting(savedFont)) {
      setFontState(savedFont);
    }
    if (isRadiusSetting(savedRadius)) {
      setRadiusState(savedRadius);
    }

    // If never onboarded, show the picker dialog
    setIsOnboarded(savedOnboarded);
    setMounted(true);
  }, []);

  /* Apply settings to <html> whenever they change. This is the ONLY place
     that mutates the document root — previews stay inside their dialogs. */
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    const meta = getTheme(theme);

    // data-theme triggers the generated CSS variable blocks
    root.setAttribute("data-theme", theme);
    // .dark class so shadcn components get their dark mode styles
    root.classList.toggle("dark", meta.isDark);

    // Explicit font/corner choices override the colorway; "auto" removes the
    // attribute so the theme block's own pairing applies.
    if (font === "auto") {
      root.removeAttribute("data-font");
    } else {
      root.setAttribute("data-font", font);
    }
    if (radius === "auto") {
      root.removeAttribute("data-radius");
    } else {
      root.setAttribute("data-radius", radius);
    }

    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(FONT_STORAGE_KEY, font);
    localStorage.setItem(RADIUS_STORAGE_KEY, radius);
  }, [theme, font, radius, mounted]);

  const setTheme = (id: ThemeId) => setThemeState(id);
  const setFont = (next: FontSetting) => setFontState(next);
  const setRadius = (next: RadiusSetting) => setRadiusState(next);

  const setOnboarded = () => {
    localStorage.setItem(ONBOARDED_KEY, "true");
    setIsOnboarded(true);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        font,
        setFont,
        radius,
        setRadius,
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
