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
    const searchParams = useSearchParams();
    const noteId = searchParams.get('id');
    const [note, setNote] = useState<Note | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchNote();
    }, [noteId]);

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
            <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
                <p className='text-gray-600 text-lg'>Loading note...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
                <div className='bg-red-100 text-red-700 p-6 rounded-lg'>
                    {error}
                </div>
            </div>
        );
    }

    if (!note) {
        return (
            <div className='min-h-screen bg-gray-100 flex items-center justify-center'>
                <p className='text-gray-600 text-lg'>Note not found</p>
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