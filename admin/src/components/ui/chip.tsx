import type * as React from "react";

import { cn } from "@/lib/utils";

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected state — accent text/border with a faint accent wash. */
  active?: boolean;
  /** Optional trailing count (filter chips: `pinned 3`). */
  count?: number | string;
}

/**
 * The workbench filter/tag chip: mono, lowercase, hairline border, theme
 * radius. Every clickable pill in the app (library filters, topic tags,
 * language lanes, mode toggles) is this component.
 */
function Chip({
  active = false,
  count,
  className,
  children,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      data-active={active || undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-none border px-2.5 py-1 font-mono text-[11px] lowercase transition-colors",
        active
          ? "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_8%,transparent)] text-[var(--accent)]"
          : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)]",
        className,
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            "rounded-none px-1 text-[10px]",
            active
              ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
              : "bg-[var(--bg-secondary)]",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export { Chip };
