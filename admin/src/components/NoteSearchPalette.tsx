"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { FuseResultMatch } from "fuse.js";
import Fuse from "fuse.js";
import {
  Calendar,
  Check,
  Clipboard,
  Code2,
  Command,
  Compass,
  Database,
  FilePlus2,
  Hash,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { Kbd } from "@/components/ui/kbd";
import { copyToClipboard } from "@/lib/clipboard";
import { normalizeErrorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { searchNotes as searchNotesApi } from "@/lib/note-api";
import { previewText } from "@/lib/notes";
import type { Note } from "@/types/notes";

type SearchMode = "local" | "full";

interface SearchResult {
  item: Note;
  score?: number;
  matches?: readonly FuseResultMatch[];
}

interface PaletteCommand {
  id: string;
  title: string;
  description: string;
  href: string;
  keywords: string[];
  icon: typeof FilePlus2;
}

type PaletteItem =
  | { type: "command"; command: PaletteCommand }
  | { type: "note"; result: SearchResult }
  | { type: "recent"; query: string };

const RECENT_SEARCHES_KEY = "devnotes-recent-searches";

const COMMANDS: PaletteCommand[] = [
  {
    id: "new-note",
    title: "Create new note",
    description: "Open the editor workbench for a fresh note.",
    href: "/dashboard/create_note",
    keywords: ["new", "create", "note", "write"],
    icon: FilePlus2,
  },
  {
    id: "snippets",
    title: "Open snippet vault",
    description: "Browse copy-ready commands, configs, and code patterns.",
    href: "/dashboard/snippets",
    keywords: ["snippet", "code", "copy", "vault"],
    icon: Code2,
  },
  {
    id: "explore",
    title: "Explore community notes",
    description: "Discover public notes, guides, and reusable knowledge.",
    href: "/dashboard/explore",
    keywords: ["explore", "community", "public", "discover"],
    icon: Compass,
  },
  {
    id: "ask",
    title: "Ask your workspace",
    description: "Question your own notes with ranked, cited retrieval.",
    href: "/dashboard/ask",
    keywords: ["ask", "ai", "question", "answer", "retrieval", "sources"],
    icon: Sparkles,
  },
  {
    id: "settings",
    title: "Edit public profile",
    description: "Tune your identity, bio, links, and publishing profile.",
    href: "/dashboard/settings",
    keywords: ["settings", "profile", "identity", "bio"],
    icon: Settings,
  },
];

function highlightText(text: string, indices: readonly [number, number][]) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  indices.forEach(([start, end]) => {
    if (cursor < start) parts.push(text.slice(cursor, start));
    parts.push(
      <mark
        key={`m-${start}-${end}`}
        className="rounded-none bg-[var(--accent)] px-0.5 text-[var(--bg)]"
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

function buildSnippet(content: string, query: string, fallbackLength = 130) {
  const plain = previewText(content).replace(/\s+/g, " ").trim();
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const lower = plain.toLowerCase();
  const firstHit = terms
    .map((term) => lower.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (firstHit === undefined) return plain.slice(0, fallbackLength);

  const start = Math.max(0, firstHit - 48);
  const end = Math.min(plain.length, firstHit + fallbackLength);
  return `${start > 0 ? "..." : ""}${plain.slice(start, end)}${end < plain.length ? "..." : ""}`;
}

export function NoteSearchPalette({
  open,
  notes,
  indexLoading = false,
  onClose,
}: {
  open: boolean;
  notes: Note[];
  indexLoading?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("local");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
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
        setFullResults(results.items ?? []);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setFullResults([]);
        setFullError(normalizeErrorMessage(err, "Search failed"));
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
  const commandResults = useMemo(() => {
    if (mode !== "local") return [];
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return COMMANDS;
    return COMMANDS.filter((command) => {
      const haystack = [command.title, command.description, ...command.keywords]
        .join(" ")
        .toLowerCase();
      return haystack.includes(trimmed);
    });
  }, [mode, query]);
  const paletteItems: PaletteItem[] = useMemo(
    () => [
      ...(mode === "local" && !query.trim()
        ? recentSearches.map((recentQuery) => ({
            type: "recent" as const,
            query: recentQuery,
          }))
        : []),
      ...commandResults.map((command) => ({
        type: "command" as const,
        command,
      })),
      ...results.map((result) => ({ type: "note" as const, result })),
    ],
    [commandResults, mode, query, recentSearches, results],
  );
  const showIndexLoading =
    mode === "local" && indexLoading && notes.length === 0;

  const rememberSearch = useCallback((value: string) => {
    const cleaned = value.trim();
    if (cleaned.length < 2) return;
    setRecentSearches((prev) => {
      const next = [cleaned, ...prev.filter((item) => item !== cleaned)].slice(
        0,
        6,
      );
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const executeItem = useCallback(
    (item: PaletteItem | undefined) => {
      if (!item) return;
      if (item.type === "command") {
        router.push(item.command.href);
      } else if (item.type === "recent") {
        setQuery(item.query);
        setSelectedIndex(0);
        return;
      } else {
        rememberSearch(query);
        router.push(`/dashboard/edit_note?id=${item.result.item.id}`);
      }
      onClose();
    },
    [onClose, query, rememberSearch, router],
  );

  // Reset/load state only when `open` flips. Keeping this apart from the
  // keydown effect matters: setRecentSearches produces a new array, which
  // feeds paletteItems — if that effect also depended on paletteItems it
  // would re-run itself forever.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setMode("local");
      setSelectedIndex(0);
      setFullResults([]);
      setFullError("");
      return;
    }

    try {
      const parsed = JSON.parse(
        localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]",
      );
      if (Array.isArray(parsed)) {
        setRecentSearches(
          parsed.filter((item): item is string => typeof item === "string"),
        );
      }
    } catch {
      setRecentSearches([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, Math.max(0, paletteItems.length - 1)),
        );
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "Enter") {
        const selected = paletteItems[selectedIndex];
        if (!selected) return;
        event.preventDefault();
        executeItem(selected);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [executeItem, open, onClose, paletteItems, selectedIndex]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  const copySnippet = async (
    note: Note,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    if (await copyToClipboard(note.content)) {
      setCopiedId(note.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } else {
      setCopiedId(null);
      gooeyToast.error("Copy failed", {
        description: "Clipboard access was blocked by the browser.",
      });
    }
  };

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
            className="w-full max-w-3xl overflow-hidden rounded-none bg-[var(--bg-secondary)] shadow-md shadow-black/30"
            style={{ border: "1px solid var(--border)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="grid h-9 w-9 place-items-center rounded-none border border-[var(--border)] bg-[var(--bg)]/70 text-[var(--accent)]">
                <Search size={16} />
              </div>
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelectedIndex(0);
                }}
                placeholder={
                  mode === "local"
                    ? "search loaded notes, tags, snippets..."
                    : "deep search all notes..."
                }
                className="w-full border-none bg-transparent text-base text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
              <div className="flex shrink-0 items-center gap-1">
                {(["local", "full"] as SearchMode[]).map((item) => (
                  <Chip
                    key={item}
                    active={mode === item}
                    onClick={() => {
                      setMode(item);
                      setSelectedIndex(0);
                    }}
                  >
                    {item === "local" ? (
                      <Command size={11} />
                    ) : (
                      <Database size={11} />
                    )}
                    {item === "local" ? "loaded" : "deep"}
                  </Chip>
                ))}
              </div>
              <Kbd>esc</Kbd>
            </div>

            <div className="border-b border-[var(--border)] bg-[var(--bg)]/30 px-5 py-2 text-[11px] text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={12} className="text-[var(--accent)]" />
                {mode === "local"
                  ? indexLoading
                    ? "indexing your latest workspace notes"
                    : "Fast retrieval across loaded notes"
                  : "ranked full-text retrieval across your complete vault"}
              </span>
            </div>

            <div className="max-h-[62vh] overflow-y-auto p-3">
              {showIndexLoading ? (
                <div className="rounded-none border border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
                  loading retrieval index...
                </div>
              ) : mode === "full" && !query.trim() ? (
                <div className="rounded-none border border-dashed border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
                  type to search every note in your vault with ranked retrieval
                </div>
              ) : fullLoading ? (
                <div className="rounded-none border border-[var(--border)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
                  searching your knowledge graph...
                </div>
              ) : fullError ? (
                <div className="rounded-none border border-[var(--error)] px-4 py-10 text-center text-sm text-[var(--error)]">
                  {fullError}
                </div>
              ) : paletteItems.length === 0 ? (
                <EmptyState
                  title="no matching commands or notes yet"
                  className="py-8"
                />
              ) : (
                paletteItems.map((item, index) => {
                  if (item.type === "recent") {
                    const isSelected = selectedIndex === index;
                    return (
                      <button
                        key={`recent-${item.query}`}
                        type="button"
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => executeItem(item)}
                        className="group mb-2 w-full rounded-none border px-4 py-3 text-left transition-colors hover:shadow-lg hover:shadow-black/10"
                        style={{
                          backgroundColor: isSelected
                            ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                            : "transparent",
                          borderColor: isSelected
                            ? "var(--accent)"
                            : "var(--border)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-none border border-[var(--border)] bg-[var(--bg)]/60 text-[var(--accent)]">
                            <Search size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[var(--text-primary)]">
                              {item.query}
                            </span>
                            <span className="mt-1 block truncate text-xs text-[var(--text-secondary)]">
                              Recent search. Press enter to run it again.
                            </span>
                          </span>
                          <span className="rounded-none border border-[var(--border)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                            recent
                          </span>
                        </div>
                      </button>
                    );
                  }

                  if (item.type === "command") {
                    const Icon = item.command.icon;
                    const isSelected = selectedIndex === index;
                    return (
                      <button
                        key={item.command.id}
                        type="button"
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => executeItem(item)}
                        className="group mb-2 w-full rounded-none border px-4 py-3 text-left transition-colors hover:shadow-lg hover:shadow-black/10"
                        style={{
                          backgroundColor: isSelected
                            ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                            : "transparent",
                          borderColor: isSelected
                            ? "var(--accent)"
                            : "var(--border)",
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-none border border-[var(--border)] bg-[var(--bg)]/60 text-[var(--accent)]">
                            <Icon size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[var(--text-primary)]">
                              {item.command.title}
                            </span>
                            <span className="mt-1 block truncate text-xs text-[var(--text-secondary)]">
                              {item.command.description}
                            </span>
                          </span>
                          <span className="rounded-none border border-[var(--border)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                            command
                          </span>
                        </div>
                      </button>
                    );
                  }

                  const result = item.result;
                  const note = result.item;
                  const titleMatch = result.matches?.find(
                    (match) => match.key === "title",
                  );
                  const contentMatch = result.matches?.find(
                    (match) => match.key === "content",
                  );
                  const plainPreview = buildSnippet(note.content, query);
                  const isSelected = selectedIndex === index;
                  const fullTitleMatch =
                    mode === "full" ? titleTermIndices(note.title, query) : [];

                  return (
                    // biome-ignore lint/a11y/useSemanticElements: Result row contains a nested copy button, so it cannot be a native button.
                    <div
                      key={note.id}
                      role="button"
                      tabIndex={0}
                      onMouseEnter={() => setSelectedIndex(index)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(`/dashboard/edit_note?id=${note.id}`);
                          onClose();
                        }
                      }}
                      onClick={() => {
                        router.push(`/dashboard/edit_note?id=${note.id}`);
                        onClose();
                      }}
                      className="group mb-2 w-full rounded-none border px-4 py-3 text-left transition-colors hover:shadow-lg hover:shadow-black/10"
                      style={{
                        backgroundColor: isSelected
                          ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                          : "transparent",
                        borderColor: isSelected
                          ? "var(--accent)"
                          : "var(--border)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {mode === "full" && fullTitleMatch.length > 0
                            ? highlightText(note.title, fullTitleMatch)
                            : titleMatch?.indices
                              ? highlightText(note.title, titleMatch.indices)
                              : note.title || "untitled"}
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                          {note.note_type === "snippet" && (
                            <button
                              type="button"
                              onClick={(event) => copySnippet(note, event)}
                              className="inline-flex items-center gap-1 rounded-none border border-[var(--border)] px-2 py-1 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            >
                              {copiedId === note.id ? (
                                <Check size={11} />
                              ) : (
                                <Clipboard size={11} />
                              )}
                              {copiedId === note.id ? "copied" : "copy"}
                            </button>
                          )}
                          <Calendar size={11} />
                          {formatDate(note.updated_at ?? note.created_at)}
                        </div>
                      </div>
                      <div className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
                        {contentMatch?.indices
                          ? highlightText(note.content, contentMatch.indices)
                          : plainPreview}
                      </div>
                      {note.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {note.tags.slice(0, 4).map((tag) => (
                            <span
                              key={`${note.id}-${tag}`}
                              className="inline-flex items-center gap-1 rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-2 py-0.5 text-[10px] text-[var(--accent)]"
                            >
                              <Hash size={10} />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
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
