"use client";

import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Clock3,
  Code2,
  Edit3,
  Eye,
  FileText,
  Globe2,
  LayoutGrid,
  List,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Ref, useCallback, useEffect, useMemo, useState } from "react";
import { KnowledgeHeatmap } from "@/components/KnowledgeHeatmap";
import { AnimatedNumber, Reveal } from "@/components/motion";
import { QuickCapture } from "@/components/QuickCapture";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { Kbd } from "@/components/ui/kbd";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useConfirm } from "@/hooks/useConfirm";
import { useInfiniteNotes } from "@/hooks/useInfiniteNotes";
import { normalizeErrorMessage } from "@/lib/errors";
import { formatNoteDate } from "@/lib/format";
import { deleteNote, getUserNotesPage, togglePin } from "@/lib/note-api";
import { previewText, stripMarkdown } from "@/lib/notes";
import { readingTimeMinutes } from "@/lib/reading";
import type { Note } from "@/types/notes";

type SortKey = "updated" | "newest" | "oldest" | "reading" | "title";
type ViewMode = "grid" | "list" | "compact";
type LibraryFilter =
  | "all"
  | "pinned"
  | "private"
  | "public"
  | "snippets"
  | "drafts";

function getNoteTimestamp(note: Note, field: "created" | "updated") {
  const value =
    field === "updated"
      ? (note.updated_at ?? note.created_at)
      : note.created_at;
  return new Date(value).getTime();
}

function getReadingMinutes(note: Note) {
  return readingTimeMinutes(note.content);
}

function getNoteKind(note: Note) {
  return note.note_type ?? "note";
}

function noteMatchesLibraryFilter(note: Note, filter: LibraryFilter) {
  if (filter === "all") return true;
  if (filter === "pinned") return Boolean(note.is_pinned);
  if (filter === "private") return !note.is_published;
  if (filter === "public") return Boolean(note.is_published);
  if (filter === "snippets") return note.note_type === "snippet";
  if (filter === "drafts") {
    const plainLength = stripMarkdown(note.content).length;
    return !note.is_published && (plainLength < 240 || note.tags.length === 0);
  }
  return true;
}

function fetchNotesPage(cursor: number | null) {
  return getUserNotesPage({ limit: 20, cursor });
}

function NoteCardSkeleton({ view }: { view: ViewMode }) {
  if (view === "compact") {
    return (
      <div className="grid grid-cols-[1rem_minmax(0,1fr)_5rem_6rem] items-center gap-3 border-b border-[var(--border)] px-3 py-2">
        <Skeleton className="h-2 w-2 bg-[var(--bg-secondary)]" />
        <Skeleton className="h-3 w-2/3 bg-[var(--bg-secondary)]" />
        <Skeleton className="h-3 w-full bg-[var(--bg-secondary)]" />
        <Skeleton className="h-3 w-full bg-[var(--bg-secondary)]" />
      </div>
    );
  }

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
    <div className="mb-4 break-inside-avoid space-y-3 rounded-none bg-[var(--bg-secondary)] p-4">
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
    "flex h-7 w-7 items-center justify-center rounded-none text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text-primary)]";

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
  onSelect,
  observeRef,
}: {
  note: Note;
  view: ViewMode;
  onDelete: (id: number) => void;
  onPin: (id: number) => void;
  onSelect?: (id: number) => void;
  observeRef?: Ref<HTMLElement>;
}) {
  const router = useRouter();
  const [showActions, setShowActions] = useState(false);
  const plain = previewText(note.content);
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
      onSelect?.(note.id);
      setShowActions(true);
    },
    onMouseEnter: () => {
      onSelect?.(note.id);
      setShowActions(true);
    },
    onFocus: () => onSelect?.(note.id),
    onMouseLeave: () => setShowActions(false),
  };

  if (view === "compact") {
    return (
      <article
        ref={observeRef}
        {...interactiveProps}
        className="group grid cursor-pointer grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--border)] px-3 py-2 transition-colors hover:bg-[var(--bg-secondary)]/72 focus:outline-none focus:ring-1 focus:ring-[var(--accent)] md:grid-cols-[1rem_minmax(0,1fr)_5rem_6.5rem_auto]"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-none"
          style={{
            backgroundColor: note.is_pinned ? "var(--accent)" : "var(--border)",
          }}
        />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-sm font-medium text-[var(--text-primary)]">
              {note.title || "untitled"}
            </h2>
            <span className="hidden shrink-0 rounded-none border border-[var(--border)] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] sm:inline">
              {getNoteKind(note)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] leading-4 text-[var(--text-secondary)]">
            {preview || "empty note"}
          </p>
        </div>
        <span className="hidden font-mono text-[11px] text-[var(--text-secondary)] md:inline">
          {getReadingMinutes(note)}m
        </span>
        <span className="hidden text-[11px] text-[var(--text-secondary)] md:inline">
          {formatNoteDate(note)}
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

  if (view === "list") {
    return (
      <article
        ref={observeRef}
        {...interactiveProps}
        className="group flex cursor-pointer items-center gap-3 rounded-none border border-transparent px-3 py-3 transition-colors hover:border-[var(--border)] hover:bg-[var(--bg-secondary)]/80 hover:shadow-lg hover:shadow-black/5 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-none"
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
          {formatNoteDate(note)}
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
      className="group relative mb-4 break-inside-avoid cursor-pointer overflow-hidden rounded-none border border-[var(--border)] bg-[var(--bg)]/58 p-4 shadow-sm shadow-black/5 backdrop-blur transition-colors hover:-translate-y-1 hover:bg-[var(--bg-secondary)]/70 hover:shadow-sm hover:shadow-black/10 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-0 transition-opacity group-hover:opacity-60" />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            {note.is_pinned && (
              <span className="h-2 w-2 rounded-none bg-[var(--accent)]" />
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
                  className="rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/70 px-2 py-0.5 text-[11px] text-[var(--accent)]"
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
        <span>{formatNoteDate(note)}</span>
      </div>
    </article>
  );
}

function notePreview(note: Note, length = 92) {
  const plain = previewText(note.content).trim();
  if (!plain) return "empty note";
  return plain.length > length ? `${plain.slice(0, length)}...` : plain;
}

function WorkspaceNoteRow({
  note,
  eyebrow,
  icon,
}: {
  note: Note;
  eyebrow: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={`/dashboard/edit_note?id=${note.id}`}
      className="group flex gap-3 rounded-none border border-transparent p-3 transition-colors hover:border-[var(--border)] hover:bg-[var(--bg)]/70"
    >
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/70 text-[var(--accent)]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {eyebrow}
          <ArrowRight
            size={12}
            className="opacity-0 transition-colors group-hover:translate-x-0.5 group-hover:opacity-100"
          />
        </span>
        <span className="mt-1 block truncate text-sm font-semibold text-[var(--text-primary)]">
          {note.title || "untitled"}
        </span>
        <span className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
          {notePreview(note)}
        </span>
      </span>
    </Link>
  );
}

function WorkspacePanel({
  title,
  subtitle,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  subtitle: string;
  actionHref?: string;
  actionLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="dev-panel overflow-hidden">
      <div className="dev-panel-header flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <h3 className="type-panel-title text-sm text-[var(--text-primary)]">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {subtitle}
          </p>
        </div>
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="dev-chip px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)] transition-colors hover:bg-[var(--bg)]"
          >
            {actionLabel}
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SelectedNotePreview({ note }: { note: Note | null }) {
  if (!note) {
    return (
      <aside className="sticky top-20 hidden self-start border border-dashed border-[var(--border)] bg-[var(--bg)]/45 p-4 text-sm text-[var(--text-secondary)] backdrop-blur-xl xl:block">
        <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-none border border-[var(--border)] text-[var(--accent)]">
          <Eye size={18} />
        </div>
        <p className="font-semibold text-[var(--text-primary)]">preview rail</p>
        <p className="mt-2 leading-6">
          Select a note from the library to inspect metadata, tags, reading
          time, and publish status before opening the editor.
        </p>
      </aside>
    );
  }

  return (
    <aside className="sticky top-20 hidden self-start overflow-hidden border border-[var(--border)] bg-[var(--bg-secondary)]/55 shadow-md shadow-black/5 backdrop-blur-xl xl:block">
      <div className="border-b border-[var(--border)] p-5">
        <div className="mb-3 flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-2">
            <Eye size={13} className="text-[var(--accent)]" /> selected note
          </span>
          <span>{getNoteKind(note)}</span>
        </div>
        <h3 className="line-clamp-3 text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
          {note.title || "untitled"}
        </h3>
        <p className="mt-3 line-clamp-5 text-sm leading-6 text-[var(--text-secondary)]">
          {notePreview(note, 320)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 text-xs">
        <div className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 p-3">
          <p className="text-[var(--text-secondary)]">reading</p>
          <p className="mt-1 font-semibold text-[var(--text-primary)]">
            {getReadingMinutes(note)} min
          </p>
        </div>
        <div className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 p-3">
          <p className="text-[var(--text-secondary)]">visibility</p>
          <p className="mt-1 font-semibold text-[var(--text-primary)]">
            {note.is_published ? "public" : "private"}
          </p>
        </div>
        <div className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 p-3">
          <p className="text-[var(--text-secondary)]">updated</p>
          <p className="mt-1 font-semibold text-[var(--text-primary)]">
            {formatNoteDate(note)}
          </p>
        </div>
        <div className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 p-3">
          <p className="text-[var(--text-secondary)]">tags</p>
          <p className="mt-1 font-semibold text-[var(--text-primary)]">
            {note.tags.length}
          </p>
        </div>
      </div>

      {note.tags.length > 0 && (
        <div className="border-t border-[var(--border)] px-5 py-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            <Tags size={12} className="text-[var(--accent)]" /> retrieval tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {note.tags.slice(0, 8).map((tag) => (
              <span
                key={`${note.id}-preview-${tag}`}
                className="rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-2 py-1 text-[11px] text-[var(--accent)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-[var(--border)] p-5">
        <Link href={`/dashboard/edit_note?id=${note.id}`}>
          <Button className="w-full justify-center gap-2 rounded-none bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)]">
            open editor <ArrowRight size={14} />
          </Button>
        </Link>
      </div>
    </aside>
  );
}

export default function DashboardPage() {
  const {
    notes,
    setNotes,
    loading,
    loadingMore,
    nextCursor,
    error,
    lastNoteRef,
    refetch,
  } = useInfiniteNotes(fetchNotesPage);
  const [sort, setSort] = useState<SortKey>("updated");
  const [view, setView] = useState<ViewMode>("grid");
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    const savedSort = localStorage.getItem("devnotes-sort") as SortKey | null;
    const savedView = localStorage.getItem("devnotes-view") as ViewMode | null;
    if (savedSort) setSort(savedSort);
    if (
      savedView === "grid" ||
      savedView === "list" ||
      savedView === "compact"
    ) {
      setView(savedView);
    }
  }, []);

  const changeSort = (value: SortKey) => {
    setSort(value);
    localStorage.setItem("devnotes-sort", value);
  };

  const changeView = (value: ViewMode) => {
    setView(value);
    localStorage.setItem("devnotes-view", value);
  };

  const openWorkspaceSearch = () => {
    window.dispatchEvent(new Event("devnotes:open-search"));
  };

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
      await deleteNote(id);
      setNotes((prev) => prev.filter((item) => item.id !== id));
      gooeyToast.success("Note deleted");
    } catch (err: unknown) {
      gooeyToast.error("Delete failed", {
        description: normalizeErrorMessage(err, "Could not delete the note."),
      });
    }
  };

  const handlePin = useCallback(
    async (id: number) => {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id ? { ...note, is_pinned: !note.is_pinned } : note,
        ),
      );

      try {
        await togglePin(id);
      } catch (err: unknown) {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === id ? { ...note, is_pinned: !note.is_pinned } : note,
          ),
        );
        gooeyToast.error("Pin failed", {
          description: normalizeErrorMessage(err, "Could not pin the note."),
        });
      }
    },
    [setNotes],
  );

  const sortedNotes = useMemo(() => {
    const sorted = [...notes].sort((a, b) => {
      if (sort === "updated") {
        return getNoteTimestamp(b, "updated") - getNoteTimestamp(a, "updated");
      }
      if (sort === "newest") {
        return getNoteTimestamp(b, "created") - getNoteTimestamp(a, "created");
      }
      if (sort === "oldest") {
        return getNoteTimestamp(a, "created") - getNoteTimestamp(b, "created");
      }
      if (sort === "reading") {
        return getReadingMinutes(b) - getReadingMinutes(a);
      }
      return (a.title || "").localeCompare(b.title || "");
    });

    const pinnedFirst = [
      ...sorted.filter((note) => note.is_pinned),
      ...sorted.filter((note) => !note.is_pinned),
    ];

    return pinnedFirst.filter(
      (note) =>
        noteMatchesLibraryFilter(note, libraryFilter) &&
        (!selectedTag || note.tags.includes(selectedTag)),
    );
  }, [libraryFilter, notes, selectedTag, sort]);

  const selectedNote = useMemo(() => {
    if (sortedNotes.length === 0) return null;
    return (
      sortedNotes.find((note) => note.id === selectedNoteId) ?? sortedNotes[0]
    );
  }, [selectedNoteId, sortedNotes]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        tags.add(tag);
      });
    });
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const libraryFilters = useMemo(
    () => [
      { key: "all" as const, label: "all", count: notes.length },
      {
        key: "pinned" as const,
        label: "pinned",
        count: notes.filter((note) => note.is_pinned).length,
      },
      {
        key: "private" as const,
        label: "private",
        count: notes.filter((note) => !note.is_published).length,
      },
      {
        key: "public" as const,
        label: "public",
        count: notes.filter((note) => note.is_published).length,
      },
      {
        key: "snippets" as const,
        label: "snippets",
        count: notes.filter((note) => note.note_type === "snippet").length,
      },
      {
        key: "drafts" as const,
        label: "drafts",
        count: notes.filter((note) => noteMatchesLibraryFilter(note, "drafts"))
          .length,
      },
    ],
    [notes],
  );

  const workspaceStats = useMemo(
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

  const workspaceInsights = useMemo(() => {
    const byUpdated = [...notes].sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() -
        new Date(a.updated_at ?? a.created_at).getTime(),
    );
    const publishCandidates = byUpdated.filter(
      (note) =>
        !note.is_published &&
        (stripMarkdown(note.content).length > 240 || note.tags.length >= 2),
    );
    const snippets = byUpdated.filter((note) => note.note_type === "snippet");

    return {
      pinned: byUpdated.filter((note) => note.is_pinned).slice(0, 3),
      recent: byUpdated.slice(0, 3),
      publishCandidates: publishCandidates.slice(0, 3),
      snippets: snippets.slice(0, 3),
      privateCount: notes.filter((note) => !note.is_published).length,
      guideCount: notes.filter((note) => note.note_type === "guide").length,
    };
  }, [notes]);

  return (
    <>
      <Reveal>
        <section className="dev-panel mb-5 overflow-hidden">
          <div className="dev-panel-header flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-none bg-[var(--accent)]" />
              <p className="type-eyebrow text-[var(--accent)]">Workspace</p>
              <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                /devnotes/main
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
              <span className="dev-chip px-2 py-1">{notes.length} files</span>
              <span className="dev-chip px-2 py-1">
                {availableTags.length} tags
              </span>
            </div>
          </div>

          <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
            <div className="min-w-0">
              <div className="mb-3 border-l-2 border-[var(--accent)] pl-3">
                <p className="font-mono text-xs text-[var(--text-secondary)]">
                  ~/workspace $ capture --fast --reuse --publish
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                  Build a searchable developer memory from notes, snippets, and
                  public writeups.
                </p>
              </div>
              <QuickCapture
                onCreated={(note) => {
                  setNotes((prev) => [note, ...prev]);
                }}
              />
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Link href="/dashboard/create_note">
                  <Button className="gap-2 rounded-none bg-[var(--accent)] px-4 text-[var(--bg)] hover:bg-[var(--accent-hover)]">
                    <Plus size={15} />
                    create note
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="gap-2 rounded-none border border-[var(--border)] bg-[var(--bg)]/50 px-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  onClick={openWorkspaceSearch}
                >
                  <Search size={15} />
                  search
                  <Kbd>/</Kbd>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {workspaceStats.map((stat) => (
                <StatTile
                  key={stat.label}
                  value={loading ? "—" : <AnimatedNumber value={stat.value} />}
                  label={stat.label}
                  sublabel={stat.hint}
                  className="transition-colors hover:bg-[var(--bg-secondary)]/55"
                />
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      {!loading && notes.length > 0 && (
        <Reveal delay={0.06}>
          <KnowledgeHeatmap />
        </Reveal>
      )}

      {!loading && notes.length > 0 && (
        <section className="mb-8 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <WorkspacePanel
            title="today's workspace"
            subtitle="Active context, publish queue, and recent edits."
            actionHref="/dashboard/create_note"
            actionLabel="capture"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="border border-[var(--border)] bg-[var(--bg-secondary)]/45 p-4">
                <p className="type-number text-3xl text-[var(--text-primary)]">
                  {workspaceInsights.privateCount}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  private drafts
                </p>
                <div className="mt-4 grid grid-cols-6 gap-1">
                  {[0, 1, 2, 3, 4, 5].map((cell) => (
                    <span
                      key={cell}
                      className={`h-1.5 ${cell < 4 ? "bg-[var(--accent)]/70" : "bg-[var(--border)]/60"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="border border-[var(--border)] bg-[var(--bg-secondary)]/45 p-4">
                <p className="type-number text-3xl text-[var(--text-primary)]">
                  {workspaceInsights.publishCandidates.length}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  publish-ready
                </p>
                <div className="mt-4 flex gap-1">
                  {[0, 1, 2, 3].map((step) => (
                    <span
                      key={step}
                      className={`h-1.5 flex-1 ${
                        step < workspaceInsights.publishCandidates.length
                          ? "bg-[var(--accent)]/70"
                          : "bg-[var(--border)]/60"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="border border-[var(--border)] bg-[var(--bg-secondary)]/45 p-4">
                <p className="type-number text-3xl text-[var(--text-primary)]">
                  {workspaceInsights.guideCount}
                </p>
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  guides
                </p>
                <div className="mt-4 grid grid-cols-5 gap-1">
                  {[0, 1, 2, 3, 4].map((bar) => (
                    <span
                      key={bar}
                      className="bg-[var(--accent)]/60"
                      style={{
                        height: `${8 + bar * 3}px`,
                        opacity: 0.35 + bar * 0.12,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {workspaceInsights.recent.slice(0, 2).map((note) => (
                <WorkspaceNoteRow
                  key={`recent-${note.id}`}
                  note={note}
                  eyebrow="recently touched"
                  icon={<Clock3 size={15} />}
                />
              ))}
            </div>
          </WorkspacePanel>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <WorkspacePanel
              title="priority pins"
              subtitle="Pinned near your writing surface."
            >
              <div className="space-y-1">
                {workspaceInsights.pinned.length > 0 ? (
                  workspaceInsights.pinned.map((note) => (
                    <WorkspaceNoteRow
                      key={`pin-${note.id}`}
                      note={note}
                      eyebrow="pinned context"
                      icon={<Pin size={15} />}
                    />
                  ))
                ) : (
                  <p className="rounded-none border border-dashed border-[var(--border)] p-4 text-xs leading-5 text-[var(--text-secondary)]">
                    Pin notes from the library to build your active workspace.
                  </p>
                )}
              </div>
            </WorkspacePanel>

            <WorkspacePanel
              title="reuse queue"
              subtitle="Snippets and candidates ready to move."
              actionHref="/dashboard/snippets"
              actionLabel="snippets"
            >
              <div className="space-y-1">
                {[
                  ...workspaceInsights.snippets,
                  ...workspaceInsights.publishCandidates,
                ]
                  .slice(0, 3)
                  .map((note) => (
                    <WorkspaceNoteRow
                      key={`reuse-${note.id}`}
                      note={note}
                      eyebrow={
                        note.note_type === "snippet"
                          ? "snippet"
                          : "publish candidate"
                      }
                      icon={
                        note.note_type === "snippet" ? (
                          <Code2 size={15} />
                        ) : (
                          <Globe2 size={15} />
                        )
                      }
                    />
                  ))}
                {workspaceInsights.snippets.length === 0 &&
                  workspaceInsights.publishCandidates.length === 0 && (
                    <p className="rounded-none border border-dashed border-[var(--border)] p-4 text-xs leading-5 text-[var(--text-secondary)]">
                      Add a snippet or tag a longer note to make the reuse queue
                      useful.
                    </p>
                  )}
              </div>
            </WorkspacePanel>
          </div>
        </section>
      )}

      <div className="mb-6 flex flex-col gap-4 rounded-none border border-[var(--border)] bg-[var(--bg)]/55 p-4 backdrop-blur-xl sm:p-5">
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
              className="gap-2 rounded-none px-3 text-xs text-[var(--text-secondary)]"
              onClick={openWorkspaceSearch}
            >
              <Search size={14} />
              search
              <Kbd>/</Kbd>
            </Button>
            <Select
              value={sort}
              onChange={(event) => changeSort(event.target.value as SortKey)}
              aria-label="Sort notes"
            >
              <option value="updated">updated</option>
              <option value="newest">created</option>
              <option value="oldest">oldest</option>
              <option value="reading">reading</option>
              <option value="title">a-z</option>
            </Select>
            <Segmented
              options={[
                {
                  value: "grid",
                  label: "Grid view",
                  icon: <LayoutGrid size={15} />,
                  iconOnly: true,
                },
                {
                  value: "list",
                  label: "List view",
                  icon: <List size={15} />,
                  iconOnly: true,
                },
                {
                  value: "compact",
                  label: "Compact view",
                  icon: <FileText size={15} />,
                  iconOnly: true,
                },
              ]}
              value={view}
              onChange={changeView}
            />
            <Link href="/dashboard/create_note">
              <Button className="gap-2 rounded-none bg-[var(--accent)] px-3 text-xs text-[var(--bg)] hover:bg-[var(--accent-hover)]">
                <Plus size={14} />
                new note
              </Button>
            </Link>
          </div>
        </div>

        {!loading && notes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {libraryFilters.map((filter) => (
              <Chip
                key={filter.key}
                active={libraryFilter === filter.key}
                count={filter.count}
                onClick={() => {
                  setLibraryFilter(filter.key);
                  setSelectedNoteId(null);
                }}
              >
                {filter.label}
              </Chip>
            ))}
          </div>
        )}

        {!loading && availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Chip
              active={selectedTag === null}
              onClick={() => setSelectedTag(null)}
            >
              all
            </Chip>
            {availableTags.map((tag) => (
              <Chip
                key={tag}
                active={selectedTag === tag}
                onClick={() => setSelectedTag(tag)}
              >
                #{tag}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {error && (
        <Alert
          variant="destructive"
          className="mb-6 flex items-center justify-between gap-4 rounded-none border-[var(--error)] bg-[var(--bg-secondary)]/45 p-4"
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
            onClick={refetch}
            className="gap-2 rounded-none border border-[var(--border)] text-xs text-[var(--text-secondary)]"
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
              : view === "compact"
                ? "overflow-hidden border border-[var(--border)] bg-[var(--bg)]/45"
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
        <EmptyState
          icon={<FileText size={28} />}
          title="no notes yet"
          description="start with a blank page, then pin, tag, publish, and retrieve your thinking from one workspace"
          action={
            <Link href="/dashboard/create_note">
              <Button className="gap-2 bg-[var(--accent)] text-[var(--bg)] hover:bg-[var(--accent-hover)]">
                <Plus size={14} />
                new note
              </Button>
            </Link>
          }
        />
      )}

      {!loading && notes.length > 0 && sortedNotes.length === 0 && !error && (
        <div className="py-16 text-center">
          <p className="text-base font-medium text-[var(--text-primary)]">
            no notes match this library view
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--text-secondary)]">
            Try another status filter or clear the tag filter to widen the
            library view.
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              setSelectedTag(null);
              setLibraryFilter("all");
            }}
            className="mt-3 text-[var(--accent)]"
          >
            clear filters
          </Button>
        </div>
      )}

      {!loading && sortedNotes.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div
            className={
              view === "grid"
                ? "columns-1 gap-4 md:columns-2 2xl:columns-3"
                : view === "compact"
                  ? "overflow-hidden border border-[var(--border)] bg-[var(--bg)]/45"
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
                onSelect={setSelectedNoteId}
                observeRef={
                  index === sortedNotes.length - 1 ? lastNoteRef : undefined
                }
              />
            ))}
          </div>
          <SelectedNotePreview note={selectedNote} />
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

      <ConfirmDialog />
    </>
  );
}
