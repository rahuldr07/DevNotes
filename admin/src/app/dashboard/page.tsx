"use client";

import {
  AlertCircle,
  BookOpen,
  Edit3,
  FileText,
  LayoutGrid,
  List,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
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
import { QuickCapture } from "@/components/QuickCapture";
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
        className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition-all hover:-translate-y-0.5 hover:border-[var(--border)] hover:bg-[var(--bg-secondary)]/80 hover:shadow-lg hover:shadow-black/5 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
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
      className="group relative mb-4 break-inside-avoid cursor-pointer overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg)]/58 p-4 shadow-sm shadow-black/5 backdrop-blur transition-all hover:-translate-y-1 hover:bg-[var(--bg-secondary)]/70 hover:shadow-xl hover:shadow-black/10 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-0 transition-opacity group-hover:opacity-60" />
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
                  className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/70 px-2 py-0.5 text-[11px] text-[var(--accent)]"
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
      <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>{note.is_published ? "published" : "private"}</span>
        <span>{formatDate(note)}</span>
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
      note.tags.forEach((tag) => {
        tags.add(tag);
      });
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const cockpitStats = useMemo(
    () => [
      {
        label: "total notes",
        value: notes.length,
        hint: "captured knowledge",
      },
      {
        label: "published",
        value: notes.filter((note) => note.is_published).length,
        hint: "shareable pages",
      },
      {
        label: "snippets",
        value: notes.filter((note) => note.note_type === "snippet").length,
        hint: "copy-ready knowledge",
      },
      {
        label: "tags",
        value: availableTags.length,
        hint: "retrieval paths",
      },
    ],
    [availableTags.length, notes],
  );

  return (
    <>
      <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-secondary)]/55 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--accent)] opacity-[0.07] blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <div className="min-w-0">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)]/70 px-3 py-1 text-xs text-[var(--text-secondary)]">
              <Sparkles size={13} className="text-[var(--accent)]" />
              DevNotes Cockpit v1
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-5xl">
              Capture fast. Reuse smarter. Publish beautifully.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Your notes workspace is becoming a developer knowledge cockpit:
              private thinking, public writing, and AI-ready retrieval in one
              focused surface.
            </p>
            <QuickCapture
              onCreated={(note) => {
                setNotes((prev) => [note, ...prev]);
              }}
            />
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Link href="/dashboard/create_note">
                <Button className="gap-2 rounded-2xl bg-[var(--accent)] px-4 text-[var(--bg)] hover:bg-[var(--accent-hover)]">
                  <Plus size={15} />
                  create note
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/50 px-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => setSearchOpen(true)}
              >
                <Search size={15} />
                search workspace
                <kbd className="rounded-lg bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                  /
                </kbd>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {cockpitStats.map((stat) => (
              <div
                key={stat.label}
                className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg)]/65 p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:shadow-xl hover:shadow-black/10"
              >
                <div className="absolute right-3 top-3 h-8 w-8 rounded-full border border-[var(--border)] opacity-40 transition-transform group-hover:scale-125" />
                <p className="text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {loading ? "—" : stat.value}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  {stat.label}
                </p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {stat.hint}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-6 flex flex-col gap-5 rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg)]/55 p-4 backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <BookOpen size={14} className="text-[var(--accent)]" />
              library
            </div>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
              my notes
            </h2>
            {!loading && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Showing {sortedNotes.length} of {notes.length}{" "}
                {notes.length === 1 ? "note" : "notes"}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              className="gap-2 rounded-2xl px-3 text-xs text-[var(--text-secondary)]"
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
              className="h-9 rounded-2xl border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--text-secondary)] outline-none transition-colors hover:bg-[var(--bg-secondary)]"
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
                className="flex h-9 w-9 items-center justify-center rounded-2xl transition-colors hover:bg-[var(--bg-secondary)]"
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
                className="flex h-9 w-9 items-center justify-center rounded-2xl transition-colors hover:bg-[var(--bg-secondary)]"
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
              <Button className="gap-2 rounded-2xl bg-[var(--accent)] px-3 text-xs text-[var(--bg)] hover:bg-[var(--accent-hover)]">
                <Plus size={14} />
                new note
              </Button>
            </Link>
          </div>
        </div>

        {!loading && availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className="rounded-full border px-3 py-1.5 transition-all hover:-translate-y-0.5 hover:text-[var(--accent)]"
              style={{
                color:
                  selectedTag === null
                    ? "var(--accent)"
                    : "var(--text-secondary)",
                borderColor:
                  selectedTag === null ? "var(--accent)" : "var(--border)",
              }}
            >
              all
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className="rounded-full border px-3 py-1.5 transition-all hover:-translate-y-0.5 hover:text-[var(--accent)]"
                style={{
                  color:
                    selectedTag === tag
                      ? "var(--accent)"
                      : "var(--text-secondary)",
                  borderColor:
                    selectedTag === tag ? "var(--accent)" : "var(--border)",
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
          className="mb-6 flex items-center justify-between gap-4 rounded-3xl border-[var(--error)] bg-[var(--bg-secondary)]/45 p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle size={17} />
            <AlertDescription className="text-[var(--error)]">
              {error}
            </AlertDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={fetchFirstPage}
            className="gap-2 rounded-2xl border border-[var(--border)] text-xs text-[var(--text-secondary)]"
          >
            <RefreshCw size={13} /> retry
          </Button>
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
        <div className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-secondary)]/45 px-6 py-20 text-center shadow-xl shadow-black/5">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-3xl border border-[var(--border)] bg-[var(--bg)]/70 text-[var(--accent)]">
            <FileText size={28} />
          </div>
          <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            no notes yet
          </p>
          <p className="mx-auto mb-6 mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
            start with a blank page, then pin, tag, publish, and retrieve your
            thinking from one cockpit
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
