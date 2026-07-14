/**
 * Edit Note Page — Loads an existing note and renders NoteForm in "edit" mode.
 *
 * Route: /dashboard/edit_note?id=5
 *
 * Flow:
 * 1. Reads the note ID from the URL query params (?id=5)
 * 2. Fetches the note data from GET /api/notes/5
 * 3. Shows loading/error/not-found states while fetching
 * 4. Passes the note data to NoteForm in "edit" mode
 *
 * Uses useSearchParams (not useParams) because the ID is passed
 * as a query parameter (?id=5), not a dynamic route segment ([id]).
 */
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import NoteForm from "@/components/ui/NoteForm";
import { normalizeErrorMessage } from "@/lib/errors";
import { getNote } from "@/lib/note-api";
import type { Note } from "@/types/notes";

function EditNoteContent() {
  // useSearchParams reads URL query params: /edit_note?id=5 → id = '5'
  // (Different from useParams which reads dynamic route segments: /notes/[id])
  const searchParams = useSearchParams();
  const noteId = searchParams.get("id");
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch note data when the component mounts or noteId changes
  useEffect(() => {
    /**
     * Fetches a single note by ID.
     * GET /api/notes/{id} → FastAPI returns the note object
     */
    if (!noteId) {
      setNote(null);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchNote = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await getNote(Number(noteId));
        if (!cancelled) setNote(response);
      } catch (err: unknown) {
        if (!cancelled) {
          setNote(null);
          setError(normalizeErrorMessage(err, "Failed to fetch note"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNote();

    return () => {
      cancelled = true;
    };
  }, [noteId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-lg" style={{ color: "var(--sub-color)" }}>
          Loading note...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div
          className="p-6 rounded-none"
          style={{
            backgroundColor: "var(--sub-alt-color)",
            color: "var(--error-color)",
            border: "1px solid var(--error-color)",
          }}
        >
          {error}
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-none border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <ArrowLeft size={15} />
          back to notes
        </Link>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-lg" style={{ color: "var(--sub-color)" }}>
          Note not found
        </p>
        <p className="text-sm" style={{ color: "var(--sub-color)" }}>
          It may have been deleted, or the link is missing its note id.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-none border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          <ArrowLeft size={15} />
          back to notes
        </Link>
      </div>
    );
  }

  return (
    <NoteForm
      mode="edit"
      noteId={note.id}
      initialTitle={note.title}
      initialContent={note.content}
      initialTags={note.tags || []}
      initialNoteType={note.note_type ?? "note"}
      initialLanguage={note.language}
      initialSourceUrl={note.source_url}
      initialShareUuid={note.share_uuid}
      initialPublished={note.is_published}
      initialCommunity={note.is_community}
    />
  );
}

// useSearchParams() needs a Suspense boundary so the static shell of this
// page can prerender while the query-string read stays client-side.
export default function EditNotePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <p className="text-lg" style={{ color: "var(--sub-color)" }}>
            Loading note...
          </p>
        </div>
      }
    >
      <EditNoteContent />
    </Suspense>
  );
}
