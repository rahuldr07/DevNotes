"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  type ThemeId,
  type ThemeMeta,
  useTheme,
} from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function ThemeCard({
  meta,
  isActive,
  onSelect,
  onHover,
  onLeave,
}: {
  meta: ThemeMeta;
  isActive: boolean;
  onSelect: (id: ThemeId) => void;
  onHover: (id: ThemeId) => void;
  onLeave: () => void;
}) {
  const [bg, main, subAlt, text] = meta.swatches;

  return (
    <button
      type="button"
      onClick={() => onSelect(meta.id)}
      onMouseEnter={() => onHover(meta.id)}
      onMouseLeave={onLeave}
      className="w-full text-left rounded-xl p-3 transition-all duration-150 group relative"
      style={{
        backgroundColor: isActive ? "var(--hover-color)" : "transparent",
        border: `1.5px solid ${isActive ? "var(--main-color)" : "var(--border-color)"}`,
      }}
    >
      {/* Mini app preview */}
      <div
        className="rounded-lg mb-3 h-14 flex flex-col gap-1.5 p-2 overflow-hidden"
        style={{ backgroundColor: bg }}
      >
        {/* Fake nav bar */}
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-sm"
            style={{ backgroundColor: main }}
          />
          <div
            className="h-1.5 rounded-full flex-1"
            style={{ backgroundColor: subAlt }}
          />
        </div>
        {/* Fake content lines */}
        <div
          className="h-1 rounded-full w-3/4"
          style={{ backgroundColor: text, opacity: 0.5 }}
        />
        <div
          className="h-1 rounded-full w-1/2"
          style={{ backgroundColor: text, opacity: 0.3 }}
        />
      </div>

      {/* Color swatches */}
      <div className="flex gap-1 mb-2">
        {[bg, main, subAlt, text].map((color, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: index is stable for static color list
            key={i}
            className="h-3 flex-1 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Theme name row */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--text-color)" }}
        >
          {meta.name}
        </span>
        <div className="flex items-center gap-1">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-mono"
            style={{ backgroundColor: bg, color: main }}
          >
            {meta.isDark ? "dark" : "light"}
          </span>
          {isActive && (
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--main-color)" }}
            >
              <Check size={10} color="var(--bg-color)" strokeWidth={3} />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export function ThemePickerPopover() {
  const { theme, setTheme, themes, currentThemeMeta } = useTheme();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<ThemeId | null>(null);

  const handleHover = (id: ThemeId) => {
    setHovered(id);
    // Live preview: apply data-theme temporarily
    document.documentElement.setAttribute("data-theme", id);
    const meta = themes.find((t) => t.id === id);
    if (!meta) return;
    if (meta.isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const handleLeave = () => {
    setHovered(null);
    // Restore actual theme
    document.documentElement.setAttribute("data-theme", theme);
    if (currentThemeMeta.isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    setHovered(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-8 gap-2 px-2.5 text-xs font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--sub-color)" }}
          aria-label="Switch theme"
        >
          {/* Colored dot — uses active theme's main-color */}
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-300"
            style={{ backgroundColor: currentThemeMeta.swatches[1] }}
          />
          <span>{currentThemeMeta.name}</span>
          <ChevronDown
            size={12}
            className="transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-4"
        style={{
          backgroundColor: "var(--sub-alt-color)",
          border: "1px solid var(--border-color)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
        }}
      >
        <p
          className="text-xs font-mono tracking-widest uppercase mb-4"
          style={{ color: "var(--sub-color)" }}
        >
          theme
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {themes.map((meta) => (
            <ThemeCard
              key={meta.id}
              meta={meta}
              isActive={!hovered ? theme === meta.id : hovered === meta.id}
              onSelect={handleSelect}
              onHover={handleHover}
              onLeave={handleLeave}
            />
          ))}
        </div>
        <div
          className="mt-4 pt-3"
          style={{ borderTop: "1px solid var(--border-color)" }}
        >
          <p className="text-[11px]" style={{ color: "var(--sub-color)" }}>
            Hover to preview · Click to save
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
