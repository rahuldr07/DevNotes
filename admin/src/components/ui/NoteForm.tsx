'use client';

import { useState,useCallback } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface NoteFormProps {
    mode : 'create' | 'edit';
    noteId?: number;
    initialTitle?: string;
    initialContent?: string;
}

interface NoteResponse {
    id: number;
    title: string;
    content: string;
    created_at: string;
    updated_at: string | null;
}

export default function NoteForm({
    mode,
    initialTitle = '',
    initialContent = '',
    noteId,
}: NoteFormProps) {
    const [title,setTitle] = useState(initialTitle);
    const [content,setContent] = useState(initialContent);
    const [loading,setLoading] = useState(false);
    const [error,setError] = useState('');

    const router = useRouter();

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !content.trim()) {
            setError('Title and content cannot be empty');
            return;
        }

        try {
            setLoading(true);
            setError('');

            if (mode === 'create') {
                const response = await api.post<NoteResponse>('/notes/create', {
                    title,
                    content,
                });
            } else if (mode === 'edit' && noteId) {
                const response = await api.patch<NoteResponse>(`/notes/${noteId}/update`, {
                    title,
                    content,
                });
            }

            router.push('/dashboard');
            } catch (err: any) {
                setError(err.message || (mode === 'create' ? 'Failed to create note': 'Failed to update the note'));
            } finally {
                setLoading(false);
            }

    },[title,content,router,mode,noteId]);

    return (
        <div className='min-h-screen bg-gray-100 py-8'>
            <div className='max-w-2xl mx-auto bg-white rounded-lg shadow p-8'>
                <h1 className='text-3xl font-bold mb-6'>
                    {mode === 'create' ? 'Create Note' : 'Edit Note'}
                </h1>

                {error && (
                    <div className='bg-red-100 text-red-700 p-4 rounded mb-6'>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Title Input */}
                    <div className='mb-6'>
                        <label className='block text-gray-700 font-bold mb-2'>
                            Title
                        </label>
                        <input 
                            type='text'
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500'
                            placeholder='Enter the Title'
                        />
                    </div>

                    {/* Content Text area */}
                    <div className='mb-6'>
                        <label className='block text-gray-700 font-bold mb-2'>
                            Content
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 h-48 resize-none'
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
                        <button 
                            type="button"
                            onClick={() => router.push('/dashboard')}
                            className='flex-1 bg-gray-600 text-white py-2 rounded-lg font-bold hover:bg-gray-700'
                            >
                                Cancel
                            </button>
                    </div>
                </form>
            </div>
        </div>
    );
}