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
import { useRouter } from "next/navigation";
import {
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { getUserNotesPage } from "@/lib/note-api";
import { stripMarkdown } from "@/lib/notes";
import type { Note } from "@/types/notes";

type SortKey = "newest" | "oldest" | "title";
type ViewMode = "grid" | "list";

function formatDate(note: Note) {
  return new Date(note.updated_at ?? note.created_at).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
}

function appendUniqueNotes(current: Note[], incoming: Note[]) {
  const seen = new Set(current.map((note) => note.id));
  return [...current, ...incoming.filter((note) => !seen.has(note.id))];
}

function NoteCardSkeleton({ view }: { view: ViewMode }) {
  if (view === "list") {
    return (
      <div className="flex items-center gap-4 px-2 py-3">
        <Skeleton className="h-4 w-1/4 bg-[var(--bg-secondary)]" />
        <Skeleton className="h-3 flex-1 bg-[var(--bg-secondary)]" />
        <Skeleton className="h-3 w-24 bg-[var(--bg-secondary)]" />
      </div>
    );
  }

  return (
    <div className="mb-4 break-inside-avoid space-y-3 rounded-md bg-[var(--bg-secondary)] p-4">
      <Skeleton className="h-5 w-3/4 bg-[var(--border)]" />
      <Skeleton className="h-3 w-full bg-[var(--border)]" />
      <Skeleton className="h-3 w-5/6 bg-[var(--border)]" />
      <Skeleton className="h-3 w-24 bg-[var(--border)]" />
    </div>
  );
}

function GhostActions({
  note,
  onDelete,
  onPin,
}: {
  note: Note;
  onDelete: (id: number) => void;
  onPin: (id: number) => void;
}) {
  const router = useRouter();
  const iconClass =
    "flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text-primary)]";

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={iconClass}
            onClick={(event) => {
              event.stopPropagation();
              onPin(note.id);
            }}
            aria-label={note.is_pinned ? "Unpin note" : "Pin note"}
          >
            {note.is_pinned ? <PinOff size={14} /> : <Pin size={14} />}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{note.is_pinned ? "Unpin" : "Pin note"}</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={iconClass}
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/dashboard/edit_note?id=${note.id}`);
            }}
            aria-label="Edit note"
          >
            <Edit3 size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Edit note</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`${iconClass} hover:text-[var(--error)]`}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(note.id);
            }}
            aria-label="Delete note"
          >
            <Trash2 size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete note</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function NoteCard({
  note,
  view,
  onDelete,
  onPin,
  observeRef,
}: {
  note: Note;
  view: ViewMode;
  onDelete: (id: number) => void;
  onPin: (id: number) => void;
  observeRef?: Ref<HTMLElement>;
}) {
  const router = useRouter();
  const [showActions, setShowActions] = useState(false);
  const plain = stripMarkdown(note.content);
  const preview = plain.length > 150 ? `${plain.slice(0, 150)}...` : plain;

  const openNote = () => router.push(`/dashboard/edit_note?id=${note.id}`);

  const interactiveProps = {
    role: "link",
    tabIndex: 0,
    onClick: openNote,
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openNote();
      }
    },
    onContextMenu: (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      setShowActions(true);
    },
    onMouseEnter: () => setShowActions(true),
    onMouseLeave: () => setShowActions(false),
  };

  if (view === "list") {
    return (
      <article
        ref={observeRef}
        {...interactiveProps}
        className="group flex cursor-pointer items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{
            backgroundColor: note.is_pinned ? "var(--accent)" : "transparent",
          }}
        />
        <h2 className="min-w-0 max-w-[220px] flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
          {note.title || "untitled"}
        </h2>
        <p className="hidden min-w-0 flex-[2] truncate text-xs text-[var(--text-secondary)] md:block">
          {preview || "empty note"}
        </p>
        <span className="hidden shrink-0 text-xs text-[var(--text-secondary)] sm:inline">
          {formatDate(note)}
        </span>
        <div
          className={`shrink-0 transition-opacity ${
            showActions ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <GhostActions note={note} onDelete={onDelete} onPin={onPin} />
        </div>
      </article>
    );
  }

  return (
    <article
      ref={observeRef}
      {...interactiveProps}
      className="group relative mb-4 break-inside-avoid cursor-pointer rounded-md p-4 transition-colors hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            {note.is_pinned && (
              <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            )}
            <h2 className="line-clamp-2 text-base font-medium leading-snug text-[var(--text-primary)]">
              {note.title || "untitled"}
            </h2>
          </div>
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {note.tags.slice(0, 4).map((tag) => (
                <span
                  key={`${note.id}-${tag}`}
                  className="text-[11px] text-[var(--accent)]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div
          className={`shrink-0 transition-opacity ${
            showActions ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <GhostActions note={note} onDelete={onDelete} onPin={onPin} />
        </div>
      </div>

      <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-[var(--text-secondary)]">
        {preview || "empty note"}
      </p>
      <div className="mt-4 flex justify-end text-xs text-[var(--text-secondary)]">
        {formatDate(note)}
      </div>
    </article>
  );
}

export default function DashboardPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>("grid");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    const savedSort = localStorage.getItem("devnotes-sort") as SortKey | null;
    const savedView = localStorage.getItem("devnotes-view") as ViewMode | null;
    if (savedSort) setSort(savedSort);
    if (savedView) setView(savedView);
  }, []);

  const changeSort = (value: SortKey) => {
    setSort(value);
    localStorage.setItem("devnotes-sort", value);
  };

  const changeView = (value: ViewMode) => {
    setView(value);
    localStorage.setItem("devnotes-view", value);
  };

  const fetchFirstPage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const page = await getUserNotesPage({ limit: 20 });
      setNotes(page.items);
      setNextCursor(page.next_cursor);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load notes";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  const fetchNextPage = useCallback(async () => {
    if (loading || loadingMore || nextCursor === null) return;

    try {
      setLoadingMore(true);
      const page = await getUserNotesPage({ limit: 20, cursor: nextCursor });
      setNotes((prev) => appendUniqueNotes(prev, page.items));
      setNextCursor(page.next_cursor);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load more notes";
      setError(message);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, nextCursor]);

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

  useEffect(() => {
    const onGlobalShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      const inInput =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (!inInput && event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === "Escape") {
        setSearchOpen(false);
      }
    };

    window.addEventListener("keydown", onGlobalShortcut);
    return () => window.removeEventListener("keydown", onGlobalShortcut);
  }, []);

  const handleDelete = async (id: number) => {
    const note = notes.find((item) => item.id === id);
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
      setNotes((prev) => prev.filter((item) => item.id !== id));
      gooeyToast.success("Note deleted");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not delete the note.";
      gooeyToast.error("Delete failed", { description: message });
    }
  };

  const handlePin = useCallback(async (id: number) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, is_pinned: !note.is_pinned } : note,
      ),
    );

    try {
      await api.patch(`/notes/${id}/pin`, {});
    } catch (err: unknown) {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id ? { ...note, is_pinned: !note.is_pinned } : note,
        ),
      );
      const message = err instanceof Error ? err.message : "Could not pin note";
      gooeyToast.error(message);
    }
  }, []);

  const sortedNotes = useMemo(() => {
    const sorted = [...notes].sort((a, b) => {
      if (sort === "newest") {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      if (sort === "oldest") {
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      return (a.title || "").localeCompare(b.title || "");
    });

    const pinnedFirst = [
      ...sorted.filter((note) => note.is_pinned),
      ...sorted.filter((note) => !note.is_pinned),
    ];

    if (!selectedTag) return pinnedFirst;
    return pinnedFirst.filter((note) => note.tags.includes(selectedTag));
  }, [notes, selectedTag, sort]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  return (
    <>
      <div className="mb-8 flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-normal text-[var(--text-primary)]">
              my notes
            </h1>
            {!loading && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              className="gap-2 px-2 text-xs text-[var(--text-secondary)]"
              onClick={() => setSearchOpen(true)}
            >
              <Search size={14} />
              search
              <kbd className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                /
              </kbd>
            </Button>
            <select
              value={sort}
              onChange={(event) => changeSort(event.target.value as SortKey)}
              className="h-8 rounded-md border-none bg-[var(--bg)] px-2 text-xs text-[var(--text-secondary)] outline-none transition-colors hover:bg-[var(--bg-secondary)]"
              aria-label="Sort notes"
            >
              <option value="newest">newest</option>
              <option value="oldest">oldest</option>
              <option value="title">a-z</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => changeView("grid")}
                className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-secondary)]"
                style={{
                  color:
                    view === "grid" ? "var(--accent)" : "var(--text-secondary)",
                }}
                aria-label="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => changeView("list")}
                className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--bg-secondary)]"
                style={{
                  color:
                    view === "list" ? "var(--accent)" : "var(--text-secondary)",
                }}
                aria-label="List view"
              >
                <List size={15} />
              </button>
            </div>
            <Link href="/dashboard/create_note">
              <Button className="gap-2 bg-[var(--accent)] px-3 text-xs text-[var(--bg)] hover:bg-[var(--accent-hover)]">
                <Plus size={14} />
                new note
              </Button>
            </Link>
          </div>
        </div>

        {!loading && availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className="transition-colors hover:text-[var(--accent)]"
              style={{
                color:
                  selectedTag === null
                    ? "var(--accent)"
                    : "var(--text-secondary)",
              }}
            >
              all
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className="transition-colors hover:text-[var(--accent)]"
                style={{
                  color:
                    selectedTag === tag
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <Alert
          variant="destructive"
          className="mb-6 border-[var(--error)] bg-transparent"
        >
          <AlertCircle size={15} />
          <AlertDescription className="text-[var(--error)]">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {loading && (
        <div
          className={
            view === "grid"
              ? "columns-1 gap-4 md:columns-2 lg:columns-3"
              : "space-y-1"
          }
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <NoteCardSkeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: stable skeleton count
              key={index}
              view={view}
            />
          ))}
        </div>
      )}

      {!loading && notes.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText size={28} className="mb-4 text-[var(--text-secondary)]" />
          <p className="text-base font-medium text-[var(--text-primary)]">
            no notes yet
          </p>
          <p className="mb-6 mt-2 text-sm text-[var(--text-secondary)]">
            start with a blank page
          </p>
          <Link href="/dashboard/create_note">
            <Button className="gap-2 bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)]">
              <Plus size={14} />
              new note
            </Button>
          </Link>
        </div>
      )}

      {!loading && notes.length > 0 && sortedNotes.length === 0 && !error && (
        <div className="py-16 text-center">
          <p className="text-base font-medium text-[var(--text-primary)]">
            no notes for #{selectedTag}
          </p>
          <Button
            variant="ghost"
            onClick={() => setSelectedTag(null)}
            className="mt-3 text-[var(--accent)]"
          >
            clear filter
          </Button>
        </div>
      )}

      {!loading && sortedNotes.length > 0 && (
        <div
          className={
            view === "grid"
              ? "columns-1 gap-4 md:columns-2 lg:columns-3"
              : "space-y-1"
          }
        >
          {sortedNotes.map((note, index) => (
            <NoteCard
              key={note.id}
              note={note}
              view={view}
              onDelete={handleDelete}
              onPin={handlePin}
              observeRef={
                index === sortedNotes.length - 1 ? lastNoteRef : undefined
              }
            />
          ))}
        </div>
      )}

      {!loading && notes.length > 0 && (
        <div className="py-8 text-center text-xs text-[var(--text-secondary)]">
          {loadingMore
            ? "loading..."
            : nextCursor === null
              ? "you've reached the end"
              : ""}
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
