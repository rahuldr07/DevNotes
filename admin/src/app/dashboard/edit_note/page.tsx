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

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import NoteForm from "@/components/ui/NoteForm";
import { api } from "@/lib/api";

interface Note {
  id: number;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string | null;
  share_uuid: string | null;
  is_published: boolean;
  is_community: boolean;
}

export default function EditNotePage() {
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
    const fetchNote = async () => {
      try {
        setLoading(true);
        const response = await api.get<Note>(`/notes/${noteId}`);
        setNote(response);
      } catch (_err) {
        setError("Failed to fetch note");
      } finally {
        setLoading(false);
      }
    };

    if (noteId) {
      fetchNote();
    }
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
      <div className="flex items-center justify-center py-12">
        <div
          className="p-6 rounded-lg"
          style={{
            backgroundColor: "var(--sub-alt-color)",
            color: "var(--error-color)",
            border: "1px solid var(--error-color)",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-lg" style={{ color: "var(--sub-color)" }}>
          Note not found
        </p>
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
      initialShareUuid={note.share_uuid}
      initialPublished={note.is_published}
      initialCommunity={note.is_community}
    />
  );
}
