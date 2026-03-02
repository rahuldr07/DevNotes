'use client';

import { useState,useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { removeToken } from '@/lib/auth';
import { Edit, Trash2 } from 'lucide-react';

interface Note {
    id: number;
    title: string;
    content: string;
    created_at: string;
    updated_at: string | null;
}

export default function DashBoardPage() {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const router = useRouter();

    useEffect(() => {
        fetchNotes();
    },[]);

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

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this note?')) {
            return;
        }
        try {
            await api.delete(`/notes/${id}/delete`);
            setNotes(notes.filter((note) => note.id !== id));
        } catch (err:any) {
            setError(err.message || 'Failed to delete the note');
        }
    };

    const handleLogout = () => {
        removeToken();
        router.push('/auth/login');
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className='bg-white shadow'>
                <div className='max-w-6xl mx-auto px-4 py-6 flex justify-between items-center'>
                    <h1 className='text-3xl font-bold'>DevNotes</h1>
                    <button 
                        onClick={handleLogout}
                        className='bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700'>
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className='max-w-6xl mx-auto px-4 py-8'>
                {/* Error Message */}
                {error && (
                    <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4'>
                        {error}
                    </div>
                )}

                {/* Create Note Button */}
                <div className='mb-8'>
                    <button
                        onClick={() => router.push('/dashboard/create_note')}
                        className='bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-bold'>
                            + New Note
                        </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className='text-center py-12'>
                        <p className='text-gray-600 text-lg'>Loading notes...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && notes.length === 0 && (
                    <div className='text-center py-12 bg-white rounded-lg'>
                        <p className='text-gray-600 text-lg'>No notes yet</p>
                        <p className='text-gray-600 text-lg'>CLick "New Note" to create your first Blog</p>
                    </div>
                )}

                {/* Notes List */}
                {!loading && notes.length > 0 && (
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                        {notes.map((note) => (
                            <div key = {note.id} className='bg-white p-6 rounded-lg shadow hover:shadow-lg transition'>
                                <h2 className='text-xl font-bold mb-2 line-clamp-2'>
                                    {note.title}
                                </h2>
                                <p className='text-gray-600 mb-4 line-clamp-3'>
                                    {note.content}
                                </p>
                                <p className='text-sm text-gray-400 mb-4'>
                                    {new Date(note.created_at).toLocaleDateString()}
                                </p>

                                {/* Icons Row */}
                                <div className='flex gap-3 justify-end'>
                                    {/* Edit Icon */}
                                    <button
                                        onClick={() => 
                                            router.push(`/dashboard/edit_note?id=${note.id}`)
                                        }
                                        className='text-blue-600 hover:text-blue-800 transition'
                                        title='Edit Note'>
                                            <Edit size={20} />
                                    </button>
                                    
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
            </main>
        </div>
    );
}