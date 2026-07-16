import type * as React from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional call to action (a Button/Link) rendered under the copy. */
  action?: React.ReactNode;
}

/**
 * Shared empty/none-yet surface: centered icon in an accent-tinted square,
 * lowercase title, muted description, optional CTA.
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/30 px-6 py-14 text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="grid h-12 w-12 place-items-center rounded-none border border-[var(--border)] bg-[var(--bg)]/60 text-[var(--accent)]">
          {icon}
        </span>
      )}
      <p className="text-sm font-medium lowercase text-[var(--text-primary)]">
        {title}
      </p>
      {description && (
        <p className="max-w-sm text-xs leading-5 text-[var(--text-secondary)]">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export { EmptyState };
