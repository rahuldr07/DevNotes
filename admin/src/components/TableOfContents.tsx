"use client";

import { List } from "lucide-react";
import { useEffect, useState } from "react";
import type { TocHeading } from "@/lib/toc";

/**
 * Sticky table of contents with scroll-spy.
 *
 * The observer's bottom margin is pulled in to -70%, so a heading only counts
 * as "current" once it is in the top third of the viewport. Without that the
 * highlight runs ahead of the reader: a heading technically enters the
 * viewport at the very bottom of the screen, long before anyone is reading it.
 *
 * When several headings qualify, the last one in document order wins — that is
 * the section the reader has most recently entered.
 */
export function TableOfContents({ headings }: { headings: TocHeading[] }) {
  const [activeId, setActiveId] = useState<string>(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) return;

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }

        // Document order, so the deepest entered section wins.
        const current = headings.filter((heading) => visible.has(heading.id));
        if (current.length > 0) {
          setActiveId(current[current.length - 1].id);
          return;
        }

        // Nothing in the band (a long section scrolled past its own heading):
        // keep the last heading above the fold rather than clearing.
        const scrolled = elements.filter(
          (element) => element.getBoundingClientRect().top < 0,
        );
        if (scrolled.length > 0) {
          setActiveId(scrolled[scrolled.length - 1].id);
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav
      aria-labelledby="toc-heading"
      className="rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/60 p-5 backdrop-blur-xl"
    >
      <p
        id="toc-heading"
        className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]"
      >
        <List size={14} className="text-[var(--accent)]" />
        on this page
      </p>
      <ul className="space-y-1 text-sm">
        {headings.map((heading) => {
          const isActive = heading.id === activeId;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                aria-current={isActive ? "location" : undefined}
                className={`block border-l-2 py-1 transition-colors ${
                  isActive
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]"
                }`}
                style={{
                  paddingLeft: `${(heading.level - 1) * 0.75 + 0.75}rem`,
                }}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
