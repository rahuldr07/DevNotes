"use client";

import { useEffect } from "react";

const SEEN_KEY = "devnotes-viewed-notes";

function alreadyCounted(shareUuid: string): boolean {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    const seen: string[] = raw ? JSON.parse(raw) : [];
    if (seen.includes(shareUuid)) return true;
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, shareUuid]));
    return false;
  } catch {
    // Private mode or a storage quota error: counting once per page load is
    // still better than counting once per server fetch.
    return false;
  }
}

/**
 * Counts one read of a public note.
 *
 * The count deliberately does not ride the page's data fetch: `/s/[uuid]` is
 * server-rendered, so a GET-side increment counted the Next.js server's own
 * request — link prefetches and crawlers included — rather than a human
 * reading the note. Firing from the browser after paint, once per session
 * per note, counts readers instead.
 */
export function RecordPublicView({ shareUuid }: { shareUuid: string }) {
  useEffect(() => {
    if (!shareUuid || alreadyCounted(shareUuid)) return;

    const controller = new AbortController();
    fetch(`/api/notes/public/${encodeURIComponent(shareUuid)}/view`, {
      method: "POST",
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      // A missed view count is not worth surfacing to a reader.
    });

    return () => controller.abort();
  }, [shareUuid]);

  return null;
}
