import {
  BookOpen,
  Eye,
  Heart,
  Share2,
  Sparkles,
  UserCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadOnlyEditor } from "@/components/ReadOnlyEditor";
import { backendFetch } from "@/lib/backend";
import { stripMarkdown } from "@/lib/notes";
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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function authorName(note: Note) {
  return note.author_name || note.author_username || "DevNotes author";
}

function readingTime(content: string) {
  const words = stripMarkdown(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ share_uuid: string }>;
}): Promise<Metadata> {
  const { share_uuid } = await params;
  const note = await getPublicNote(share_uuid);
  if (!note) return { title: "Note not found" };

  const description = stripMarkdown(note.content).slice(0, 155);

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
  const note = await getPublicNote(share_uuid);

  if (!note) notFound();

  const author = authorName(note);
  const publishedAt = formatDate(note.updated_at ?? note.created_at);
  const minutes = readingTime(note.content);

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-10rem] top-[-14rem] h-96 w-96 rounded-full bg-[var(--accent)]/12 blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-10rem] h-[28rem] w-[28rem] rounded-full bg-[var(--main-color)]/10 blur-3xl" />
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
          <div className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/60 px-3 py-1.5 text-xs text-[var(--text-secondary)] sm:flex">
            <Sparkles size={13} className="text-[var(--accent)]" />
            public knowledge page
          </div>
        </div>
      </header>

      <main className="relative mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:py-14">
        <article className="min-w-0">
          <section className="mb-8 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-secondary)]/50 p-6 shadow-2xl shadow-black/5 backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1">
                {publishedAt}
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1">
                {minutes} min read
              </span>
              <span className="rounded-full border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1">
                {note.view_count ?? 0} views
              </span>
            </div>

            <h1 className="break-words text-4xl font-semibold leading-[0.95] tracking-[-0.07em] text-[var(--text-primary)] sm:text-6xl">
              {note.title || "untitled"}
            </h1>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)]">
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
                    className="rounded-full border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1 text-xs text-[var(--accent)]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg)]/70 p-4 backdrop-blur-xl sm:p-7 lg:p-9">
            <ReadOnlyEditor content={note.content} />
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-secondary)]/60 p-5 backdrop-blur-xl">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              article signal
            </p>
            <div className="space-y-3 text-sm">
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

          <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-secondary)]/60 p-5 backdrop-blur-xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
              <Share2 size={14} /> shareable
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              DevNotes public pages are being shaped into polished technical
              essays with source credibility, author profiles, and AI-ready
              discovery.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
