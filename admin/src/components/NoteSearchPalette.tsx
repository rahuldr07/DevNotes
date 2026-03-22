"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { FuseResultMatch } from "fuse.js";
import Fuse from "fuse.js";
import { Calendar, Hash, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { stripMarkdown } from "@/lib/notes";

interface NoteItem {
  id: number;
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string | null;
}

interface SearchResult {
  item: NoteItem;
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
  indices.forEach(([start, end], _idx) => {
    if (cursor < start) parts.push(text.slice(cursor, start));
    parts.push(
      <mark
        key={`m-${start}-${end}`}
        style={{ color: "var(--main-color)", background: "transparent" }}
        className="font-semibold"
      >
        {text.slice(start, end + 1)}
      </mark>,
    );
    cursor = end + 1;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export function NoteSearchPalette({
  open,
  notes,
  onClose,
}: {
  open: boolean;
  notes: NoteItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  const results: SearchResult[] = useMemo(() => {
    if (!query.trim()) {
      return notes.slice(0, 20).map((item) => ({ item }));
    }
    return fuse.search(query, { limit: 30 });
  }, [fuse, notes, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelectedIndex(0);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, Math.max(0, results.length - 1)),
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        const selected = results[selectedIndex];
        if (!selected) return;
        e.preventDefault();
        router.push(`/dashboard/edit_note?id=${selected.item.id}`);
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, results, selectedIndex, router]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      // Small timeout to ensure modal is rendered
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
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
            className="w-full max-w-2xl rounded-2xl overflow-hidden"
            style={{
              backgroundColor: "var(--sub-alt-color)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center gap-2 px-4 h-14"
              style={{ borderBottom: "1px solid var(--border-color)" }}
            >
              <Search size={16} style={{ color: "var(--sub-color)" }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notes by title, content, or tags..."
                className="w-full bg-transparent border-none outline-none text-sm"
                style={{ color: "var(--text-color)" }}
              />
              <kbd
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: "var(--hover-color)",
                  color: "var(--sub-color)",
                }}
              >
                Esc
              </kbd>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div
                  className="px-3 py-8 text-center text-sm"
                  style={{ color: "var(--sub-color)" }}
                >
                  No matching notes
                </div>
              ) : (
                results.map((result, index) => {
                  const note = result.item;
                  const titleMatch = result.matches?.find(
                    (m) => m.key === "title",
                  );
                  const contentMatch = result.matches?.find(
                    (m) => m.key === "content",
                  );
                  const plainPreview = stripMarkdown(note.content).slice(0, 80);
                  const isSelected = selectedIndex === index;
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => {
                        router.push(`/dashboard/edit_note?id=${note.id}`);
                        onClose();
                      }}
                      className="w-full text-left rounded-lg px-3 py-2.5 mb-1 transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? "color-mix(in srgb, var(--main-color) 12%, transparent)"
                          : "transparent",
                        border: `1px solid ${isSelected ? "color-mix(in srgb, var(--main-color) 35%, transparent)" : "transparent"}`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--text-color)" }}
                        >
                          {titleMatch?.indices
                            ? highlightText(note.title, titleMatch.indices)
                            : note.title || "Untitled"}
                        </div>
                        <div
                          className="flex items-center gap-1 text-[11px] flex-shrink-0"
                          style={{ color: "var(--sub-color)" }}
                        >
                          <Calendar size={11} />
                          {formatDate(note.updated_at ?? note.created_at)}
                        </div>
                      </div>
                      <div
                        className="text-xs mt-1.5 line-clamp-1"
                        style={{ color: "var(--sub-color)" }}
                      >
                        {contentMatch?.indices
                          ? highlightText(note.content, contentMatch.indices)
                          : plainPreview}
                      </div>
                      {note.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {note.tags.slice(0, 4).map((tag) => (
                            <span
                              key={`${note.id}-${tag}`}
                              className="text-[10px] px-1.5 py-0.5 rounded-full inline-flex items-center gap-1"
                              style={{
                                color: "var(--main-color)",
                                backgroundColor:
                                  "color-mix(in srgb, var(--main-color) 12%, transparent)",
                              }}
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
