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
'use client';

import NoteForm from '@/components/ui/NoteForm';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

interface Note {
    id: number;
    title: string;
    content: string;
    created_at: string;
    updated_at: string | null;
}

export default function EditNotePage() {
    // useSearchParams reads URL query params: /edit_note?id=5 → id = '5'
    // (Different from useParams which reads dynamic route segments: /notes/[id])
    const searchParams = useSearchParams();
    const noteId = searchParams.get('id');
    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch note data when the component mounts or noteId changes
    useEffect(() => {
        fetchNote();
    }, [noteId]);

    /**
     * Fetches a single note by ID.
     * GET /api/notes/{id} → FastAPI returns the note object
     */
    const fetchNote = async () => {
        try {
            setLoading(true);
            const response = await api.get<Note>(`/notes/${noteId}`);
            setNote(response);
        } catch (err) {
            setError('Failed to fetch note');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <p className='text-gray-600 dark:text-gray-400 text-lg'>Loading note...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-6 rounded-lg'>
                    {error}
                </div>
            </div>
        );
    }

    if (!note) {
        return (
            <div className='flex items-center justify-center py-12'>
                <p className='text-gray-600 dark:text-gray-400 text-lg'>Note not found</p>
            </div>
        );
    }

    return (
        <NoteForm 
            mode = "edit"
            noteId={note.id}
            initialTitle={note.title}
            initialContent={note.content}
            />
    );
}