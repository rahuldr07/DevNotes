"use client";

import { Check, Palette, Search, Shuffle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FONT_STACKS,
  getTheme,
  type ThemeDefinition,
  type ThemeId,
} from "@/lib/themes";

export const OPEN_THEME_STUDIO_EVENT = "devnotes:open-theme-studio";

/** Open the studio from anywhere (status bar button, g+t chord, …). */
export function openThemeStudio() {
  window.dispatchEvent(new CustomEvent(OPEN_THEME_STUDIO_EVENT));
}

type ModeFilter = "all" | "dark" | "light";

/** Apply a theme to <html> directly — used for instant live preview. */
function previewTheme(id: ThemeId) {
  const meta = getTheme(id);
  document.documentElement.setAttribute("data-theme", id);
  document.documentElement.classList.toggle("dark", meta.isDark);
}

/* ─── Mini app mock rendered in the highlighted theme's own colors ───────── */

function ThemePreviewCard({ theme }: { theme: ThemeDefinition }) {
  const c = theme.colors;
  const { radius } = theme.style;
  const fontFamily = FONT_STACKS[theme.style.font];
  const ramp = [25, 50, 75].map(
    (percent) => `color-mix(in srgb, ${c.main} ${percent}%, ${c.bg})`,
  );
  const glow =
    theme.style.shadow === "glow"
      ? `0 0 30px -8px color-mix(in srgb, ${c.main} 50%, transparent)`
      : undefined;

  return (
    <div
      className="overflow-hidden border"
      style={{
        borderColor: c.border,
        backgroundColor: c.bg,
        color: c.text,
        borderRadius: radius,
        borderWidth: theme.style.panelBorder ?? 1,
        boxShadow: glow,
      }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-2"
        style={{ borderColor: c.border, backgroundColor: c.subAlt }}
      >
        <span className="flex gap-1.5">
          {[c.error, c.main, c.sub].map((dot, index) => (
            <span
              key={`${dot}-${index === 0 ? "e" : index === 1 ? "m" : "s"}`}
              className="h-2 w-2"
              style={{ backgroundColor: dot, borderRadius: radius * 0.4 }}
            />
          ))}
        </span>
        <span
          className="font-mono text-[9px] lowercase"
          style={{ color: c.sub }}
        >
          {theme.id}.theme
        </span>
      </div>

      <div className="grid grid-cols-[3.5rem_minmax(0,1fr)]">
        <div
          className="space-y-1.5 border-r p-2"
          style={{ borderColor: c.border }}
        >
          <div
            className="h-1.5 w-8"
            style={{ backgroundColor: c.main, borderRadius: radius * 0.4 }}
          />
          {["w-9", "w-6", "w-8"].map((width) => (
            <div
              key={width}
              className={`h-1.5 ${width}`}
              style={{
                backgroundColor: c.sub,
                opacity: 0.55,
                borderRadius: radius * 0.4,
              }}
            />
          ))}
        </div>

        <div className="space-y-2 p-3">
          <p
            className="text-sm leading-tight"
            style={{ color: c.text, fontFamily }}
          >
            knowledge, captured.
          </p>
          <p
            className="text-[10px] leading-snug"
            style={{ color: c.sub, fontFamily }}
          >
            every surface — type, corners, shadows — follows the colorway.
          </p>
          <div
            className="border p-2 font-mono text-[9px]"
            style={{
              borderColor: c.border,
              backgroundColor: c.subAlt,
              borderRadius: radius * 0.6,
            }}
          >
            <span style={{ color: c.main }}>const</span>{" "}
            <span style={{ color: c.text }}>colorway</span>{" "}
            <span style={{ color: c.sub }}>=</span>{" "}
            <span style={{ color: c.main }}>
              &quot;{theme.name.toLowerCase()}&quot;
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-1 font-mono text-[9px] lowercase"
              style={{
                backgroundColor: c.main,
                color: theme.accentForeground,
                borderRadius: radius * 0.6,
              }}
            >
              capture
            </span>
            <span
              className="border px-2 py-1 font-mono text-[9px] lowercase"
              style={{
                borderColor: c.border,
                color: c.sub,
                borderRadius: radius * 0.6,
              }}
            >
              preview
            </span>
            <span className="ml-auto flex gap-[3px]">
              {[...ramp, c.main].map((color) => (
                <span
                  key={color}
                  className="h-2.5 w-2.5"
                  style={{ backgroundColor: color, borderRadius: radius * 0.4 }}
                />
              ))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Studio dialog ──────────────────────────────────────────────────────── */

export function ThemeStudio() {
  const { theme, setTheme, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ModeFilter>("all");
  const [highlighted, setHighlighted] = useState<ThemeId>(theme);
  const applyingRef = useRef(false);
  const rowRefs = useRef(new Map<ThemeId, HTMLButtonElement>());

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return themes.filter((item) => {
      if (filter === "dark" && !item.isDark) return false;
      if (filter === "light" && item.isDark) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) || item.id.includes(needle)
      );
    });
  }, [themes, filter, query]);

  const darkCount = useMemo(
    () => themes.filter((item) => item.isDark).length,
    [themes],
  );

  const openStudio = useCallback(() => {
    applyingRef.current = false;
    setQuery("");
    setFilter("all");
    setHighlighted(theme);
    setOpen(true);
  }, [theme]);

  useEffect(() => {
    const onOpen = () => openStudio();
    window.addEventListener(OPEN_THEME_STUDIO_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_THEME_STUDIO_EVENT, onOpen);
  }, [openStudio]);

  // Keep the highlighted row visible while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    rowRefs.current.get(highlighted)?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  const highlight = (id: ThemeId) => {
    setHighlighted(id);
    previewTheme(id);
  };

  const apply = (id: ThemeId) => {
    applyingRef.current = true;
    previewTheme(id); // instant — provider effect confirms after re-render
    setTheme(id);
    setOpen(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !applyingRef.current) {
      previewTheme(theme); // closed without applying — revert the preview
    }
    setOpen(next);
  };

  const moveHighlight = (delta: number) => {
    if (filtered.length === 0) return;
    const index = filtered.findIndex((item) => item.id === highlighted);
    const next =
      filtered[(index + delta + filtered.length) % filtered.length] ??
      filtered[0];
    highlight(next.id);
  };

  const shuffle = () => {
    const pool = filtered.filter((item) => item.id !== highlighted);
    if (pool.length === 0) return;
    highlight(pool[Math.floor(Math.random() * pool.length)].id);
  };

  const onSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlight(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlight(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      apply(highlighted);
    }
  };

  const highlightedMeta = getTheme(highlighted);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="onboarding-dialog gap-0 overflow-hidden p-0 sm:max-w-4xl lg:max-w-5xl">
        <DialogHeader className="border-b border-[var(--border)] px-5 pb-4 pt-5">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            <Palette size={14} className="text-[var(--accent)]" />
            theme studio
            <span className="font-mono text-[10px] lowercase tracking-normal">
              {themes.length} colorways
            </span>
          </div>
          <DialogTitle className="text-left text-xl font-medium lowercase text-[var(--text-primary)]">
            pick your colorway
          </DialogTitle>
          <DialogDescription className="text-left text-sm text-[var(--text-secondary)]">
            More than colors — each colorway sets its own typeface, corner
            radius and shadows across every surface. Browse to preview live;
            Enter to keep, Esc to put it back.
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-[18rem_minmax(0,1fr)]">
          {/* left — search, filters, list */}
          <div className="flex min-h-0 flex-col border-b border-[var(--border)] sm:border-b-0 sm:border-r">
            <div className="border-b border-[var(--border)] p-3">
              <div className="flex items-center gap-2 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/60 px-2.5">
                <Search
                  size={13}
                  className="shrink-0 text-[var(--text-secondary)]"
                />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder="search themes…"
                  className="h-8 w-full bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                />
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {(
                  [
                    ["all", themes.length],
                    ["dark", darkCount],
                    ["light", themes.length - darkCount],
                  ] as const
                ).map(([mode, count]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilter(mode)}
                    className="rounded-none border px-2 py-0.5 font-mono text-[10px] lowercase transition-colors"
                    style={{
                      color:
                        filter === mode
                          ? "var(--accent)"
                          : "var(--text-secondary)",
                      borderColor:
                        filter === mode ? "var(--accent)" : "var(--border)",
                    }}
                  >
                    {mode} {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[19rem] flex-1 overflow-y-auto p-1.5 sm:max-h-[26rem]">
              {filtered.length === 0 && (
                <p className="px-2 py-4 font-mono text-[11px] text-[var(--text-secondary)]">
                  no themes match “{query}”
                </p>
              )}
              {filtered.map((item) => {
                const active = item.id === theme;
                const isHighlighted = item.id === highlighted;
                return (
                  <button
                    key={item.id}
                    ref={(node) => {
                      if (node) rowRefs.current.set(item.id, node);
                      else rowRefs.current.delete(item.id);
                    }}
                    type="button"
                    onClick={() => apply(item.id)}
                    onMouseEnter={() => highlight(item.id)}
                    onFocus={() => highlight(item.id)}
                    className="flex w-full items-center gap-2.5 rounded-none border px-2 py-1.5 text-left transition-colors"
                    style={{
                      borderColor: isHighlighted
                        ? "var(--accent)"
                        : "transparent",
                      backgroundColor: isHighlighted
                        ? "color-mix(in srgb, var(--accent) 8%, transparent)"
                        : "transparent",
                    }}
                  >
                    <span
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-none border"
                      style={{
                        backgroundColor: item.colors.bg,
                        borderColor: item.colors.border,
                      }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-none"
                        style={{ backgroundColor: item.colors.main }}
                      />
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate text-xs"
                      style={{
                        color: isHighlighted
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                      }}
                    >
                      {item.name.toLowerCase()}
                    </span>
                    <span className="font-mono text-[9px] text-[var(--text-secondary)]">
                      {item.isDark ? "dark" : "light"}
                    </span>
                    {active && (
                      <Check size={12} className="text-[var(--accent)]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* right — live mock + palette + actions */}
          <div className="hidden min-w-0 flex-col gap-3 p-4 sm:flex">
            <ThemePreviewCard theme={highlightedMeta} />

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["bg", highlightedMeta.colors.bg],
                  ["accent", highlightedMeta.colors.main],
                  ["surface", highlightedMeta.colors.subAlt],
                  ["text", highlightedMeta.colors.text],
                  ["error", highlightedMeta.colors.error],
                ] as const
              ).map(([label, color]) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 rounded-none border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] lowercase text-[var(--text-secondary)]"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-none border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                  {label} {color.startsWith("#") ? color : "auto"}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  [
                    "type",
                    highlightedMeta.style.font === "sans"
                      ? "gellix"
                      : highlightedMeta.style.font === "mono"
                        ? "jetbrains mono"
                        : "lora serif",
                  ],
                  ["radius", `${highlightedMeta.style.radius}px`],
                  ["shadow", highlightedMeta.style.shadow],
                  ["border", `${highlightedMeta.style.panelBorder ?? 1}px`],
                ] as const
              ).map(([label, value]) => (
                <span
                  key={label}
                  className="rounded-none border border-[var(--border)] px-1.5 py-0.5 font-mono text-[9px] lowercase text-[var(--text-secondary)]"
                >
                  {label} ·{" "}
                  <span className="text-[var(--accent)]">{value}</span>
                </span>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={shuffle}
                className="h-8 gap-2 rounded-none border border-[var(--border)] px-3 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]"
              >
                <Shuffle size={13} />
                shuffle
              </Button>
              <Button
                type="button"
                onClick={() => apply(highlighted)}
                className="h-8 gap-2 rounded-none bg-[var(--accent)] px-4 text-xs text-[var(--bg)] hover:bg-[var(--accent-hover)]"
              >
                <Check size={13} />
                keep {highlightedMeta.name.toLowerCase()}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-2.5 font-mono text-[10px] text-[var(--text-secondary)]">
          <span>↑↓ preview · enter keep · esc revert</span>
          <span className="hidden sm:inline">g then t opens this anywhere</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Compact trigger (status bars, auth screens, landing) ───────────────── */

export function ThemeStudioTrigger() {
  const { currentThemeMeta } = useTheme();

  return (
    <Button
      variant="ghost"
      onClick={openThemeStudio}
      className="h-8 gap-2 px-0 text-xs"
      style={{ color: "var(--text-secondary)" }}
      aria-label="open theme studio"
    >
      <span
        className="h-2.5 w-2.5 rounded-none"
        style={{ backgroundColor: currentThemeMeta.swatches[1] }}
      />
      <span className="hidden sm:inline">
        {currentThemeMeta.name.toLowerCase()}
      </span>
      <Palette size={12} />
    </Button>
  );
}
