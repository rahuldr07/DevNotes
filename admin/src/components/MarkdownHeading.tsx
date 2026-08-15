"use client";

import { Link2 } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { copyToClipboard } from "@/lib/clipboard";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * A rendered heading with a deep link.
 *
 * `rehype-slug` puts the id on the element; this adds the affordance to
 * actually use it — a hover `#` that copies the absolute URL. Clicking the
 * anchor also updates the address bar, so the browser's own back/forward
 * still works.
 *
 * The anchor sits after the text and is only revealed on hover/focus, so it
 * never disturbs the measure of the heading itself.
 */
export function MarkdownHeading({
  level,
  id,
  children,
  ...props
}: ComponentPropsWithoutRef<"h2"> & { level: HeadingLevel }) {
  const Tag = `h${level}` as const;

  const copyLink = async () => {
    if (!id || typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    await copyToClipboard(url);
  };

  return (
    <Tag id={id} className="md-heading" {...props}>
      {children}
      {id && (
        <a
          href={`#${id}`}
          onClick={copyLink}
          className="md-heading-anchor"
          aria-label="Copy link to this section"
          title="Copy link to this section"
        >
          <Link2 size={14} aria-hidden />
        </a>
      )}
    </Tag>
  );
}
