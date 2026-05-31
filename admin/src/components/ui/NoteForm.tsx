"use client";

import {
  ArrowLeft,
  Check,
  Clock3,
  History,
  Loader2,
  Save,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SharePopover } from "@/components/SharePopover";
import { Button } from "@/components/ui/button";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { useSettings } from "@/hooks/useSettings";
import { api } from "@/lib/api";
import { normalizeTag, normalizeTags, stripMarkdown } from "@/lib/notes";
import type { Note } from "@/types/notes";

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

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

function sameTags(left: string[], right: string[]) {
  return left.join("\u0000") === right.join("\u0000");
}

function statusCopy(status: SaveStatus, autoSave: boolean) {
  if (status === "saving") return "saving";
  if (status === "saved") return "saved";
  if (status === "error") return "save failed";
  if (!autoSave) return "manual save";
  return "autosave ready";
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
  const router = useRouter();
  const { settings } = useSettings();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState("");
  const [titleError, setTitleError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [shareUuid, setShareUuid] = useState(initialShareUuid);
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [isCommunity, setIsCommunity] = useState(initialCommunity);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const savedSnapshot = useRef({
    title: initialTitle,
    content: initialContent,
    tags: normalizeTags(initialTags),
  });

  const normalizedTags = useMemo(() => normalizeTags(tags), [tags]);
  const hasDirtyChanges =
    title !== savedSnapshot.current.title ||
    content !== savedSnapshot.current.content ||
    !sameTags(normalizedTags, savedSnapshot.current.tags);

  const wordCount = content.trim()
    ? stripMarkdown(content).split(/\s+/).filter(Boolean).length
    : 0;
  const readTime = Math.max(1, Math.round(wordCount / 200));

  const markSaved = useCallback(
    (nextTitle: string, nextContent: string, nextTags: string[]) => {
      savedSnapshot.current = {
        title: nextTitle,
        content: nextContent,
        tags: nextTags,
      };
      setLastSavedAt(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
      setSaveStatus("saved");
      if (savedRef.current) clearTimeout(savedRef.current);
      savedRef.current = setTimeout(() => setSaveStatus("idle"), 2200);
    },
    [],
  );

  const saveNote = useCallback(
    async ({ quiet = false }: { quiet?: boolean } = {}) => {
      const nextTitle = title.trim();
      const nextTags = normalizeTags(tags);

      if (!nextTitle) {
        setTitleError("Title is required");
        setSaveStatus("error");
        return null;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      setTitleError("");
      setLoading(true);
      setSaveStatus("saving");

      try {
        const request =
          mode === "create"
            ? api.post<Note>("/notes/create", {
                title: nextTitle,
                content,
                tags: nextTags,
              })
            : api.patch<Note>(`/notes/${noteId}/update`, {
                title: nextTitle,
                content,
                tags: nextTags,
              });

        const saved = await request;
        if (!quiet) {
          gooeyToast.success(mode === "create" ? "Note created" : "Saved");
        }

        markSaved(nextTitle, content, nextTags);
        if (saved.share_uuid) setShareUuid(saved.share_uuid);
        setIsPublished(Boolean(saved.is_published));
        setIsCommunity(Boolean(saved.is_community));

        if (mode === "create") {
          router.push("/dashboard");
        }

        return saved;
      } catch (err: unknown) {
        setSaveStatus("error");
        if (quiet) {
          const message = err instanceof Error ? err.message : "Save failed";
          gooeyToast.error(message);
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [content, markSaved, mode, noteId, router, tags, title],
  );

  const triggerAutoSave = useCallback(() => {
    if (mode !== "edit" || !noteId || !settings.autoSave) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSaveStatus(hasDirtyChanges ? "dirty" : "idle");
      return;
    }
    if (!hasDirtyChanges) {
      setSaveStatus("idle");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveStatus("dirty");
    debounceRef.current = setTimeout(() => {
      saveNote({ quiet: true });
    }, 2000);
  }, [hasDirtyChanges, mode, noteId, saveNote, settings.autoSave]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    triggerAutoSave();
  }, [triggerAutoSave]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedRef.current) clearTimeout(savedRef.current);
    },
    [],
  );

  const attemptBack = useCallback(() => {
    if (
      hasDirtyChanges &&
      !window.confirm("Discard unsaved changes and go back?")
    ) {
      return;
    }
    router.push("/dashboard");
  }, [hasDirtyChanges, router]);

  const togglePublish = useCallback(
    async (checked: boolean) => {
      if (mode !== "edit" || !noteId) return;
      const previousPublished = isPublished;
      const previousUuid = shareUuid;
      setIsPublished(checked);
      try {
        const updated = await api.patch<Note>(`/notes/${noteId}/update`, {
          is_published: checked,
        });
        setIsPublished(Boolean(updated.is_published));
        setShareUuid(updated.share_uuid ?? previousUuid);
        gooeyToast.success(checked ? "Published" : "Unpublished");
      } catch {
        setIsPublished(previousPublished);
        setShareUuid(previousUuid);
        gooeyToast.error("Failed to update publish settings");
      }
    },
    [isPublished, mode, noteId, shareUuid],
  );

  const toggleCommunity = useCallback(
    async (checked: boolean) => {
      if (mode !== "edit" || !noteId) return;
      const previous = isCommunity;
      setIsCommunity(checked);
      try {
        await api.patch<Note>(`/notes/${noteId}/update`, {
          is_community: checked,
        });
        gooeyToast.success(
          checked ? "Added to explore" : "Removed from explore",
        );
      } catch {
        setIsCommunity(previous);
        gooeyToast.error("Failed to update community settings");
      }
    },
    [isCommunity, mode, noteId],
  );

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveNote();
        return;
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "p"
      ) {
        event.preventDefault();
        togglePublish(!isPublished);
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        attemptBack();
      }
    };

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [attemptBack, isPublished, saveNote, togglePublish]);

  const addTag = useCallback(() => {
    const cleaned = normalizeTag(tagInput);
    if (!cleaned) return;
    setTags((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
    setTagInput("");
  }, [tagInput]);

  return (
    <div className="min-h-[calc(100vh-9rem)]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveNote();
        }}
      >
        <div
          className="sticky top-14 z-30 -mx-4 mb-8 bg-[var(--bg)] px-4 py-3 sm:-mx-6 sm:px-6"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={attemptBack}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Back to notes"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="hidden min-w-0 text-xs text-[var(--text-secondary)] sm:block">
                {mode === "create"
                  ? "new note"
                  : hasDirtyChanges
                    ? "unsaved"
                    : "editing"}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {mode === "edit" && noteId && (
                <>
                  <button
                    type="button"
                    disabled
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] opacity-60"
                    aria-label="Version history"
                    title="Version history"
                  >
                    <History size={15} />
                  </button>
                  <SharePopover
                    noteId={noteId}
                    isPublished={isPublished}
                    isCommunity={isCommunity}
                    shareUuid={shareUuid}
                    onPublishToggle={togglePublish}
                    onCommunityToggle={toggleCommunity}
                  />
                </>
              )}
              <span className="hidden items-center gap-1.5 px-2 text-xs text-[var(--text-secondary)] sm:flex">
                {saveStatus === "saving" ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : saveStatus === "saved" ? (
                  <Check size={12} className="text-[var(--success)]" />
                ) : saveStatus === "error" ? (
                  <X size={12} className="text-[var(--error)]" />
                ) : (
                  <Clock3 size={12} />
                )}
                {statusCopy(saveStatus, settings.autoSave)}
              </span>
              <Button
                type="submit"
                disabled={loading}
                className="gap-2 bg-[var(--accent)] px-3 text-xs text-[var(--bg)] hover:bg-[var(--accent-hover)]"
              >
                {loading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                save
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1000px]">
          <input
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (titleError) setTitleError("");
            }}
            placeholder="untitled"
            className="mb-3 w-full border-none bg-transparent text-3xl font-medium tracking-normal text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:ring-0 sm:text-4xl"
            aria-invalid={Boolean(titleError)}
          />
          {titleError && (
            <p className="mb-4 text-xs text-[var(--error)]">{titleError}</p>
          )}

          <div
            className="mb-8 flex flex-wrap items-center gap-2 pb-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setTags((prev) => prev.filter((item) => item !== tag))
                }
                className="text-xs text-[var(--accent)] transition-colors hover:text-[var(--accent-hover)]"
                title="Remove tag"
              >
                #{tag} x
              </button>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === ",") {
                  event.preventDefault();
                  addTag();
                }
                if (event.key === "Backspace" && !tagInput && tags.length > 0) {
                  setTags((prev) => prev.slice(0, -1));
                }
              }}
              onBlur={addTag}
              placeholder={tags.length ? "add tag" : "add tags"}
              className="min-w-24 flex-1 border-none bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:ring-0"
            />
          </div>

          <RichEditor
            initialContent={content}
            onChange={setContent}
            placeholder="start writing..."
          />
        </div>
      </form>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--bg)]"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="mx-auto flex h-11 max-w-[1000px] items-center justify-between px-4 text-xs text-[var(--text-secondary)] sm:px-6">
          <span>
            {wordCount > 0
              ? `${wordCount} words / ${readTime} min`
              : "start typing"}
          </span>
          <span>
            {lastSavedAt
              ? `saved ${lastSavedAt}`
              : statusCopy(saveStatus, settings.autoSave)}
          </span>
        </div>
      </div>
      <div className="h-14" />
    </div>
  );
}
