"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { FuseResultMatch } from "fuse.js";
import Fuse from "fuse.js";
import { Calendar, Hash, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchNotes as searchNotesApi } from "@/lib/note-api";
import { stripMarkdown } from "@/lib/notes";
import type { Note } from "@/types/notes";

type SearchMode = "local" | "full";

interface SearchResult {
  item: Note;
  score?: number;
  matches?: readonly FuseResultMatch[];
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function highlightText(text: string, indices: readonly [number, number][]) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  indices.forEach(([start, end]) => {
    if (cursor < start) parts.push(text.slice(cursor, start));
    parts.push(
      <mark
        key={`m-${start}-${end}`}
        className="rounded-sm bg-[var(--accent)] px-0.5 text-[var(--bg)]"
      >
        {text.slice(start, end + 1)}
      </mark>,
    );
    cursor = end + 1;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function titleTermIndices(text: string, query: string) {
  const terms = Array.from(
    new Set(query.trim().toLowerCase().split(/\s+/).filter(Boolean)),
  );
  if (terms.length === 0) return [];

  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const term of terms) {
    let index = lower.indexOf(term);
    while (index !== -1) {
      ranges.push([index, index + term.length - 1]);
      index = lower.indexOf(term, index + term.length);
    }
  }

  return ranges
    .sort((a, b) => a[0] - b[0])
    .reduce<[number, number][]>((merged, range) => {
      const last = merged.at(-1);
      if (!last || range[0] > last[1] + 1) {
        merged.push(range);
      } else {
        last[1] = Math.max(last[1], range[1]);
      }
      return merged;
    }, []);
}

export function NoteSearchPalette({
  open,
  notes,
  onClose,
}: {
  open: boolean;
  notes: Note[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("local");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullResults, setFullResults] = useState<Note[]>([]);
  const [fullLoading, setFullLoading] = useState(false);
  const [fullError, setFullError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(notes, {
        includeMatches: true,
        includeScore: true,
        threshold: 0.34,
        minMatchCharLength: 1,
        keys: [
          { name: "title", weight: 0.65 },
          { name: "content", weight: 0.25 },
          { name: "tags", weight: 0.1 },
        ],
      }),
    [notes],
  );

  const localResults: SearchResult[] = useMemo(() => {
    if (!query.trim()) {
      return notes.slice(0, 20).map((item) => ({ item }));
    }
    return fuse.search(query, { limit: 30 });
  }, [fuse, notes, query]);

  useEffect(() => {
    if (!open || mode !== "full") return;
    const trimmed = query.trim();
    setFullError("");

    if (!trimmed) {
      setFullResults([]);
      setFullLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setFullLoading(true);
        const results = await searchNotesApi(trimmed, controller.signal);
        setFullResults(results);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFullResults([]);
        setFullError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setFullLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [mode, open, query]);

  const results: SearchResult[] =
    mode === "local" ? localResults : fullResults.map((item) => ({ item }));

  useEffect(() => {
    if (!open) {
      setQuery("");
      setMode("local");
      setSelectedIndex(0);
      setFullResults([]);
      setFullError("");
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, Math.max(0, results.length - 1)),
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Enter") {
        const selected = results[selectedIndex];
        if (!selected) return;
        event.preventDefault();
        router.push(`/dashboard/edit_note?id=${selected.item.id}`);
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, results, router, selectedIndex]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [mode, query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          style={{ backgroundColor: "rgba(0,0,0,0.52)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-2xl overflow-hidden rounded-md bg-[var(--bg-secondary)]"
            style={{ border: "1px solid var(--border)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <Search size={16} className="text-[var(--text-secondary)]" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  mode === "local" ? "search loaded notes" : "search all notes"
                }
                className="w-full border-none bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
              <div className="flex shrink-0 items-center gap-1">
                {(["local", "full"] as SearchMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    className="rounded-md px-2 py-1 text-[11px] transition-colors hover:bg-[var(--border)]"
                    style={{
                      color:
                        mode === item
                          ? "var(--accent)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {item === "local" ? "local" : "full search"}
                  </button>
                ))}
              </div>
              <kbd className="rounded bg-[var(--bg)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                esc
              </kbd>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-2">
              {mode === "full" && !query.trim() ? (
                <div className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]">
                  type to search all notes
                </div>
              ) : fullLoading ? (
                <div className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]">
                  loading...
                </div>
              ) : fullError ? (
                <div className="px-3 py-8 text-center text-sm text-[var(--error)]">
                  {fullError}
                </div>
              ) : results.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-[var(--text-secondary)]">
                  no matching notes
                </div>
              ) : (
                results.map((result, index) => {
                  const note = result.item;
                  const titleMatch = result.matches?.find(
                    (match) => match.key === "title",
                  );
                  const contentMatch = result.matches?.find(
                    (match) => match.key === "content",
                  );
                  const plainPreview = stripMarkdown(note.content).slice(0, 80);
                  const isSelected = selectedIndex === index;
                  const fullTitleMatch =
                    mode === "full" ? titleTermIndices(note.title, query) : [];

                  return (
                    <button
                      key={note.id}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => {
                        router.push(`/dashboard/edit_note?id=${note.id}`);
                        onClose();
                      }}
                      className="mb-1 w-full rounded-md px-3 py-2.5 text-left transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                          : "transparent",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                          {mode === "full" && fullTitleMatch.length > 0
                            ? highlightText(note.title, fullTitleMatch)
                            : titleMatch?.indices
                              ? highlightText(note.title, titleMatch.indices)
                              : note.title || "untitled"}
                        </div>
                        <div className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                          <Calendar size={11} />
                          {formatDate(note.updated_at ?? note.created_at)}
                        </div>
                      </div>
                      <div className="mt-1.5 line-clamp-1 text-xs text-[var(--text-secondary)]">
                        {contentMatch?.indices
                          ? highlightText(note.content, contentMatch.indices)
                          : plainPreview}
                      </div>
                      {note.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {note.tags.slice(0, 4).map((tag) => (
                            <span
                              key={`${note.id}-${tag}`}
                              className="inline-flex items-center gap-1 text-[10px] text-[var(--accent)]"
                            >
                              <Hash size={10} />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
