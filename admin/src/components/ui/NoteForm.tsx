/**
 * NoteForm — Reusable form component for creating and editing notes.
 *
 * Used by:
 *   - /dashboard/create_note → mode="create" (empty form)
 *   - /dashboard/edit_note   → mode="edit" (pre-filled with note data)
 *
 * This avoids duplicating the form UI and logic in two separate pages.
 * The `mode` prop controls:
 *   - Which API endpoint to call (POST /create vs PATCH /update)
 *   - What text to show on headings and buttons
 *   - Whether to pre-fill the fields
 */
'use client';

import { useState,useCallback } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * Props for the NoteForm component.
 * - mode: 'create' or 'edit' — determines behavior
 * - noteId: Required for edit mode (which note to update)
 * - initialTitle/Content: Pre-fill values for edit mode (defaults to '')
 */
interface NoteFormProps {
    mode : 'create' | 'edit';
    noteId?: number;
    initialTitle?: string;
    initialContent?: string;
}

/** Shape of the API response when creating/updating a note */
interface NoteResponse {
    id: number;
    title: string;
    content: string;
    created_at: string;
    updated_at: string | null;
}

export default function NoteForm({
    mode,
    initialTitle = '',    // Defaults to empty string for create mode
    initialContent = '',
    noteId,
}: NoteFormProps) {
    // Form state — initialized with either empty strings (create) or existing data (edit)
    const [title,setTitle] = useState(initialTitle);
    const [content,setContent] = useState(initialContent);
    const [loading,setLoading] = useState(false);
    const [error,setError] = useState('');

    const router = useRouter();

    /**
     * Handles form submission for both create and edit modes.
     *
     * Create mode: POST /api/notes/create { title, content }
     * Edit mode:   PATCH /api/notes/{id}/update { title, content }
     *
     * On success, redirects back to the dashboard.
     */
    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate — .trim() removes whitespace to catch "   " as empty
        if (!title.trim() || !content.trim()) {
            setError('Title and content cannot be empty');
            return;
        }

        try {
            setLoading(true);
            setError('');

            if (mode === 'create') {
                // Create a new note
                const response = await api.post<NoteResponse>('/notes/create', {
                    title,
                    content,
                });
            } else if (mode === 'edit' && noteId) {
                // Update an existing note (PATCH = partial update)
                const response = await api.patch<NoteResponse>(`/notes/${noteId}/update`, {
                    title,
                    content,
                });
            }

            // Navigate back to dashboard after successful create/edit
            router.push('/dashboard');
            } catch (err: any) {
                setError(err.message || (mode === 'create' ? 'Failed to create note': 'Failed to update the note'));
            } finally {
                setLoading(false);
            }

    },[title,content,router,mode,noteId]);

    return (
        <div className='max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow p-8'>
            <h1 className='text-3xl font-bold mb-6 dark:text-white'>
                {mode === 'create' ? 'Create Note' : 'Edit Note'}
            </h1>

            {error && (
                <div className='bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded mb-6'>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                {/* Title Input */}
                <div className='mb-6'>
                    <label className='block text-gray-700 font-bold mb-2 dark:text-gray-300'>
                        Title
                    </label>
                    <input 
                        type='text'
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white'
                        placeholder='Enter the Title'
                    />
                </div>

                {/* Content Text area */}
                <div className='mb-6'>
                    <label className='block text-gray-700 font-bold mb-2 dark:text-gray-300'>
                        Content
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white h-48 resize-none'
                        placeholder='Enter the Content'
                    />
                </div>

                {/* Buttons */}
                <div className='flex gap-4'>
                    <button 
                        type="submit"
                        disabled={loading}
                        className='flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400'
                    >
                        {loading 
                            ? mode === 'create'
                                ? 'Creating...'
                                : 'Updating...'
                            : mode === 'create'
                                ? 'Create Note'
                                : 'Update Note'
                        }
                    </button>
                    <Link 
                        href='/dashboard'
                        className='flex-1 bg-gray-600 text-white py-2 rounded-lg font-bold hover:bg-gray-700 text-center'
                        >
                            Cancel
                        </Link>
                </div>
            </form>
        </div>
    );
}