import type * as React from "react";

import { cn } from "@/lib/utils";

interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  value: React.ReactNode;
  label: React.ReactNode;
  sublabel?: React.ReactNode;
}

/**
 * Big-number stat cell (dashboard workspace grid, snippets/explore headers,
 * public profile). Number in display weight, mono micro-caps label,
 * muted sublabel.
 */
function StatTile({
  value,
  label,
  sublabel,
  className,
  ...props
}: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/40 p-4",
        className,
      )}
      {...props}
    >
      <p className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
        {label}
      </p>
      {sublabel && (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{sublabel}</p>
      )}
    </div>
  );
}

export { StatTile };
