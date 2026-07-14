import {
  BookOpen,
  Code2,
  ExternalLink,
  Eye,
  Heart,
  Library,
  Share2,
  Sparkles,
  UserCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyContentButton } from "@/components/CopyContentButton";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { backendFetch } from "@/lib/backend";
import { formatNoteDate } from "@/lib/format";
import { previewText } from "@/lib/notes";
import { noteKindLabel, readingTimeMinutes } from "@/lib/reading";
import type { Note } from "@/types/notes";

async function getPublicNote(shareUuid: string): Promise<Note | null> {
  try {
    const res = await backendFetch(`/notes/public/${shareUuid}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function getRelatedNotes(shareUuid: string): Promise<Note[]> {
  try {
    const res = await backendFetch(
      `/notes/public/${shareUuid}/related?limit=3`,
      {
        method: "GET",
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function authorName(note: Note) {
  return note.author_name || note.author_username || "DevNotes author";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ share_uuid: string }>;
}): Promise<Metadata> {
  const { share_uuid } = await params;
  const note = await getPublicNote(share_uuid);
  if (!note) return { title: "Note not found" };

  const description = previewText(note.content).slice(0, 155);

  return {
    title: `${note.title || "Untitled note"} · DevNotes`,
    description: description || `Read "${note.title}" on DevNotes`,
    openGraph: {
      title: note.title || "Untitled note",
      description: description || "A public DevNotes article",
      type: "article",
    },
  };
}

export default async function PublicNotePage({
  params,
}: {
  params: Promise<{ share_uuid: string }>;
}) {
  const { share_uuid } = await params;
  const [note, relatedNotes] = await Promise.all([
    getPublicNote(share_uuid),
    getRelatedNotes(share_uuid),
  ]);

  if (!note) notFound();

  const author = authorName(note);
  const publishedAt = formatNoteDate(note, "long");
  const minutes = readingTimeMinutes(note.content);
  const kind = noteKindLabel(note.note_type);

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-10rem] top-[-14rem] h-96 w-96 rounded-none bg-[var(--accent)]/12 blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-10rem] h-[28rem] w-[28rem] rounded-none bg-[var(--main-color)]/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "linear-gradient(to bottom, black, transparent 78%)",
          }}
        />
      </div>

      <header className="relative border-b border-[var(--border)] bg-[var(--bg)]/75 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.22em] text-[var(--accent)] uppercase transition-colors hover:text-[var(--accent-hover)]"
          >
            DevNotes
          </Link>
          <div className="hidden items-center gap-2 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/60 px-3 py-1.5 text-xs text-[var(--text-secondary)] sm:flex">
            <Sparkles size={13} className="text-[var(--accent)]" />
            public knowledge page
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:py-14">
        <article className="min-w-0">
          <section className="mb-8 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/50 p-6 shadow-md shadow-black/5 backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1">
                {kind}
              </span>
              {note.language && (
                <span className="inline-flex items-center gap-1 rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1">
                  <Code2 size={13} /> {note.language}
                </span>
              )}
              <span className="rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1">
                {publishedAt}
              </span>
              <span className="rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1">
                {minutes} min read
              </span>
              <span className="rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1">
                {note.view_count ?? 0} views
              </span>
            </div>

            <h1 className="break-words text-4xl font-semibold leading-[0.95] tracking-[-0.07em] text-[var(--text-primary)] sm:text-6xl">
              {note.title || "untitled"}
            </h1>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-none border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)]">
                <UserCircle size={22} />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Written by
                </p>
                {note.author_username ? (
                  <Link
                    href={`/u/${note.author_username}`}
                    className="font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
                  >
                    {author}
                  </Link>
                ) : (
                  <p className="font-medium text-[var(--text-primary)]">
                    {author}
                  </p>
                )}
              </div>
            </div>

            {note.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1 text-xs text-[var(--accent)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-none border border-[var(--border)] bg-[var(--bg)]/70 p-4 backdrop-blur-xl sm:p-7 lg:p-9">
            <MarkdownViewer content={note.content} />
          </section>

          {relatedNotes.length > 0 && (
            <section className="mt-8 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/45 p-5 backdrop-blur-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                    <Library size={14} /> related reading
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Continue through connected public notes and snippets.
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {relatedNotes.map((related) => (
                  <Link
                    key={related.share_uuid}
                    href={`/s/${related.share_uuid}`}
                    className="group rounded-none border border-[var(--border)] bg-[var(--bg)]/60 p-4 transition-colors hover:border-[var(--accent)]/60 hover:shadow-sm hover:shadow-black/10"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      <span>{noteKindLabel(related.note_type)}</span>
                      <span>•</span>
                      <span>{readingTimeMinutes(related.content)} min</span>
                    </div>
                    <h2 className="line-clamp-2 text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                      {related.title || "untitled"}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">
                      {previewText(related.content) ||
                        "Read this related note."}
                    </p>
                    {related.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {related.tags.slice(0, 2).map((tag) => (
                          <span
                            key={`${related.share_uuid}-${tag}`}
                            className="rounded-none border border-[var(--border)] px-2 py-0.5 text-[10px] text-[var(--accent)]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/60 p-5 backdrop-blur-xl">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              article signal
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Code2 size={15} /> Type
                </span>
                <span className="font-medium capitalize text-[var(--text-primary)]">
                  {kind}
                </span>
              </div>
              {note.language && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[var(--text-secondary)]">Language</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {note.language}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Heart size={15} /> Likes
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {note.like_count ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Eye size={15} /> Views
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {note.view_count ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <BookOpen size={15} /> Read
                </span>
                <span className="font-medium text-[var(--text-primary)]">
                  {minutes} min
                </span>
              </div>
            </div>
          </div>

          {note.source_url && (
            <a
              href={note.source_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/60 p-5 text-sm text-[var(--text-secondary)] backdrop-blur-xl transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
            >
              <span>Original source</span>
              <ExternalLink size={15} />
            </a>
          )}

          <div className="rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/60 p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
              <Share2 size={14} /> shareable
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              DevNotes public pages are being shaped into polished technical
              essays with source credibility, author profiles, and structured
              discovery.
            </p>
            <CopyContentButton
              content={note.content}
              label={
                note.note_type === "snippet" ? "copy snippet" : "copy note"
              }
              className="mt-4 w-full gap-2 rounded-none border border-[var(--border)] bg-[var(--bg)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
