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

function ThemeOption({
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
      className="flex w-full items-center gap-3 px-1 py-2 text-left transition-colors hover:text-[var(--accent)]"
      style={{
        color: isActive ? "var(--accent)" : "var(--text-secondary)",
      }}
    >
      <span className="flex min-w-14 gap-1">
        {[bg, main, subAlt, text].map((color) => (
          <span
            key={`${meta.id}-${color}`}
            className="h-3 w-3 rounded-[2px]"
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
      <span className="flex-1 truncate text-xs">{meta.name}</span>
      {isActive && <Check size={14} />}
    </button>
  );
}

export function ThemePickerPopover() {
  const { theme, setTheme, themes, currentThemeMeta } = useTheme();
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<ThemeId | null>(null);

  const applyPreview = (id: ThemeId) => {
    const meta = themes.find((item) => item.id === id);
    if (!meta) return;
    document.documentElement.setAttribute("data-theme", id);
    document.documentElement.classList.toggle("dark", meta.isDark);
  };

  const handleHover = (id: ThemeId) => {
    setHovered(id);
    applyPreview(id);
  };

  const handleLeave = () => {
    setHovered(null);
    applyPreview(theme);
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
          className="h-8 gap-2 px-0 text-xs"
          style={{ color: "var(--text-secondary)" }}
          aria-label="switch theme"
        >
          <span
            className="h-2.5 w-2.5 rounded-[2px]"
            style={{ backgroundColor: currentThemeMeta.swatches[1] }}
          />
          <span className="hidden sm:inline">{currentThemeMeta.name}</span>
          <ChevronDown
            size={12}
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <p
          className="mb-2 px-1 text-xs lowercase"
          style={{ color: "var(--text-secondary)", letterSpacing: "0.02em" }}
        >
          theme
        </p>
        <div className="flex flex-col">
          {themes.map((meta) => (
            <ThemeOption
              key={meta.id}
              meta={meta}
              isActive={!hovered ? theme === meta.id : hovered === meta.id}
              onSelect={handleSelect}
              onHover={handleHover}
              onLeave={handleLeave}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
