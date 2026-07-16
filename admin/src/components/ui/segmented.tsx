"use client";

import type * as React from "react";

import { cn } from "@/lib/utils";

interface SegmentedOption<Value extends string> {
  value: Value;
  /** Icon-only segments should still pass a label for the aria-label. */
  label: string;
  icon?: React.ReactNode;
  /** Hide the text and show only the icon (view-mode toggles). */
  iconOnly?: boolean;
}

interface SegmentedProps<Value extends string> {
  options: SegmentedOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  className?: string;
}

/**
 * Segmented control (grid/list/compact view toggles, trending/recent sort).
 * A single bordered rail; the active segment gets the accent treatment.
 */
function Segmented<Value extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedProps<Value>) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-none border border-[var(--border)] bg-[var(--bg)]/60 p-1",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-none px-2 font-mono text-[11px] lowercase transition-colors",
              active
                ? "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
            )}
          >
            {option.icon}
            {!option.iconOnly && option.label}
          </button>
        );
      })}
    </div>
  );
}

export { Segmented };
