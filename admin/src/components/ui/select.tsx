import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Themed native select — matches the input/chip family: hairline border,
 * secondary surface, mono lowercase copy. Native element on purpose; the
 * dropdown list inherits OS behavior and stays keyboard-accessible for free.
 */
function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-8 cursor-pointer rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/60 px-2 font-mono text-[11px] lowercase text-[var(--text-secondary)] outline-none transition-colors hover:text-[var(--text-primary)] focus-visible:ring-1 focus-visible:ring-[var(--accent)]",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
