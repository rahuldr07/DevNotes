import { ReadOnlyEditor } from "@/components/ReadOnlyEditor";
import { backendFetch } from "@/lib/backend";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Calendar } from "lucide-react";

interface NoteResponse {
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

async function getPublicNote(share_uuid: string): Promise<NoteResponse | null> {
  try {
    const res = await backendFetch(`/notes/public/${share_uuid}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ share_uuid: string }> 
}): Promise<Metadata> {
  const { share_uuid } = await params;
  const note = await getPublicNote(share_uuid);
  if (!note) return { title: "Note Not Found" };
  return {
    title: note.title,
    description: `Read "${note.title}" on DevNotes`,
  };
}

export default async function PublicNotePage({ 
  params 
}: { 
  params: Promise<{ share_uuid: string }> 
}) {
  const { share_uuid } = await params;
  const note = await getPublicNote(share_uuid);

  if (!note) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col items-center py-16 px-4 md:px-8 bg-[var(--bg-color)] text-[var(--text-color)]">
      {/* Header / Branding */}
      <div className="mb-12 text-center">
         <Link href="/" className="inline-block group">
            <h1 className="text-xl font-bold tracking-tight group-hover:text-[var(--main-color)] transition-colors">DevNotes</h1>
         </Link>
         <div className="flex items-center justify-center gap-1.5 mt-2">
            <Globe size={12} className="text-[var(--sub-color)]" />
            <p className="text-xs font-mono uppercase tracking-wider text-[var(--sub-color)]">Public Note</p>
         </div>
      </div>

      <main className="w-full max-w-3xl">
        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold mb-6 break-words leading-tight">{note.title}</h1>
        
        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-4 mb-8 text-sm">
            {/* Date */}
            <div className="flex items-center gap-1.5 text-[var(--sub-color)]">
                <Calendar size={14} />
                <span className="font-mono text-xs">
                    {new Date(note.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </span>
            </div>

            {/* Tags */}
            {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
                {note.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full border bg-[var(--sub-alt-color)] text-[var(--main-color)] border-[var(--border-color)]">
                    #{tag}
                </span>
                ))}
            </div>
            )}
        </div>

        {/* Divider */}
        <div className="h-px w-full mb-10 bg-[var(--border-color)]" />

        {/* Content */}
        <div className="prose prose-invert max-w-none">
           <ReadOnlyEditor content={note.content} />
        </div>
      </main>
      
      {/* Footer / CTA */}
      <div className="mt-24 pt-8 border-t border-[var(--border-color)] w-full max-w-3xl text-center">
         <p className="text-sm text-[var(--sub-color)]">
           Written with <strong className="text-[var(--text-color)]">DevNotes</strong>. 
           <br className="sm:hidden" />
           <Link href="/" className="ml-1 underline decoration-[var(--main-color)] decoration-2 underline-offset-4 hover:text-[var(--main-color)] transition-colors">
             Start writing for free →
           </Link>
         </p>
      </div>
    </div>
  );
}
