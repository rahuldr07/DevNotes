import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReadOnlyEditor } from "@/components/ReadOnlyEditor";
import { backendFetch } from "@/lib/backend";
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
  return note.author_name || note.author_username || "";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ share_uuid: string }>;
}): Promise<Metadata> {
  const { share_uuid } = await params;
  const note = await getPublicNote(share_uuid);
  if (!note) return { title: "Note not found" };
  return {
    title: note.title,
    description: `Read "${note.title}" on DevNotes`,
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

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-12 text-[var(--text-primary)] sm:px-6">
      <main className="mx-auto max-w-[720px]">
        <header className="mb-10">
          <h1 className="break-words text-3xl font-medium leading-tight tracking-normal sm:text-4xl">
            {note.title || "untitled"}
          </h1>

          {author && (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">
              by{" "}
              {note.author_username ? (
                <Link
                  href={`/u/${note.author_username}`}
                  className="text-[var(--accent)] hover:text-[var(--accent-hover)]"
                >
                  {author}
                </Link>
              ) : (
                author
              )}
            </p>
          )}

          {note.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {note.tags.map((tag) => (
                <span key={tag} className="text-xs text-[var(--accent)]">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <article className="min-w-0">
          <ReadOnlyEditor content={note.content} />
        </article>

        <footer
          className="mt-12 flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-[var(--text-secondary)]"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span>{formatDate(note.updated_at ?? note.created_at)}</span>
          <span>
            {note.like_count ?? 0} likes / {note.view_count ?? 0} views
          </span>
        </footer>
      </main>

      <Link
        href="/"
        className="fixed bottom-4 right-4 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
      >
        devnotes
      </Link>
    </div>
  );
}
