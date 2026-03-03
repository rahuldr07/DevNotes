/**
 * Create Note Page — Renders the NoteForm in "create" mode.
 *
 * Route: /dashboard/create_note
 *
 * This is a thin wrapper around the reusable NoteForm component.
 * Passing mode="create" tells NoteForm to:
 *   - Show "Create Note" as the heading
 *   - POST to /api/notes/create on submit
 *   - Start with empty title and content fields
 */
'use client';

import NoteForm from "@/components/ui/NoteForm";

export default function NewNotePage() {
    return <NoteForm mode="create"/>;
}