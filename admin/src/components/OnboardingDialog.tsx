"use client";

import { ArrowRight, Check, FileText } from "lucide-react";
import { useState } from "react";
import {
  type ThemeId,
  type ThemeMeta,
  useTheme,
} from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function OnboardingThemeCard({
  meta,
  isSelected,
  onSelect,
  onHover,
  onLeave,
}: {
  meta: ThemeMeta;
  isSelected: boolean;
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
      className="relative rounded-xl p-4 transition-all duration-150 text-left w-full"
      style={{
        backgroundColor: isSelected
          ? "var(--hover-color)"
          : "var(--sub-alt-color)",
        border: `2px solid ${isSelected ? "var(--main-color)" : "var(--border-color)"}`,
      }}
    >
      {/* Mini preview */}
      <div
        className="rounded-lg mb-3 h-16 flex flex-col justify-between p-2.5"
        style={{ backgroundColor: bg }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: main }}
          />
          <div
            className="h-1.5 rounded-full w-10"
            style={{ backgroundColor: subAlt }}
          />
        </div>
        <div className="space-y-1">
          <div
            className="h-1 rounded-full w-full"
            style={{ backgroundColor: text, opacity: 0.6 }}
          />
          <div
            className="h-1 rounded-full w-3/4"
            style={{ backgroundColor: text, opacity: 0.4 }}
          />
        </div>
      </div>

      {/* Swatches */}
      <div className="flex gap-1 mb-2.5">
        {[bg, main, subAlt, text].map((color, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: index is stable for static color list
            key={`${color}-${i}`}
            className="h-3 flex-1 rounded-sm"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Name + badge */}
      <div className="flex items-center justify-between gap-1">
        <span
          className="text-xs font-semibold truncate"
          style={{ color: "var(--text-color)" }}
        >
          {meta.name}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-mono"
            style={{ backgroundColor: bg, color: main }}
          >
            {meta.isDark ? "dark" : "light"}
          </span>
          {isSelected && (
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "var(--main-color)" }}
            >
              <Check size={9} color="var(--bg-color)" strokeWidth={3} />
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export function OnboardingDialog() {
  const { theme, setTheme, themes, isOnboarded, setOnboarded } = useTheme();
  const [selected, setSelected] = useState(theme);

  if (isOnboarded) return null;

  const handleHover = (id: ThemeId) => {
    document.documentElement.setAttribute("data-theme", id);
    const meta = themes.find((t) => t.id === id);
    if (!meta) return;
    if (meta.isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const handleLeave = () => {
    document.documentElement.setAttribute("data-theme", selected);
    const meta = themes.find((t) => t.id === selected);
    if (!meta) return;
    if (meta.isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  const handleSelect = (id: ThemeId) => {
    setSelected(id);
    setTheme(id);
  };

  const handleConfirm = () => {
    setTheme(selected);
    setOnboarded();
  };

  const handleSkip = () => {
    setTheme("catppuccin-mocha");
    setOnboarded();
  };

  return (
    <Dialog open={!isOnboarded}>
      <DialogContent
        className="max-w-2xl"
        style={{
          backgroundColor: "var(--sub-alt-color)",
          border: "1px solid var(--border-color)",
          color: "var(--text-color)",
        }}
        // Prevent closing via Escape/backdrop click
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2.5 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "var(--main-color)" }}
            >
              <FileText size={15} color="var(--bg-color)" strokeWidth={2.5} />
            </div>
            <span
              className="text-lg font-bold"
              style={{ color: "var(--text-color)" }}
            >
              DevNotes
            </span>
          </div>
          <DialogTitle
            className="text-2xl font-bold"
            style={{ color: "var(--text-color)" }}
          >
            Choose your theme
          </DialogTitle>
          <DialogDescription style={{ color: "var(--sub-color)" }}>
            Pick a look that feels right. You can always change it later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 my-2">
          {themes.map((meta) => (
            <OnboardingThemeCard
              key={meta.id}
              meta={meta}
              isSelected={selected === meta.id}
              onSelect={handleSelect}
              onHover={handleHover}
              onLeave={handleLeave}
            />
          ))}
        </div>

        <div
          className="flex items-center justify-between pt-4 mt-1"
          style={{ borderTop: "1px solid var(--border-color)" }}
        >
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--sub-color)" }}
          >
            Skip → use default
          </button>

          <Button
            onClick={handleConfirm}
            className="gap-2 font-semibold transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "var(--main-color)",
              color: "var(--bg-color)",
              border: "none",
            }}
          >
            Get started
            <ArrowRight size={15} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
