"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock3,
  Code2,
  FileCode,
  Globe2,
  Hash,
  History,
  Link2,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  Tags,
  Type,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SharePopover } from "@/components/SharePopover";
import { Button } from "@/components/ui/button";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { Segmented } from "@/components/ui/segmented";
import { VersionHistoryDrawer } from "@/components/VersionHistoryDrawer";
import { useSettings } from "@/hooks/useSettings";
import { normalizeErrorMessage } from "@/lib/errors";
import { createNote, updateNote } from "@/lib/note-api";
import { normalizeTag, normalizeTags, stripMarkdown } from "@/lib/notes";
import { countWords, readingTimeMinutes } from "@/lib/reading";
import type { NoteVersion } from "@/types/notes";

const RichEditor = dynamic(() => import("@/components/ui/RichEditor"), {
  ssr: false,
});

interface NoteFormProps {
  mode: "create" | "edit";
  noteId?: number;
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialNoteType?: "note" | "snippet" | "guide" | "checklist";
  initialLanguage?: string | null;
  initialSourceUrl?: string | null;
  initialShareUuid?: string | null;
  initialPublished?: boolean;
  initialCommunity?: boolean;
  /** Switch back to the reading view (edit mode only). Ctrl+E also fires it. */
  onView?: () => void;
}

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
type NoteType = "note" | "snippet" | "guide" | "checklist";

const noteTypes: Array<{ value: NoteType; label: string; hint: string }> = [
  { value: "note", label: "Note", hint: "long-form thought" },
  { value: "snippet", label: "Snippet", hint: "copy-ready code" },
  { value: "guide", label: "Guide", hint: "publishable walkthrough" },
  { value: "checklist", label: "Checklist", hint: "repeatable process" },
];

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

function countCodeBlocks(markdown: string) {
  return markdown.match(/```/g)?.length
    ? Math.floor((markdown.match(/```/g)?.length ?? 0) / 2)
    : 0;
}

function extractOutline(markdown: string) {
  return markdown
    .split("\n")
    .map((line) => line.match(/^(#{1,3})\s+(.+)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .slice(0, 6)
    .map((match) => ({
      level: match[1].length,
      title: stripMarkdown(match[2]) || match[2].trim(),
    }));
}

function getReadinessLabel(score: number) {
  if (score >= 85) return "ship ready";
  if (score >= 60) return "almost ready";
  if (score >= 35) return "needs shape";
  return "rough draft";
}

export default function NoteForm({
  mode,
  initialTitle = "",
  initialContent = "",
  initialTags = [],
  initialNoteType = "note",
  initialLanguage = null,
  initialSourceUrl = null,
  noteId,
  initialShareUuid = null,
  initialPublished = false,
  initialCommunity = false,
  onView,
}: NoteFormProps) {
  const router = useRouter();
  const { settings } = useSettings();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [noteType, setNoteType] = useState<NoteType>(initialNoteType);
  const [language, setLanguage] = useState(initialLanguage ?? "");
  const [sourceUrl, setSourceUrl] = useState(initialSourceUrl ?? "");
  const [tagInput, setTagInput] = useState("");
  const [titleError, setTitleError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [shareUuid, setShareUuid] = useState(initialShareUuid);
  const [isPublished, setIsPublished] = useState(initialPublished);
  const [isCommunity, setIsCommunity] = useState(initialCommunity);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const savedSnapshot = useRef({
    title: initialTitle,
    content: initialContent,
    tags: normalizeTags(initialTags),
    noteType: initialNoteType,
    language: initialLanguage ?? "",
    sourceUrl: initialSourceUrl ?? "",
  });

  const normalizedTags = useMemo(() => normalizeTags(tags), [tags]);
  const hasDirtyChanges =
    title !== savedSnapshot.current.title ||
    content !== savedSnapshot.current.content ||
    noteType !== savedSnapshot.current.noteType ||
    language !== savedSnapshot.current.language ||
    sourceUrl !== savedSnapshot.current.sourceUrl ||
    !sameTags(normalizedTags, savedSnapshot.current.tags);

  const wordCount = content.trim() ? countWords(content) : 0;
  const readTime = readingTimeMinutes(content);
  const characterCount = stripMarkdown(content).length;
  const lineCount = Math.max(1, content.split("\n").length);
  const codeBlockCount = countCodeBlocks(content);
  const outline = useMemo(() => extractOutline(content), [content]);
  const readinessScore = Math.min(
    100,
    (title.trim() ? 20 : 0) +
      (wordCount >= 80 ? 25 : Math.floor(wordCount / 4)) +
      (normalizedTags.length > 0 ? 20 : 0) +
      (outline.length > 0 ? 15 : 0) +
      (noteType === "snippet" && language.trim() ? 10 : 0) +
      (sourceUrl.trim() ? 10 : 0),
  );
  const readinessLabel = getReadinessLabel(readinessScore);

  const markSaved = useCallback(
    (
      nextTitle: string,
      nextContent: string,
      nextTags: string[],
      nextNoteType: NoteType,
      nextLanguage: string,
      nextSourceUrl: string,
    ) => {
      savedSnapshot.current = {
        title: nextTitle,
        content: nextContent,
        tags: nextTags,
        noteType: nextNoteType,
        language: nextLanguage,
        sourceUrl: nextSourceUrl,
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
      const nextLanguage =
        noteType === "snippet" ? language.trim().toLowerCase() : "";
      const nextSourceUrl = sourceUrl.trim();

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
        const payload = {
          title: nextTitle,
          content,
          tags: nextTags,
          note_type: noteType,
          language: nextLanguage || null,
          source_url: nextSourceUrl || null,
        };
        const saved = await (mode === "create"
          ? createNote(payload)
          : updateNote(noteId as number, payload));
        if (!quiet) {
          gooeyToast.success(mode === "create" ? "Note created" : "Saved");
        }

        markSaved(
          nextTitle,
          content,
          nextTags,
          noteType,
          nextLanguage,
          nextSourceUrl,
        );
        if (saved.share_uuid) setShareUuid(saved.share_uuid);
        setIsPublished(Boolean(saved.is_published));
        setIsCommunity(Boolean(saved.is_community));

        if (mode === "create") {
          router.push("/dashboard");
        }

        return saved;
      } catch (err: unknown) {
        setSaveStatus("error");
        const message = normalizeErrorMessage(err, "Save failed");
        gooeyToast.error(quiet ? "Autosave failed" : "Save failed", {
          description: message,
          action: {
            label: "retry",
            onClick: () => {
              saveNote({ quiet });
            },
          },
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [
      content,
      language,
      markSaved,
      mode,
      noteId,
      noteType,
      router,
      sourceUrl,
      tags,
      title,
    ],
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

  // Long titles wrap instead of clipping: grow the textarea to fit.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rerun on every title change so the resize happens after the DOM reflects the new text.
  useEffect(() => {
    const element = titleRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [title]);

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
        const updated = await updateNote(noteId, { is_published: checked });
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
        await updateNote(noteId, { is_community: checked });
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

  const restoreVersion = useCallback(
    async (version: NoteVersion) => {
      if (mode !== "edit" || !noteId) return;
      const nextTags = normalizeTags(version.tags);
      setRestoringVersion(true);
      setLoading(true);
      setSaveStatus("saving");
      try {
        const restored = await updateNote(noteId, {
          title: version.title,
          content: version.content,
          tags: nextTags,
        });
        const nextTitle = restored.title ?? version.title;
        const nextContent = restored.content ?? version.content;
        const restoredTags = normalizeTags(restored.tags ?? nextTags);
        setTitle(nextTitle);
        setContent(nextContent);
        setTags(restoredTags);
        setTagInput("");
        markSaved(
          nextTitle,
          nextContent,
          restoredTags,
          noteType,
          language,
          sourceUrl,
        );
        setHistoryOpen(false);
        gooeyToast.success(`Restored v${version.version_number}`);
      } catch (err: unknown) {
        setSaveStatus("error");
        gooeyToast.error("Restore failed", {
          description: normalizeErrorMessage(err, "Could not restore."),
        });
      } finally {
        setLoading(false);
        setRestoringVersion(false);
      }
    },
    [language, markSaved, mode, noteId, noteType, sourceUrl],
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

      // Ctrl+1–4 switches the note type without leaving the keyboard.
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        ["1", "2", "3", "4"].includes(event.key)
      ) {
        event.preventDefault();
        const next = noteTypes[Number(event.key) - 1];
        if (next) setNoteType(next.value);
        return;
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "e" &&
        onView
      ) {
        event.preventDefault();
        onView();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        // Reading view is "closed" state for a note (research: Obsidian's
        // stuck-in-edit flaw); only fall back to the dashboard without one.
        if (onView) {
          onView();
        } else {
          attemptBack();
        }
      }
    };

    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, [attemptBack, isPublished, saveNote, togglePublish, onView]);

  const addTag = useCallback(() => {
    const cleaned = normalizeTag(tagInput);
    if (!cleaned) return;
    setTags((prev) => (prev.includes(cleaned) ? prev : [...prev, cleaned]));
    setTagInput("");
  }, [tagInput]);

  return (
    <div className="relative min-h-[calc(100vh-9rem)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_35%_0%,color-mix(in_srgb,var(--accent)_10%,transparent),transparent_34%),radial-gradient(circle_at_80%_20%,color-mix(in_srgb,var(--accent)_6%,transparent),transparent_28%)]" />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveNote();
        }}
      >
        <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-[var(--border)] bg-[var(--bg)]/92 px-4 py-2 shadow-sm shadow-black/5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-7 lg:px-7">
          <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={attemptBack}
                className="flex h-9 w-9 items-center justify-center rounded-none text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Back to notes"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="flex h-10 min-w-0 items-center gap-2 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/55 px-4 text-xs text-[var(--text-secondary)] shadow-sm shadow-black/5">
                <span className="h-2 w-2 rounded-none bg-[var(--accent)]" />
                <span className="truncate text-[var(--text-primary)]">
                  {title.trim() || "untitled"}.md
                </span>
                {hasDirtyChanges && (
                  <span className="text-[var(--accent)]">●</span>
                )}
              </div>
              <span className="hidden rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/45 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)] md:inline-flex">
                {mode === "create" ? "new file" : "editor workbench"}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {onView && (
                <button
                  type="button"
                  onClick={onView}
                  className="flex h-8 items-center gap-1.5 rounded-none px-2 text-xs text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                  title="Reading view (Ctrl+E)"
                >
                  <BookOpen size={15} />
                  view
                </button>
              )}
              {mode === "edit" && noteId && (
                <>
                  <button
                    type="button"
                    onClick={() => setHistoryOpen(true)}
                    className="flex h-8 w-8 items-center justify-center rounded-none text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
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
                className="gap-2 rounded-none bg-[var(--accent)] px-4 text-xs text-[var(--bg)] shadow-lg shadow-black/10 hover:bg-[var(--accent-hover)]"
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

        <div className="mx-auto grid max-w-[92rem] gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <section className="min-w-0 overflow-hidden rounded-none border border-[var(--border)] bg-[var(--bg)]/78 shadow-md shadow-black/5 backdrop-blur-xl">
            <div className="relative border-b border-[var(--border)] bg-[var(--bg-secondary)]/38 px-5 py-6 sm:px-7">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-70" />
              <textarea
                ref={titleRef}
                value={title}
                rows={1}
                onChange={(event) => {
                  setTitle(event.target.value.replace(/[\r\n]+/g, " "));
                  if (titleError) setTitleError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                placeholder="untitled"
                className="w-full resize-none overflow-hidden border-none bg-transparent text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:ring-0 sm:text-5xl"
                aria-invalid={Boolean(titleError)}
              />
              {titleError && (
                <p className="mt-3 text-xs text-[var(--error)]">{titleError}</p>
              )}

              {/* One quiet properties strip (Obsidian-style): type + tags +
                  status, off the writing surface but one interaction away. */}
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--border)]/70 pt-3">
                <Segmented
                  options={noteTypes.map((item) => ({
                    value: item.value,
                    label: item.label.toLowerCase(),
                  }))}
                  value={noteType}
                  onChange={setNoteType}
                />
                <span className="h-4 w-px bg-[var(--border)]" />
                {tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() =>
                      setTags((prev) => prev.filter((item) => item !== tag))
                    }
                    className="rounded-none font-mono text-[11px] lowercase text-[var(--accent)] transition-colors hover:text-[var(--error)]"
                    title="Remove tag"
                  >
                    #{tag}
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
                    if (
                      event.key === "Backspace" &&
                      !tagInput &&
                      tags.length > 0
                    ) {
                      setTags((prev) => prev.slice(0, -1));
                    }
                  }}
                  onBlur={addTag}
                  placeholder={tags.length ? "+ tag" : "+ add tags"}
                  className="min-w-24 flex-1 border-none bg-transparent font-mono text-[11px] lowercase text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/70 focus:ring-0"
                />
                {isPublished && (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] lowercase text-[var(--accent)]">
                    <Globe2 size={11} /> public
                  </span>
                )}
              </div>
            </div>

            <div className="px-5 py-6 sm:px-7 lg:px-10">
              <RichEditor
                initialContent={content}
                onChange={setContent}
                placeholder="// start writing your note, snippet, runbook, or guide..."
              />
              <div className="mt-5 grid gap-3 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/35 p-4 xl:hidden">
                <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                  <Tags size={13} className="text-[var(--accent)]" /> metadata
                </p>
                {noteType === "snippet" && (
                  <label className="grid gap-2 text-xs text-[var(--text-secondary)]">
                    language
                    <input
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      placeholder="tsx, py, sql..."
                      className="rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-2 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </label>
                )}
                <label className="grid gap-2 text-xs text-[var(--text-secondary)]">
                  source url
                  <input
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    placeholder="https://..."
                    className="rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-2 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </label>
              </div>
            </div>
          </section>

          <aside className="hidden self-start overflow-hidden rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/45 p-4 shadow-md shadow-black/5 backdrop-blur-xl xl:block">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              inspector
            </p>
            <div className="space-y-3 text-xs text-[var(--text-secondary)]">
              <div className="overflow-hidden rounded-none border border-[var(--border)] bg-[var(--bg)]/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    <Sparkles size={13} className="text-[var(--accent)]" />{" "}
                    readiness
                  </span>
                  <span className="font-semibold text-[var(--accent)]">
                    {readinessScore}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-none bg-[var(--bg-secondary)]">
                  <div
                    className="h-full rounded-none bg-[var(--accent)] transition-all"
                    style={{ width: `${readinessScore}%` }}
                  />
                </div>
                <p className="mt-3 font-semibold capitalize text-[var(--text-primary)]">
                  {readinessLabel}
                </p>
                <p className="mt-1 leading-5">
                  Add title, tags, structure, source, and language metadata to
                  make this easier to reuse and publish.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "words",
                    value: wordCount,
                    icon: <Type size={13} />,
                  },
                  {
                    label: "read",
                    value: `${readTime}m`,
                    icon: <BookOpen size={13} />,
                  },
                  {
                    label: "lines",
                    value: lineCount,
                    icon: <FileCode size={13} />,
                  },
                  {
                    label: "code",
                    value: codeBlockCount,
                    icon: <Code2 size={13} />,
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 p-3"
                  >
                    <div className="mb-2 text-[var(--accent)]">{stat.icon}</div>
                    <p className="text-lg font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                      {stat.value}
                    </p>
                    <p className="uppercase tracking-[0.14em]">{stat.label}</p>
                  </div>
                ))}
              </div>

              {noteType === "snippet" && (
                <div className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 p-3">
                  <label
                    className="inline-flex items-center gap-2 text-[var(--text-secondary)]"
                    htmlFor="note-language"
                  >
                    <Code2 size={13} className="text-[var(--accent)]" />
                    language
                  </label>
                  <input
                    id="note-language"
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    placeholder="tsx, py, sql..."
                    className="mt-2 w-full rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/50 px-2 py-2 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
              )}
              <div className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 p-3">
                <label
                  className="inline-flex items-center gap-2 text-[var(--text-secondary)]"
                  htmlFor="source-url"
                >
                  <Link2 size={13} className="text-[var(--accent)]" />
                  source url
                </label>
                <input
                  id="source-url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://..."
                  className="mt-2 w-full rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/50 px-2 py-2 text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>
              <div className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 p-3">
                <p className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  <Hash size={13} className="text-[var(--accent)]" /> outline
                </p>
                {outline.length > 0 ? (
                  <div className="space-y-2">
                    {outline.map((item, index) => (
                      <p
                        key={`${item.title}-${index}`}
                        className="truncate text-[var(--text-primary)]"
                        style={{ paddingLeft: `${(item.level - 1) * 10}px` }}
                      >
                        {"#".repeat(item.level)} {item.title}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="leading-5">
                    Add headings to create a navigable outline.
                  </p>
                )}
              </div>
              <div className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 p-3">
                <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  <Globe2 size={13} className="text-[var(--accent)]" />{" "}
                  visibility
                </p>
                <p className="text-[var(--text-primary)]">
                  {isPublished ? "published" : "private"}
                  {isCommunity ? " · explore" : ""}
                </p>
                <p className="mt-2 leading-5">
                  {mode === "edit"
                    ? "Use Share to publish, copy the link, or add it to Explore."
                    : "Save first, then publish from the editor toolbar."}
                </p>
              </div>
            </div>
          </aside>
        </div>

        <div className="mx-auto mt-4 flex max-w-[92rem] flex-col gap-2 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/60 px-4 py-3 text-xs text-[var(--text-secondary)] shadow-lg shadow-black/5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <span>
            {wordCount > 0
              ? `${noteType} · ${wordCount} words · ${characterCount} chars · ${readTime} min`
              : `${noteType} · start typing`}
          </span>
          <span className="inline-flex items-center gap-2">
            {saveStatus === "saving" ? (
              <Loader2 size={12} className="animate-spin" />
            ) : saveStatus === "saved" ? (
              <Check size={12} className="text-[var(--success)]" />
            ) : saveStatus === "error" ? (
              <X size={12} className="text-[var(--error)]" />
            ) : (
              <Clock3 size={12} />
            )}
            {lastSavedAt
              ? `saved ${lastSavedAt}`
              : statusCopy(saveStatus, settings.autoSave)}
          </span>
        </div>
      </form>

      {mode === "edit" && noteId && (
        <VersionHistoryDrawer
          open={historyOpen}
          noteId={noteId}
          current={{ title, content, tags: normalizedTags }}
          restoring={restoringVersion}
          onClose={() => setHistoryOpen(false)}
          onRestore={restoreVersion}
        />
      )}
    </div>
  );
}
