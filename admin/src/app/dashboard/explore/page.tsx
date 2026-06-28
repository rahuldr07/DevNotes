"use client";

import {
  AlertCircle,
  BookOpen,
  Code2,
  Eye,
  Flame,
  Heart,
  LayoutGrid,
  List,
  PenLine,
  Search,
  Sparkles,
  Tags,
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
import { noteKindLabel, readingTimeMinutes } from "@/lib/reading";
import type { Note } from "@/types/notes";

type SortKey = "trending" | "recent";
type ViewMode = "grid" | "list";

const STARTER_TOPICS = ["fastapi", "nextjs", "postgres", "deploy", "debugging"];
const PUBLISHING_STEPS = [
  "Create a note, guide, checklist, or snippet.",
  "Add focused tags so Explore can route it.",
  "Publish from the editor when it is reusable.",
];

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

function ExploreEmptyState({
  hasNotes,
  onTopic,
}: {
  hasNotes: boolean;
  onTopic: (topic: string | null) => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-secondary)]/45 p-6 text-center shadow-md shadow-black/5 sm:p-8">
      <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-60" />
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--accent)] shadow-lg shadow-black/5">
        <Sparkles size={28} />
      </div>
      <p className="text-xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {hasNotes ? "No matches for this filter" : "No public knowledge yet"}
      </p>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
        {hasNotes
          ? "Try another topic, switch back to all topics, or clear the search field to rediscover the public library."
          : "Seed Explore by publishing a reusable note, snippet, guide, or checklist. The best public items are tagged, concise, and useful for another builder."}
      </p>

      <div className="mx-auto mt-6 grid max-w-4xl gap-3 text-left md:grid-cols-[1fr_1.15fr]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/65 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            <Tags size={14} className="text-[var(--accent)]" /> starter topics
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onTopic(null)}
              className="rounded-md border border-[var(--accent)] px-3 py-1.5 text-xs text-[var(--accent)] transition-transform hover:-translate-y-0.5"
            >
              all topics
            </button>
            {STARTER_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => onTopic(topic)}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                #{topic}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]/65 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            <PenLine size={14} className="text-[var(--accent)]" /> publish path
          </div>
          <div className="grid gap-2 text-xs text-[var(--text-secondary)] sm:grid-cols-3">
            {PUBLISHING_STEPS.map((step, index) => (
              <div
                key={step}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)]/50 p-3"
              >
                <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)] text-[var(--accent-foreground)]">
                  {index + 1}
                </span>
                <p className="leading-5">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/dashboard/create_note"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-sm font-medium text-[var(--accent-foreground)] shadow-lg shadow-black/10 transition-transform hover:-translate-y-0.5"
        >
          <PenLine size={15} /> create publishable note
        </Link>
        <Link
          href="/dashboard/snippets"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
        >
          <Code2 size={15} /> capture snippet first
        </Link>
      </div>
    </section>
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
  const kind = noteKindLabel(note.note_type);
  const minutes = readingTimeMinutes(note.content);

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
        <span className="hidden shrink-0 rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] capitalize text-[var(--text-secondary)] lg:inline">
          {kind}
        </span>
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
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            <span className="rounded-md border border-[var(--border)] px-2 py-0.5 capitalize">
              {kind}
            </span>
            <span>{minutes} min</span>
            {note.language && (
              <span className="inline-flex items-center gap-1">
                <Code2 size={11} /> {note.language}
              </span>
            )}
          </div>
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
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
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
    const topicFiltered = selectedTopic
      ? notes.filter((note) => note.tags.includes(selectedTopic))
      : notes;
    const filtered = query
      ? topicFiltered.filter((note) => {
          return (
            note.title.toLowerCase().includes(query) ||
            stripMarkdown(note.content).toLowerCase().includes(query) ||
            note.tags.some((tag) => tag.toLowerCase().includes(query)) ||
            authorName(note).toLowerCase().includes(query)
          );
        })
      : topicFiltered;

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
  }, [notes, search, selectedTopic, sort]);

  const topicCounts = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      });
    });
    return [...counts.entries()]
      .sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
      )
      .slice(0, 10);
  }, [notes]);

  const featuredNote = useMemo(
    () =>
      [...notes].sort(
        (left, right) => metricValue(right) - metricValue(left),
      )[0],
    [notes],
  );

  const exploreStats = useMemo(
    () => [
      { label: "public notes", value: notes.length },
      { label: "topics", value: topicCounts.length },
      {
        label: "views",
        value: notes.reduce((sum, note) => sum + (note.view_count ?? 0), 0),
      },
      {
        label: "likes",
        value: notes.reduce((sum, note) => sum + (note.like_count ?? 0), 0),
      },
    ],
    [notes, topicCounts.length],
  );

  return (
    <>
      <section className="mb-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/42 p-5 shadow-sm shadow-black/5 backdrop-blur-xl sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="space-y-6">
            <div>
              <p className="type-eyebrow mb-3 text-[var(--accent)]">Explore</p>
              <h1 className="type-hero max-w-3xl text-[var(--text-primary)]">
                Explore reusable knowledge from builders.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                Public notes, guides, and snippets by topic.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                className="border-b px-1 py-1.5 text-xs transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                style={{
                  borderColor: selectedTopic
                    ? "var(--border)"
                    : "var(--accent)",
                  color: selectedTopic
                    ? "var(--text-secondary)"
                    : "var(--accent)",
                }}
              >
                all topics
              </button>
              {topicCounts.length === 0 &&
                STARTER_TOPICS.slice(0, 4).map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setSelectedTopic(topic)}
                    className="border-b border-transparent px-1 py-1.5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    #{topic}
                  </button>
                ))}
              {topicCounts.map(([topic, count]) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => setSelectedTopic(topic)}
                  className="border-b px-1 py-1.5 text-xs transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  style={{
                    borderColor:
                      selectedTopic === topic
                        ? "var(--accent)"
                        : "var(--border)",
                    color:
                      selectedTopic === topic
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                  }}
                >
                  #{topic} <span className="opacity-60">{count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 self-end rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)]/35 p-2">
            {exploreStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-[var(--border)]/80 bg-[var(--bg-secondary)]/45 p-3"
              >
                <div className="type-number text-3xl text-[var(--text-primary)]">
                  {stat.value}
                </div>
                <div className="mt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 px-2 text-xs text-[var(--text-secondary)]">
          <Flame size={15} className="text-[var(--accent)]" />
          {selectedTopic ? `Topic: #${selectedTopic}` : "Trending now"}
          <span className="rounded-md bg-[var(--bg-primary)] px-2 py-0.5">
            {visibleNotes.length} shown
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-xs text-[var(--text-secondary)] transition-colors focus-within:border-[var(--accent)]">
            <Search size={14} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="search notes, tags, authors"
              className="w-48 border-none bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
            />
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-1">
            {(["trending", "recent"] as SortKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSort(key)}
                className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-[var(--bg-secondary)]"
                style={{
                  color:
                    sort === key ? "var(--accent)" : "var(--text-secondary)",
                }}
              >
                {key}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-1">
            <button
              type="button"
              onClick={() => setView("grid")}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-secondary)]"
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
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--bg-secondary)]"
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

      {!loading && featuredNote && (
        <Link
          href={featuredNote.share_uuid ? `/s/${featuredNote.share_uuid}` : "#"}
          className="mb-6 grid gap-4 rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-secondary)] p-5 transition-colors hover:border-[var(--accent)] lg:grid-cols-[auto_1fr_auto] lg:items-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
            <BookOpen size={20} />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              featured read
              <span>•</span>
              <span>{noteKindLabel(featuredNote.note_type)}</span>
              <span>•</span>
              <span>{readingTimeMinutes(featuredNote.content)} min</span>
            </div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">
              {featuredNote.title || "untitled"}
            </h2>
            <p className="mt-1 line-clamp-1 text-sm text-[var(--text-secondary)]">
              {stripMarkdown(featuredNote.content) || "empty note"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <Heart size={14} /> {featuredNote.like_count ?? 0}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye size={14} /> {featuredNote.view_count ?? 0}
            </span>
          </div>
        </Link>
      )}

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
        <ExploreEmptyState
          hasNotes={notes.length > 0}
          onTopic={setSelectedTopic}
        />
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
