"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { normalizeErrorMessage } from "@/lib/errors";
import type { Note, PaginatedNotesResponse } from "@/types/notes";

export function appendUniqueNotes(current: Note[], incoming: Note[]) {
  const seen = new Set(current.map((note) => note.id));
  return [...current, ...incoming.filter((note) => !seen.has(note.id))];
}

/**
 * Cursor-paginated note feed with IntersectionObserver infinite scroll.
 * Attach `lastNoteRef` to the final rendered card; the next page loads when
 * it scrolls into view. `fetchPage` must be referentially stable (wrap it in
 * useCallback) or the first page refetches on every render.
 */
export function useInfiniteNotes(
  fetchPage: (cursor: number | null) => Promise<PaginatedNotesResponse>,
  { errorFallback = "Failed to load notes" }: { errorFallback?: string } = {},
) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchFirstPage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const page = await fetchPage(null);
      setNotes(page.items);
      setNextCursor(page.next_cursor);
    } catch (err: unknown) {
      setError(normalizeErrorMessage(err, errorFallback));
    } finally {
      setLoading(false);
    }
  }, [errorFallback, fetchPage]);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  const fetchNextPage = useCallback(async () => {
    if (loading || loadingMore || nextCursor === null) return;

    try {
      setLoadingMore(true);
      const page = await fetchPage(nextCursor);
      setNotes((prev) => appendUniqueNotes(prev, page.items));
      setNextCursor(page.next_cursor);
    } catch (err: unknown) {
      setError(normalizeErrorMessage(err, "Failed to load more notes"));
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, loading, loadingMore, nextCursor]);

  const lastNoteRef = useCallback(
    (node: HTMLElement | null) => {
      if (loading || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || nextCursor === null) return;

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      });
      observerRef.current.observe(node);
    },
    [fetchNextPage, loading, loadingMore, nextCursor],
  );

  return {
    notes,
    setNotes,
    loading,
    loadingMore,
    nextCursor,
    error,
    lastNoteRef,
    refetch: fetchFirstPage,
  };
}
