/**
 * Dashboard Page — Main notes listing with CRUD operations.
 *
 * Route: /dashboard (protected — requires authentication)
 *
 * Features:
 * - Fetches and displays all user's notes in a responsive grid or list view
 * - Pin notes (float to top, persisted to backend)
 * - Sort: Newest / Oldest / Title A-Z (persisted to localStorage)
 * - View toggle: Grid / List (persisted to localStorage)
 * - Create, Edit, Delete notes
 */
"use client";

import {
  AlertCircle,
  Edit3,
  FileText,
  LayoutGrid,
  List,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NoteSearchPalette } from "@/components/NoteSearchPalette";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConfirm } from "@/hooks/useConfirm";
import { api } from "@/lib/api";
import { stripMarkdown } from "@/lib/notes";

type SortKey = "newest" | "oldest" | "title";
type ViewMode = "grid" | "list";

interface Note {
  id: number;
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string | null;
}

function NoteCardSkeleton({ view }: { view: ViewMode }) {
  if (view === "list") {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-4"
        style={{
          backgroundColor: "var(--sub-alt-color)",
          border: "1px solid var(--border-color)",
        }}
      >
        <Skeleton
          className="h-4 w-1/3"
          style={{ backgroundColor: "var(--hover-color)" }}
        />
        <Skeleton
          className="h-3 flex-1"
          style={{ backgroundColor: "var(--hover-color)" }}
        />
        <Skeleton
          className="h-3 w-20"
          style={{ backgroundColor: "var(--hover-color)" }}
        />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-7 w-7 rounded-md"
              style={{ backgroundColor: "var(--hover-color)" }}
            />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div
      className="rounded-xl p-5 space-y-3"
      style={{
        backgroundColor: "var(--sub-alt-color)",
        border: "1px solid var(--border-color)",
      }}
    >
      <Skeleton
        className="h-5 w-3/4"
        style={{ backgroundColor: "var(--hover-color)" }}
      />
      <Skeleton
        className="h-4 w-full"
        style={{ backgroundColor: "var(--hover-color)" }}
      />
      <Skeleton
        className="h-4 w-5/6"
        style={{ backgroundColor: "var(--hover-color)" }}
      />
      <div className="flex justify-between items-center pt-1">
        <Skeleton
          className="h-3 w-20"
          style={{ backgroundColor: "var(--hover-color)" }}
        />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-7 w-7 rounded-md"
              style={{ backgroundColor: "var(--hover-color)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NoteCard({
  note,
  view,
  onDelete,
  onPin,
}: {
  note: Note;
  view: ViewMode;
  onDelete: (id: number) => void;
  onPin: (id: number) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const preview = stripMarkdown(note.content).slice(0, 160);
  const date = new Date(note.updated_at ?? note.created_at).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );

  const actionButtons = (
    <div className="flex gap-1 flex-shrink-0">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPin(note.id)}
            className="h-7 w-7 transition-opacity hover:opacity-70"
            style={{
              color: note.is_pinned ? "var(--main-color)" : "var(--sub-color)",
            }}
          >
            {note.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{note.is_pinned ? "Unpin" : "Pin note"}</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={`/dashboard/edit_note?id=${note.id}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 transition-opacity hover:opacity-70"
              style={{ color: "var(--sub-color)" }}
            >
              <Edit3 size={14} />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>Edit note</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(note.id)}
            className="h-7 w-7 transition-opacity hover:opacity-70"
            style={{ color: "var(--error-color)" }}
          >
            <Trash2 size={14} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete note</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );

  // ── List view ────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-4 transition-all duration-200"
        style={{
          backgroundColor: "var(--sub-alt-color)",
          border: `1px solid ${hovered ? "var(--main-color)" : "var(--border-color)"}`,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {note.is_pinned && (
          <Pin
            size={11}
            style={{ color: "var(--main-color)", flexShrink: 0 }}
          />
        )}
        <span
          className="text-sm font-semibold truncate flex-shrink-0 max-w-[200px]"
          style={{ color: "var(--text-color)" }}
        >
          {note.title || "Untitled"}
        </span>
        {preview && (
          <span
            className="text-xs truncate flex-1 min-w-0"
            style={{ color: "var(--sub-color)" }}
          >
            {preview}
          </span>
        )}
        {note.tags.length > 0 && (
          <div className="hidden lg:flex items-center gap-1 max-w-[200px] truncate">
            {note.tags.slice(0, 2).map((tag) => (
              <span
                key={`${note.id}-list-${tag}`}
                className="text-[10px] px-1.5 py-0.5 rounded-full truncate"
                style={{
                  color: "var(--main-color)",
                  backgroundColor:
                    "color-mix(in srgb, var(--main-color) 12%, transparent)",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        <span
          className="text-xs flex-shrink-0"
          style={{ color: "var(--sub-color)" }}
        >
          {date}
        </span>
        {actionButtons}
      </div>
    );
  }

  // ── Grid view ────────────────────────────────────────────────────────────
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: card hover effect
    <div
      className="rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 group"
      style={{
        backgroundColor: "var(--sub-alt-color)",
        border: `1px solid ${hovered ? "var(--main-color)" : "var(--border-color)"}`,
        boxShadow: hovered ? "0 0 0 1px var(--main-color)" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start justify-between gap-2">
        <h2
          className="text-base font-semibold leading-snug line-clamp-2 flex-1"
          style={{ color: "var(--text-color)" }}
        >
          {note.title || "Untitled"}
        </h2>
        {note.is_pinned && (
          <Pin
            size={12}
            style={{ color: "var(--main-color)", flexShrink: 0, marginTop: 2 }}
          />
        )}
      </div>

      {preview && (
        <p
          className="text-sm leading-relaxed line-clamp-3 flex-1"
          style={{ color: "var(--sub-color)" }}
        >
          {preview}
          {stripMarkdown(note.content).length > 160 && "…"}
        </p>
      )}
      {note.tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap -mt-1">
          {note.tags.slice(0, 4).map((tag) => (
            <span
              key={`${note.id}-grid-${tag}`}
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{
                color: "var(--main-color)",
                backgroundColor:
                  "color-mix(in srgb, var(--main-color) 12%, transparent)",
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-xs" style={{ color: "var(--sub-color)" }}>
          {date}
        </span>
        {actionButtons}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>("grid");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  // Restore persisted preferences
  useEffect(() => {
    const savedSort = localStorage.getItem("devnotes-sort") as SortKey | null;
    const savedView = localStorage.getItem("devnotes-view") as ViewMode | null;
    if (savedSort) setSort(savedSort);
    if (savedView) setView(savedView);
  }, []);

  const changeSort = (s: SortKey) => {
    setSort(s);
    localStorage.setItem("devnotes-sort", s);
  };
  const changeView = (v: ViewMode) => {
    setView(v);
    localStorage.setItem("devnotes-view", v);
  };

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await api.get<Note[]>("/notes/notes");
        setNotes(data);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load notes";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  useEffect(() => {
    const onGlobalShortcut = (e: KeyboardEvent) => {
      const inInput =
        e.target instanceof HTMLElement &&
        (e.target.tagName === "INPUT" ||
          e.target.tagName === "TEXTAREA" ||
          e.target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (!inInput && e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", onGlobalShortcut);
    return () => window.removeEventListener("keydown", onGlobalShortcut);
  }, []);

  const handleDelete = async (id: number) => {
    const note = notes.find((n) => n.id === id);
    const ok = await confirm({
      title: "Delete this note?",
      description: note?.title
        ? `"${note.title}" will be permanently removed. This cannot be undone.`
        : "This note will be permanently removed. This cannot be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/notes/${id}/delete`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      gooeyToast.success("Note deleted");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not delete the note.";
      gooeyToast.error("Delete failed", {
        description: message,
      });
    }
  };

  const handlePin = useCallback(async (id: number) => {
    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_pinned: !n.is_pinned } : n)),
    );
    try {
      await api.patch(`/notes/${id}/pin`, {});
    } catch (err: unknown) {
      // Revert on failure
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_pinned: !n.is_pinned } : n)),
      );
      const message = err instanceof Error ? err.message : "Could not pin note";
      gooeyToast.error(message);
    }
  }, []);

  // Sort: pinned first, then by selected sort key
  const sortedNotes = useMemo(() => {
    const sorted = [...notes].sort((a, b) => {
      if (sort === "newest")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      if (sort === "oldest")
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      return a.title.localeCompare(b.title);
    });
    // Pinned notes float to top, preserving their relative order
    const pinnedSorted = [
      ...sorted.filter((n) => n.is_pinned),
      ...sorted.filter((n) => !n.is_pinned),
    ];
    if (!selectedTag) return pinnedSorted;
    return pinnedSorted.filter((note) => note.tags.includes(selectedTag));
  }, [notes, sort, selectedTag]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        set.add(tag);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const sortBtnStyle = (active: boolean) => ({
    color: active ? "var(--main-color)" : "var(--sub-color)",
    backgroundColor: active
      ? "color-mix(in srgb, var(--main-color) 12%, transparent)"
      : "transparent",
    border: "none",
    transition: "all 0.15s ease",
  });

  const viewBtnStyle = (active: boolean) => ({
    color: active ? "var(--main-color)" : "var(--sub-color)",
    backgroundColor: active
      ? "color-mix(in srgb, var(--main-color) 12%, transparent)"
      : "transparent",
    border: "none",
    transition: "all 0.15s ease",
  });

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-color)" }}
          >
            My Notes
          </h1>
          {!loading && (
            <p className="text-sm mt-0.5" style={{ color: "var(--sub-color)" }}>
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            className="gap-1.5 text-xs"
            onClick={toggleSearch}
            style={{
              color: "var(--sub-color)",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--sub-alt-color)",
            }}
          >
            <Search size={13} />
            Search
            <kbd
              className="text-[10px] px-1 py-0.5 rounded"
              style={{
                backgroundColor: "var(--hover-color)",
                color: "var(--sub-color)",
              }}
            >
              ⌘K
            </kbd>
          </Button>
          <Link href="/dashboard/create_note">
            <Button
              className="gap-2 font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--main-color)",
                color: "var(--bg-color)",
                border: "none",
              }}
            >
              <Plus size={16} />
              New note
            </Button>
          </Link>
        </div>
      </div>

      {/* Controls bar — sort + view toggle */}
      {!loading && notes.length > 0 && (
        <div className="space-y-3 mb-5">
          {availableTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="text-xs px-2 py-1 rounded-full transition-opacity hover:opacity-85"
                style={{
                  color:
                    selectedTag === null
                      ? "var(--bg-color)"
                      : "var(--sub-color)",
                  backgroundColor:
                    selectedTag === null
                      ? "var(--main-color)"
                      : "var(--sub-alt-color)",
                  border: `1px solid ${selectedTag === null ? "var(--main-color)" : "var(--border-color)"}`,
                }}
              >
                All
              </button>
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className="text-xs px-2 py-1 rounded-full transition-opacity hover:opacity-85"
                  style={{
                    color:
                      selectedTag === tag
                        ? "var(--main-color)"
                        : "var(--sub-color)",
                    backgroundColor:
                      selectedTag === tag
                        ? "color-mix(in srgb, var(--main-color) 12%, transparent)"
                        : "var(--sub-alt-color)",
                    border: `1px solid ${selectedTag === tag ? "color-mix(in srgb, var(--main-color) 35%, transparent)" : "var(--border-color)"}`,
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            {/* Sort buttons */}
            <div
              className="flex items-center gap-1 p-1 rounded-lg"
              style={{
                backgroundColor: "var(--sub-alt-color)",
                border: "1px solid var(--border-color)",
              }}
            >
              {(["newest", "oldest", "title"] as SortKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => changeSort(key)}
                  className="px-3 py-1 rounded-md text-xs font-medium capitalize"
                  style={sortBtnStyle(sort === key)}
                >
                  {key === "newest"
                    ? "Newest"
                    : key === "oldest"
                      ? "Oldest"
                      : "A–Z"}
                </button>
              ))}
            </div>

            {/* Grid / List toggle */}
            <div
              className="flex items-center gap-1 p-1 rounded-lg"
              style={{
                backgroundColor: "var(--sub-alt-color)",
                border: "1px solid var(--border-color)",
              }}
            >
              <button
                type="button"
                onClick={() => changeView("grid")}
                className="h-7 w-7 flex items-center justify-center rounded-md"
                style={viewBtnStyle(view === "grid")}
                title="Grid view"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => changeView("list")}
                className="h-7 w-7 flex items-center justify-center rounded-md"
                style={viewBtnStyle(view === "list")}
                title="List view"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert
          variant="destructive"
          className="mb-6"
          style={{
            borderColor: "var(--error-color)",
            backgroundColor: "transparent",
          }}
        >
          <AlertCircle size={15} />
          <AlertDescription style={{ color: "var(--error-color)" }}>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div
          className={
            view === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              : "flex flex-col gap-2"
          }
        >
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton items are static
            <NoteCardSkeleton key={i} view={view} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && notes.length === 0 && !error && (
        <div
          className="rounded-xl flex flex-col items-center justify-center py-20 text-center"
          style={{ border: "1px dashed var(--border-color)" }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "var(--sub-alt-color)" }}
          >
            <FileText size={22} style={{ color: "var(--sub-color)" }} />
          </div>
          <p
            className="text-base font-medium mb-1"
            style={{ color: "var(--text-color)" }}
          >
            No notes yet
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--sub-color)" }}>
            Create your first note to get started
          </p>
          <Link href="/dashboard/create_note">
            <Button
              className="gap-2 font-semibold transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--main-color)",
                color: "var(--bg-color)",
                border: "none",
              }}
            >
              <Plus size={15} />
              Create note
            </Button>
          </Link>
        </div>
      )}

      {/* Empty filtered state */}
      {!loading && notes.length > 0 && sortedNotes.length === 0 && !error && (
        <div
          className="rounded-xl flex flex-col items-center justify-center py-16 text-center"
          style={{ border: "1px dashed var(--border-color)" }}
        >
          <p
            className="text-base font-medium mb-1"
            style={{ color: "var(--text-color)" }}
          >
            No notes for #{selectedTag}
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--sub-color)" }}>
            Try another tag or clear the tag filter.
          </p>
          <Button
            variant="ghost"
            onClick={() => setSelectedTag(null)}
            style={{ color: "var(--main-color)" }}
          >
            Clear filter
          </Button>
        </div>
      )}

      {/* Notes */}
      {!loading && notes.length > 0 && sortedNotes.length > 0 && (
        <div
          className={
            view === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              : "flex flex-col gap-2"
          }
        >
          {sortedNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              view={view}
              onDelete={handleDelete}
              onPin={handlePin}
            />
          ))}
        </div>
      )}

      <NoteSearchPalette
        open={searchOpen}
        notes={notes}
        onClose={() => setSearchOpen(false)}
      />
      <ConfirmDialog />
    </>
  );
}
