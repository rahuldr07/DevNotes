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
      className="group relative overflow-hidden rounded-2xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ color: isSelected ? "var(--accent)" : "var(--text-secondary)" }}
    >
      <span
        className="absolute inset-x-0 top-0 h-1 opacity-90"
        style={{
          background: `linear-gradient(90deg, ${bg}, ${main}, ${subAlt}, ${text})`,
        }}
      />
      <span className="flex items-center gap-3">
        <span
          className="relative flex h-11 w-16 shrink-0 overflow-hidden rounded-xl border"
          style={{ borderColor: main, backgroundColor: bg }}
        >
          <span
            className="absolute left-2 top-2 h-2 w-7 rounded-full"
            style={{ backgroundColor: main }}
          />
          <span
            className="absolute bottom-2 left-2 h-2 w-10 rounded-full"
            style={{ backgroundColor: text }}
          />
          <span
            className="absolute bottom-2 right-2 h-5 w-2 rounded-full"
            style={{ backgroundColor: subAlt }}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className="block text-sm font-medium"
            style={{
              color: isSelected ? "var(--accent)" : "var(--text-primary)",
            }}
          >
            {meta.name}
          </span>
          <span className="mt-1 flex gap-1">
            {[bg, main, subAlt, text].map((color) => (
              <span
                key={`${meta.id}-${color}`}
                className="h-2 w-5 rounded-full"
                style={{ backgroundColor: color }}
              />
            ))}
          </span>
        </span>
        <span
          className="grid h-7 w-7 place-items-center rounded-full border transition-transform group-hover:scale-105"
          style={{
            borderColor: isSelected ? "var(--accent)" : "var(--border)",
          }}
        >
          {isSelected && <Check size={14} />}
        </span>
      </span>
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
        className="onboarding-dialog max-w-2xl overflow-hidden p-0"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <div
          className="border-b px-6 py-5"
          style={{ borderColor: "var(--border)" }}
        >
          <DialogHeader>
            <div className="mb-2 flex items-center justify-between gap-4">
              <p
                className="text-sm font-semibold lowercase"
                style={{ color: "var(--accent)" }}
              >
                devnotes
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: "var(--error-color)" }}
                />
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: "var(--accent)" }}
                />
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: "var(--success)" }}
                />
              </div>
            </div>
            <DialogTitle className="text-2xl">
              choose your writing surface
            </DialogTitle>
            <DialogDescription>
              Start with a theme that feels like your editor. Hover to preview,
              commit when it clicks.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6">
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

        <div
          className="flex items-center justify-between border-t px-6 py-5"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm transition-colors hover:text-[var(--accent)]"
            style={{ color: "var(--text-secondary)" }}
          >
            use serika
          </button>
          <Button
            onClick={handleConfirm}
            className="px-6 shadow-lg shadow-black/20"
          >
            continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
