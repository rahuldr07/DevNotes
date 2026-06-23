"use client";

import {
  AlertCircle,
  Eye,
  Heart,
  LayoutGrid,
  List,
  Search,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { getCommunityNotesPage, likeNote } from "@/lib/note-api";
import { stripMarkdown } from "@/lib/notes";
import type { Note } from "@/types/notes";

type SortKey = "trending" | "recent";
type ViewMode = "grid" | "list";

function appendUniqueNotes(current: Note[], incoming: Note[]) {
  const seen = new Set(current.map((note) => note.id));
  return [...current, ...incoming.filter((note) => !seen.has(note.id))];
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function authorName(note: Note) {
  return note.author_name || note.author_username || "anonymous";
}

function metricValue(note: Note) {
  return (note.like_count ?? 0) * 3 + (note.view_count ?? 0);
}

function ExploreSkeleton({ view }: { view: ViewMode }) {
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
      <Skeleton className="h-3 w-28 bg-[var(--border)]" />
    </div>
  );
}

function ExploreNote({
  note,
  view,
  onLike,
  observeRef,
}: {
  note: Note;
  view: ViewMode;
  onLike: (id: number) => void;
  observeRef?: Ref<HTMLElement>;
}) {
  const router = useRouter();
  const preview = stripMarkdown(note.content);
  const openNote = () => {
    if (note.share_uuid) router.push(`/s/${note.share_uuid}`);
  };
  const author = authorName(note);
  const articleClass = note.share_uuid ? "cursor-pointer" : "cursor-default";

  const likeButton = (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onLike(note.id);
      }}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
      aria-label={note.liked_by_me ? "Unlike note" : "Like note"}
    >
      <Heart
        size={13}
        className={
          note.liked_by_me
            ? "fill-[var(--accent)] text-[var(--accent)]"
            : "text-[var(--text-secondary)]"
        }
      />
      {note.like_count ?? 0}
    </button>
  );

  if (view === "list") {
    return (
      <article
        ref={observeRef}
        role={note.share_uuid ? "link" : undefined}
        tabIndex={note.share_uuid ? 0 : -1}
        onClick={note.share_uuid ? openNote : undefined}
        onKeyDown={
          note.share_uuid
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openNote();
                }
              }
            : undefined
        }
        className={`group flex ${articleClass} items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]`}
      >
        <h2 className="min-w-0 max-w-[240px] flex-1 truncate text-sm font-medium text-[var(--text-primary)]">
          {note.title || "untitled"}
        </h2>
        <p className="hidden min-w-0 flex-[2] truncate text-xs text-[var(--text-secondary)] md:block">
          {preview || "empty note"}
        </p>
        <div className="hidden shrink-0 text-xs text-[var(--text-secondary)] sm:block">
          by{" "}
          {note.author_username ? (
            <Link
              href={`/u/${note.author_username}`}
              onClick={(event) => event.stopPropagation()}
              className="text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              {author}
            </Link>
          ) : (
            author
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {likeButton}
          <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
            <Eye size={13} />
            {note.view_count ?? 0}
          </span>
        </div>
      </article>
    );
  }

  return (
    <article
      ref={observeRef}
      role={note.share_uuid ? "link" : undefined}
      tabIndex={note.share_uuid ? 0 : -1}
      onClick={note.share_uuid ? openNote : undefined}
      onKeyDown={
        note.share_uuid
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openNote();
              }
            }
          : undefined
      }
      className={`group relative mb-4 break-inside-avoid ${articleClass} rounded-md p-4 transition-colors hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-base font-medium leading-snug text-[var(--text-primary)]">
            {note.title || "untitled"}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            by{" "}
            {note.author_username ? (
              <Link
                href={`/u/${note.author_username}`}
                onClick={(event) => event.stopPropagation()}
                className="text-[var(--accent)] hover:text-[var(--accent-hover)]"
              >
                {author}
              </Link>
            ) : (
              author
            )}
          </p>
        </div>
        <span className="shrink-0 text-xs text-[var(--text-secondary)]">
          {formatDate(note.updated_at ?? note.created_at)}
        </span>
      </div>

      {note.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
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

      <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-[var(--text-secondary)]">
        {preview || "empty note"}
      </p>

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        {likeButton}
        <span className="inline-flex items-center gap-1">
          <Eye size={13} />
          {note.view_count ?? 0}
        </span>
      </div>
    </article>
  );
}

export default function ExplorePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("trending");
  const [view, setView] = useState<ViewMode>("grid");
  const [error, setError] = useState("");
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchFirstPage = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const page = await getCommunityNotesPage({ limit: 20 });
      setNotes(page.items);
      setNextCursor(page.next_cursor);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load explore";
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
      const page = await getCommunityNotesPage({
        limit: 20,
        cursor: nextCursor,
      });
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
        if (entries[0]?.isIntersecting) fetchNextPage();
      });
      observerRef.current.observe(node);
    },
    [fetchNextPage, loading, loadingMore, nextCursor],
  );

  const handleLike = useCallback(
    async (id: number) => {
      const previous = notes.find((note) => note.id === id);
      if (!previous) return;
      const nextLiked = !previous.liked_by_me;
      const nextCount = Math.max(
        0,
        (previous.like_count ?? 0) + (nextLiked ? 1 : -1),
      );

      setNotes((prev) =>
        prev.map((note) =>
          note.id === id
            ? { ...note, liked_by_me: nextLiked, like_count: nextCount }
            : note,
        ),
      );

      try {
        const response = await likeNote(id);
        setNotes((prev) =>
          prev.map((note) =>
            note.id === id
              ? {
                  ...note,
                  liked_by_me: response.liked,
                  like_count: response.like_count,
                }
              : note,
          ),
        );
      } catch (err: unknown) {
        setNotes((prev) =>
          prev.map((note) => (note.id === id ? previous : note)),
        );
        const message =
          err instanceof Error ? err.message : "Could not like note";
        gooeyToast.error(message);
      }
    },
    [notes],
  );

  const visibleNotes = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? notes.filter((note) => {
          return (
            note.title.toLowerCase().includes(query) ||
            stripMarkdown(note.content).toLowerCase().includes(query) ||
            note.tags.some((tag) => tag.toLowerCase().includes(query)) ||
            authorName(note).toLowerCase().includes(query)
          );
        })
      : notes;

    return [...filtered].sort((left, right) => {
      if (sort === "trending") {
        const metric = metricValue(right) - metricValue(left);
        if (metric !== 0) return metric;
      }
      return (
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime()
      );
    });
  }, [notes, search, sort]);

  return (
    <>
      <div className="mb-8 flex flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-medium tracking-normal text-[var(--text-primary)]">
              explore
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              public notes from the community
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 items-center gap-2 rounded-md px-2 text-xs text-[var(--text-secondary)] transition-colors focus-within:bg-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)]">
              <Search size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="search"
                className="w-36 border-none bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>
            <div className="flex items-center gap-1">
              {(["trending", "recent"] as SortKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSort(key)}
                  className="rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-[var(--bg-secondary)]"
                  style={{
                    color:
                      sort === key ? "var(--accent)" : "var(--text-secondary)",
                  }}
                >
                  {key}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setView("grid")}
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
                onClick={() => setView("list")}
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
          </div>
        </div>
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
            <ExploreSkeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: stable skeleton count
              key={index}
              view={view}
            />
          ))}
        </div>
      )}

      {!loading && visibleNotes.length === 0 && !error && (
        <div className="py-20 text-center text-sm text-[var(--text-secondary)]">
          nothing here yet
        </div>
      )}

      {!loading && visibleNotes.length > 0 && (
        <div
          className={
            view === "grid"
              ? "columns-1 gap-4 md:columns-2 lg:columns-3"
              : "space-y-1"
          }
        >
          {visibleNotes.map((note, index) => (
            <ExploreNote
              key={note.id}
              note={note}
              view={view}
              onLike={handleLike}
              observeRef={
                index === visibleNotes.length - 1 ? lastNoteRef : undefined
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
    </>
  );
}
