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
"use client";

import { ArrowLeft, Check, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { useSettings } from "@/hooks/useSettings";
import { api } from "@/lib/api";
import { normalizeTag, normalizeTags, stripMarkdown } from "@/lib/notes";

import { SharePopover } from "@/components/SharePopover";

// Dynamically import to avoid SSR issues with TipTap
const RichEditor = dynamic(() => import("@/components/ui/RichEditor"), {
  ssr: false,
});

interface NoteFormProps {
  mode: "create" | "edit";
  noteId?: number;
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialShareUuid?: string | null;
  initialPublished?: boolean;
  initialCommunity?: boolean;
}

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

export default function NoteForm({
  mode,
  initialTitle = "",
  initialContent = "",
  initialTags = [],
  noteId,
  initialShareUuid = null,
  initialPublished = false,
  initialCommunity = false,
}: NoteFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const router = useRouter();
  const { settings } = useSettings();

  const wordCount = content.trim()
    ? stripMarkdown(content).split(/\s+/).filter(Boolean).length
    : 0;
  const readTime = Math.max(1, Math.round(wordCount / 200));

  // Auto-save: only fires in edit mode, when enabled in settings, 5s after last keystroke
  const triggerAutoSave = useCallback(
    (newTitle: string, newContent: string, newTags: string[]) => {
      if (mode !== "edit" || !noteId || !settings.autoSave) {
        // If auto-save is off, cancel any pending save and reset status
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setSaveStatus("idle");
        return;
      }
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedRef.current) clearTimeout(savedRef.current);
      setSaveStatus("saving");
      debounceRef.current = setTimeout(async () => {
        // 2s debounce — fires when user stops typing for 2 seconds
        try {
          const normalizedTags = normalizeTags(newTags);
          await api.patch(`/notes/${noteId}/update`, {
            title: newTitle,
            content: newContent,
            tags: normalizedTags,
          });
          setSaveStatus("saved");
          savedRef.current = setTimeout(() => setSaveStatus("idle"), 2500);
        } catch {
          setSaveStatus("idle");
          gooeyToast.error("Auto-save failed");
        }
      }, 2000);
    },
    [mode, noteId, settings.autoSave],
  );

  // Skip auto-save on initial mount (avoid saving before user edits)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    triggerAutoSave(title, content, tags);
  }, [title, content, tags, triggerAutoSave]);

  // Cleanup timers on unmount
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedRef.current) clearTimeout(savedRef.current);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        setTitleError("Title is required");
        return;
      }
      setTitleError("");
      try {
        setLoading(true);
        const savePromise =
          mode === "create"
            ? api.post<NoteResponse>("/notes/create", {
                title,
                content,
                tags: normalizeTags(tags),
              })
            : api.patch<NoteResponse>(`/notes/${noteId}/update`, {
                title,
                content,
                tags: normalizeTags(tags),
              });

        await gooeyToast.promise(savePromise, {
          loading: mode === "create" ? "Creating note…" : "Saving changes…",
          success: mode === "create" ? "Note created!" : "Changes saved",
          error: (err: unknown) => {
            if (err instanceof Error) return err.message;
            return mode === "create"
              ? "Failed to create note"
              : "Failed to save note";
          },
        });
        router.push("/dashboard");
      } catch {
        // error already shown by promise toast
      } finally {
        setLoading(false);
      }
    },
    [title, content, tags, router, mode, noteId],
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back + breadcrumb */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
            <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--sub-color)" }}
            >
            <ArrowLeft size={14} />
            back to notes
            </Link>
            <span
            className="text-xs font-mono tracking-widest uppercase"
            style={{ color: "var(--sub-color)", opacity: 0.5 }}
            >
            {mode === "create" ? "new note" : "editing"}
            </span>
        </div>
        
        {/* Share Button - Only in edit mode */}
        {mode === "edit" && noteId && (
            <SharePopover 
                noteId={noteId} 
                initialPublished={initialPublished} 
                initialCommunity={initialCommunity}
                initialShareUuid={initialShareUuid}
            />
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Borderless title input with per-field inline error */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError("");
            }}
            placeholder="Note title"
            className="w-full bg-transparent border-none outline-none text-3xl font-bold tracking-tight placeholder:opacity-25 focus:ring-0"
            style={{
              color: titleError ? "var(--error-color)" : "var(--text-color)",
            }}
          />
          {titleError && (
            <p className="text-xs mt-1" style={{ color: "var(--error-color)" }}>
              {titleError}
            </p>
          )}
        </div>

        {/* Divider */}
        <div
          style={{ height: "1px", backgroundColor: "var(--border-color)" }}
        />

        {/* TipTap rich editor — stores/loads as Markdown */}
        <RichEditor
          initialContent={content}
          onChange={(markdown) => setContent(markdown)}
        />

        {/* Tags input */}
        <div className="space-y-2">
          <span
            className="text-xs uppercase tracking-wider font-mono block"
            style={{ color: "var(--sub-color)" }}
          >
            Tags
          </span>
          <div
            className="rounded-lg px-3 py-2"
            style={{
              backgroundColor: "var(--sub-alt-color)",
              border: "1px solid var(--border-color)",
            }}
          >
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setTags((prev) => prev.filter((t) => t !== tag))
                  }
                  className="text-xs px-2 py-1 rounded-full transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor:
                      "color-mix(in srgb, var(--main-color) 14%, transparent)",
                    color: "var(--main-color)",
                    border:
                      "1px solid color-mix(in srgb, var(--main-color) 40%, transparent)",
                  }}
                  title="Remove tag"
                >
                  #{tag} ×
                </button>
              ))}
              {tags.length === 0 && (
                <span className="text-xs" style={{ color: "var(--sub-color)" }}>
                  No tags yet
                </span>
              )}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  const cleaned = normalizeTag(tagInput);
                  if (!cleaned) return;
                  setTags((prev) =>
                    prev.includes(cleaned) ? prev : [...prev, cleaned],
                  );
                  setTagInput("");
                }
                if (e.key === "Backspace" && !tagInput && tags.length > 0) {
                  setTags((prev) => prev.slice(0, -1));
                }
              }}
              placeholder="Type a tag and press Enter (e.g. backend, ideas)"
              className="w-full bg-transparent border-none outline-none text-sm placeholder:opacity-50"
              style={{ color: "var(--text-color)" }}
            />
          </div>
        </div>

        {/* Bottom action bar — inside form so type="submit" works natively */}
        <div
          className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 h-14 z-30"
          style={{
            backgroundColor: "var(--sub-alt-color)",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <span className="text-xs" style={{ color: "var(--sub-color)" }}>
            {wordCount > 0
              ? `${wordCount} words · ${readTime} min read`
              : "start typing…"}
          </span>
          <div className="flex items-center gap-3">
            {/* Auto-save status — only shown in edit mode */}
            {mode === "edit" && !settings.autoSave && (
              <span
                className="text-xs font-mono"
                style={{ color: "var(--sub-color)", opacity: 0.5 }}
              >
                auto-save off
              </span>
            )}
            {mode === "edit" && settings.autoSave && saveStatus !== "idle" && (
              <span
                className="flex items-center gap-1.5 text-xs"
                style={{ color: "var(--sub-color)" }}
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Check size={12} style={{ color: "var(--main-color)" }} />{" "}
                    Saved
                  </>
                )}
              </span>
            )}
            <Link href="/dashboard">
              <Button
                variant="ghost"
                type="button"
                className="h-8 px-4 text-sm transition-opacity hover:opacity-70"
                style={{ color: "var(--sub-color)" }}
              >
                Discard
              </Button>
            </Link>
            {/* Create mode: manual save. Edit mode: auto-saves, but keep button for explicit save */}
            <Button
              type="submit"
              disabled={loading}
              className="h-8 px-4 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: "var(--main-color)",
                color: "var(--bg-color)",
                border: "none",
              }}
            >
              {loading ? "Saving…" : mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </div>
      </form>

      {/* Spacer so content doesn't hide behind fixed bar */}
      <div className="h-16" />
    </div>
  );
}
