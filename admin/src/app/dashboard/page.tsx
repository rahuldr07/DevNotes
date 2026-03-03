/**
 * Dashboard Page — Main notes listing with CRUD operations.
 *
 * Route: /dashboard (protected — requires authentication)
 *
 * Features:
 * - Fetches and displays all user's notes in a responsive grid
 * - Create new note (navigates to /dashboard/create_note)
 * - Edit note (navigates to /dashboard/edit_note?id=X)
 * - Delete note (with confirmation prompt)
 * - Logout (clears cookie, redirects to login)
 *
 * Protected by middleware.ts — unauthenticated users are
 * redirected to /auth/login before this page loads.
 */
'use client';

import Link from 'next/link';
import { useState,useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import { Edit, Trash2 } from 'lucide-react'; // Icon components from lucide

/**
 * TypeScript interface matching the NoteResponse schema from FastAPI.
 * Defines the shape of a note object returned by the API.
 */
interface Note {
    id: number;
    title: string;
    content: string;
    created_at: string;
    updated_at: string | null;
}

export default function DashBoardPage() {
    const [notes, setNotes] = useState<Note[]>([]);  // Array of user's notes
    const [loading, setLoading] = useState(true);     // Loading state (true on initial load)
    const [error, setError] = useState('');

    // Fetch notes when the component first mounts
    // Empty dependency array [] means this runs once on page load
    useEffect(() => {
        fetchNotes();
    },[]);

    /**
     * Fetches all notes for the current user.
     * GET /api/notes/notes → FastAPI returns array of notes
     * The JWT token is automatically attached by api.ts
     */
    const fetchNotes = async () => {
        try {
            setLoading(true);
            setError('');
            const response =  await api.get<Note[]>('/notes/notes');
            setNotes(response);
        } catch (err:any) {
            setError(err.message || 'Failed to fetch the notes');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Deletes a note after user confirmation.
     * DELETE /api/notes/{id}/delete → FastAPI returns 204 No Content
     *
     * Uses optimistic UI: removes the note from local state immediately
     * with .filter() instead of re-fetching all notes from the server.
     */
    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }
        try {
            await api.delete(`/notes/${id}/delete`);
            // Remove the deleted note from state without re-fetching
            setNotes(notes.filter((note) => note.id !== id));
        } catch (err:any) {
            setError(err.message || 'Failed to delete the note');
        }
    };


return (
        <>
            {/* Error Message */}
            {error && (
                <div className='bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative mb-4'>
                    {error}
                </div>
            )}

            {/* Create Note Button */}
            <div className='mb-8'>
                <Link
                    href='/dashboard/create_note'
                    className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-bold inline-block'>
                        + New Note
                </Link>
            </div>

            {/* Loading State */}
            {loading && (
                <div className='text-center py-12'>
                    <p className='text-gray-600 dark:text-gray-400 text-lg'>Loading notes...</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && notes.length === 0 && (
                <div className='text-center py-12 bg-white dark:bg-gray-800 rounded-lg'>
                    <p className='text-gray-600 dark:text-gray-400 text-lg'>No notes yet</p>
                    <p className='text-gray-600 dark:text-gray-400 text-lg'>CLick "New Note" to create your first Blog</p>
                </div>
            )}

            {/* Notes List */}
            {!loading && notes.length > 0 && (
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {notes.map((note) => (
                        <div key = {note.id} className='bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition'>
                            <h2 className='text-xl font-bold mb-2 line-clamp-2 dark:text-white'>
                                {note.title}
                            </h2>
                            <p className='text-gray-600 dark:text-gray-400 mb-4 line-clamp-3'>
                                {note.content}
                            </p>
                            <p className='text-sm text-gray-400 mb-4'>
                                {new Date(note.created_at).toLocaleDateString()}
                            </p>

                            {/* Icons Row */}
                            <div className='flex gap-3 justify-end'>
                                {/* Edit Icon */}
                                <Link href={`/dashboard/edit_note?id=${note.id}`}
                                    className='text-blue-600 hover:text-blue-800 transition'
                                    title='Edit Note'>
                                        <Edit size={20} />
                                </Link>

                                {/* Delete Icon */}
                                <button
                                    onClick={() => handleDelete(note.id)}
                                    className='text-red-600 hover:text-red-800 transition'
                                    title='Delete Note'>
                                        <Trash2 size={24} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}