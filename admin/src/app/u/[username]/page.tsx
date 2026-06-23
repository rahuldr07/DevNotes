import {
  CalendarDays,
  Code2,
  ExternalLink,
  Eye,
  FileText,
  Heart,
  Sparkles,
  UserCircle,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { backendFetch } from "@/lib/backend";
import { stripMarkdown } from "@/lib/notes";
import { noteKindLabel, readingTimeMinutes } from "@/lib/reading";
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

function getTopTags(notes: Note[]) {
  const counts = new Map<string, number>();
  for (const note of notes) {
    for (const tag of note.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8);
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
    title: `@${profile.username} · DevNotes`,
    description: `Public developer knowledge by ${profile.username}`,
    openGraph: {
      title: `@${profile.username} on DevNotes`,
      description: `Explore public notes, guides, and developer knowledge by ${profile.username}.`,
      type: "profile",
    },
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

  const publicNotes = profile.public_notes.filter((note) => note.share_uuid);
  const topTags = getTopTags(publicNotes);
  const totalLikes = publicNotes.reduce(
    (sum, note) => sum + (note.like_count ?? 0),
    0,
  );
  const totalViews = publicNotes.reduce(
    (sum, note) => sum + (note.view_count ?? 0),
    0,
  );
  const featuredNote = publicNotes[0];

  return (
    <div className="min-h-screen overflow-hidden bg-[var(--bg)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-[-12rem] top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-[var(--accent)]/12 blur-3xl" />
        <div className="absolute bottom-[-14rem] right-[-10rem] h-[30rem] w-[30rem] rounded-full bg-[var(--main-color)]/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(circle at top, black, transparent 76%)",
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
          <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/60 px-3 py-1.5 text-xs text-[var(--text-secondary)]">
            public profile
          </span>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <section className="mb-8 overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-secondary)]/55 p-6 shadow-2xl shadow-black/5 backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div>
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg)] text-[var(--accent)]">
                <UserCircle size={34} />
              </div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)]/70 px-3 py-1 text-xs text-[var(--text-secondary)]">
                <Sparkles size={13} className="text-[var(--accent)]" />
                developer knowledge profile
              </div>
              <h1 className="break-words text-4xl font-semibold tracking-[-0.07em] text-[var(--text-primary)] sm:text-6xl">
                @{profile.username}
              </h1>
              <p className="mt-3 text-lg font-medium text-[var(--accent)]">
                {profile.name}
              </p>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                {profile.bio ||
                  "Public notes, technical guides, and reusable knowledge shared from a DevNotes workspace."}
              </p>
              {(profile.website_url ||
                profile.github_url ||
                profile.twitter_url) && (
                <div className="mt-5 flex flex-wrap gap-2 text-xs">
                  {[
                    ["Website", profile.website_url],
                    ["GitHub", profile.github_url],
                    ["Twitter", profile.twitter_url],
                  ].map(([label, url]) =>
                    url ? (
                      <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1.5 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
                      >
                        {label} <ExternalLink size={12} />
                      </a>
                    ) : null,
                  )}
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1.5">
                  <CalendarDays size={13} /> joined{" "}
                  {formatJoined(profile.created_at)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1.5">
                  <FileText size={13} /> {publicNotes.length} public notes
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg)]/65 p-4">
                <p className="text-2xl font-semibold tracking-[-0.04em]">
                  {publicNotes.length}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  notes
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg)]/65 p-4">
                <p className="text-2xl font-semibold tracking-[-0.04em]">
                  {totalLikes}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  likes
                </p>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg)]/65 p-4">
                <p className="text-2xl font-semibold tracking-[-0.04em]">
                  {totalViews}
                </p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  views
                </p>
              </div>
            </div>
          </div>
        </section>

        {featuredNote && (
          <section className="mb-8 rounded-[2rem] border border-[var(--border)] bg-[var(--bg)]/60 p-5 backdrop-blur-xl sm:p-6">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
              featured latest
            </p>
            <Link
              href={`/s/${featuredNote.share_uuid}`}
              className="group block rounded-[1.5rem] border border-[var(--border)] bg-[var(--bg-secondary)]/60 p-5 transition-colors hover:border-[var(--accent)]/50"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span>{formatNoteDate(featuredNote)}</span>
                <span>·</span>
                <span className="capitalize">
                  {noteKindLabel(featuredNote.note_type)}
                </span>
                <span>·</span>
                <span>{readingTimeMinutes(featuredNote.content)} min read</span>
                {featuredNote.language && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Code2 size={12} /> {featuredNote.language}
                    </span>
                  </>
                )}
                <span>·</span>
                <span>{featuredNote.view_count ?? 0} views</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                {featuredNote.title || "untitled"}
              </h2>
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                {stripMarkdown(featuredNote.content) || "empty note"}
              </p>
            </Link>
          </section>
        )}

        {topTags.length > 0 && (
          <section className="mb-8 flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <span
                key={tag}
                className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/60 px-3 py-1.5 text-xs text-[var(--accent)]"
              >
                #{tag}{" "}
                <span className="text-[var(--text-secondary)]">{count}</span>
              </span>
            ))}
          </section>
        )}

        {publicNotes.length === 0 ? (
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-secondary)]/50 py-20 text-center text-sm text-[var(--text-secondary)] backdrop-blur-xl">
            <FileText className="mx-auto mb-4 text-[var(--accent)]" size={30} />
            Nothing published yet.
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {publicNotes.map((note) => (
              <Link
                key={note.id}
                href={`/s/${note.share_uuid}`}
                className="group block rounded-[1.75rem] border border-[var(--border)] bg-[var(--bg-secondary)]/45 p-5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--bg-secondary)]/70 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              >
                <div className="mb-4 flex items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
                  <span className="capitalize">
                    {noteKindLabel(note.note_type)} · {formatNoteDate(note)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={13} /> {note.view_count ?? 0}
                  </span>
                </div>

                <h2 className="line-clamp-2 text-lg font-semibold leading-snug tracking-[-0.04em] text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent)]">
                  {note.title || "untitled"}
                </h2>

                {note.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {note.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[var(--bg)]/70 px-2 py-0.5 text-[11px] text-[var(--accent)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="mt-4 line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">
                  {stripMarkdown(note.content) || "empty note"}
                </p>

                <div className="mt-5 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span className="inline-flex items-center gap-1">
                    <Heart size={13} /> {note.like_count ?? 0}
                  </span>
                  <span>{readingTimeMinutes(note.content)} min read</span>
                  <span className="text-[var(--accent)]">Read note →</span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
