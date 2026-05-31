import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { backendFetch } from "@/lib/backend";
import { stripMarkdown } from "@/lib/notes";
import type { AuthorProfile, Note } from "@/types/notes";

async function getAuthorProfile(
  username: string,
): Promise<AuthorProfile | null> {
  try {
    const res = await backendFetch(`/u/${encodeURIComponent(username)}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function formatJoined(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatNoteDate(note: Note) {
  return new Date(note.updated_at ?? note.created_at).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
    },
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getAuthorProfile(username);
  if (!profile) return { title: "Author not found" };
  return {
    title: `${profile.username} on DevNotes`,
    description: `Public notes by ${profile.username}`,
  };
}

export default async function AuthorProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getAuthorProfile(username);

  if (!profile) notFound();

  const publicNotes = profile.notes.filter((note) => note.share_uuid);

  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-12 text-[var(--text-primary)] sm:px-6">
      <main className="mx-auto max-w-[1000px]">
        <header
          className="mb-10 pb-6"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Link
            href="/"
            className="text-sm font-medium text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
          >
            devnotes
          </Link>
          <h1 className="mt-8 text-3xl font-medium tracking-normal">
            @{profile.username}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            joined {formatJoined(profile.joined_at)} / {publicNotes.length}{" "}
            public {publicNotes.length === 1 ? "note" : "notes"}
          </p>
        </header>

        {publicNotes.length === 0 ? (
          <div className="py-16 text-sm text-[var(--text-secondary)]">
            nothing here yet
          </div>
        ) : (
          <div className="columns-1 gap-4 md:columns-2 lg:columns-3">
            {publicNotes.map((note) => (
              <Link
                key={note.id}
                href={`/s/${note.share_uuid}`}
                className="mb-4 block break-inside-avoid rounded-md p-4 transition-colors hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 className="line-clamp-2 text-base font-medium leading-snug">
                    {note.title || "untitled"}
                  </h2>
                  <span className="shrink-0 text-xs text-[var(--text-secondary)]">
                    {formatNoteDate(note)}
                  </span>
                </div>

                {note.tags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {note.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] text-[var(--accent)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="line-clamp-3 text-sm leading-5 text-[var(--text-secondary)]">
                  {stripMarkdown(note.content) || "empty note"}
                </p>

                <div className="mt-4 text-xs text-[var(--text-secondary)]">
                  {note.like_count ?? 0} likes / {note.view_count ?? 0} views
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
