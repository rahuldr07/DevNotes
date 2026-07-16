import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Keyboard hint chip (`ctrl k`, `esc`, `/`). One look everywhere: hairline
 * border, page background, mono micro-type, theme radius via rounded-none.
 */
function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center rounded-none border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[10px] lowercase text-[var(--text-secondary)]",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
