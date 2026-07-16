"use client";

import { ArrowLeft, BookOpen, Globe2, PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Kbd } from "@/components/ui/kbd";
import { formatNoteDate } from "@/lib/format";
import { noteKindLabel, readingTimeMinutes } from "@/lib/reading";
import type { Note } from "@/types/notes";

/**
 * Reading view for your own notes — the calm default when opening a note.
 * Rendered markdown (same viewer as the public pages) with the metadata
 * that matters while reading; editing is one explicit action away
 * (edit button, Ctrl+E, or E).
 */
export function NoteReadView({
  note,
  onEdit,
}: {
  note: Note;
  onEdit: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const inInput =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (inInput) return;

      if (
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "e") ||
        (event.key.toLowerCase() === "e" && !event.metaKey && !event.ctrlKey)
      ) {
        event.preventDefault();
        onEdit();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        router.push("/dashboard");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onEdit, router]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="flex h-9 w-9 items-center justify-center rounded-none text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Back to notes"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
          <BookOpen size={12} className="text-[var(--accent)]" />
          reading view
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 font-mono text-[10px] text-[var(--text-secondary)] sm:inline-flex">
            <Kbd>e</Kbd> to edit
          </span>
          <Button
            type="button"
            onClick={onEdit}
            className="h-8 gap-2 rounded-none bg-[var(--accent)] px-4 text-xs text-[var(--bg)] hover:bg-[var(--accent-hover)]"
          >
            <PenLine size={13} />
            edit
          </Button>
        </div>
      </div>

      <header className="mb-5">
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
          {note.title || "untitled"}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] lowercase text-[var(--text-secondary)]">
          <span>{noteKindLabel(note.note_type)}</span>
          <span>·</span>
          <span>{readingTimeMinutes(note.content)} min read</span>
          <span>·</span>
          <span>updated {formatNoteDate(note)}</span>
          {note.is_published && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                <Globe2 size={11} /> public
              </span>
            </>
          )}
        </div>
        {note.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {note.tags.map((tag) => (
              <Chip key={tag} className="pointer-events-none">
                #{tag}
              </Chip>
            ))}
          </div>
        )}
      </header>

      <MarkdownViewer content={note.content} />
    </div>
  );
}
