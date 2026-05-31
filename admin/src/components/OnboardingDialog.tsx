"use client";

import { Check } from "lucide-react";
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

function ThemeChoice({
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
      className="flex items-center gap-3 px-1 py-3 text-left transition-colors hover:text-[var(--accent)]"
      style={{ color: isSelected ? "var(--accent)" : "var(--text-secondary)" }}
    >
      <span className="flex gap-1">
        {[bg, main, subAlt, text].map((color) => (
          <span
            key={`${meta.id}-${color}`}
            className="h-4 w-4 rounded-[2px]"
            style={{ backgroundColor: color }}
          />
        ))}
      </span>
      <span className="flex-1 text-sm">{meta.name}</span>
      {isSelected && <Check size={14} />}
    </button>
  );
}

export function OnboardingDialog() {
  const { theme, setTheme, themes, isOnboarded, setOnboarded } = useTheme();
  const [selected, setSelected] = useState(theme);

  if (isOnboarded) return null;

  const applyTheme = (id: ThemeId) => {
    const meta = themes.find((item) => item.id === id);
    if (!meta) return;
    document.documentElement.setAttribute("data-theme", id);
    document.documentElement.classList.toggle("dark", meta.isDark);
  };

  const handleSelect = (id: ThemeId) => {
    setSelected(id);
    setTheme(id);
    applyTheme(id);
  };

  const handleConfirm = () => {
    setTheme(selected);
    setOnboarded();
  };

  const handleSkip = () => {
    setTheme("serika-dark");
    setOnboarded();
  };

  return (
    <Dialog open={!isOnboarded}>
      <DialogContent
        className="max-w-xl"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <p className="text-sm lowercase" style={{ color: "var(--accent)" }}>
            devnotes
          </p>
          <DialogTitle>choose your theme</DialogTitle>
          <DialogDescription>
            Pick a writing surface. You can change it later.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 flex flex-col">
          {themes.map((meta) => (
            <ThemeChoice
              key={meta.id}
              meta={meta}
              isSelected={selected === meta.id}
              onSelect={handleSelect}
              onHover={applyTheme}
              onLeave={() => applyTheme(selected)}
            />
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm transition-colors hover:text-[var(--accent)]"
            style={{ color: "var(--text-secondary)" }}
          >
            use serika
          </button>
          <Button onClick={handleConfirm}>continue</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
