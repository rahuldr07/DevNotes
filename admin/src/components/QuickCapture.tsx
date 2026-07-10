"use client";

import { Code2, FileText, Loader2, Plus } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { normalizeErrorMessage } from "@/lib/errors";
import { createNote } from "@/lib/note-api";
import type { CreateNoteInput, Note } from "@/types/notes";

type CaptureMode = "note" | "snippet";

interface CaptureTemplate {
  id: string;
  label: string;
  mode: CaptureMode;
  noteType: CreateNoteInput["note_type"];
  tags: string[];
  language?: string;
  content: string;
}

// One-click skeletons for the capture patterns developers repeat daily.
// The caret lands at the end of the first line, ready for the specifics.
const TEMPLATES: CaptureTemplate[] = [
  {
    id: "til",
    label: "til",
    mode: "note",
    noteType: "note",
    tags: ["til"],
    content: "TIL: \n\nwhat I learned:\n\nwhy it matters:\n",
  },
  {
    id: "bugfix",
    label: "bug fix",
    mode: "note",
    noteType: "note",
    tags: ["bugfix"],
    content: "Fix: \n\nsymptom:\n\nroot cause:\n\nthe fix:\n",
  },
  {
    id: "command",
    label: "command",
    mode: "snippet",
    noteType: "snippet",
    tags: ["cli"],
    language: "bash",
    content: "# what it does\n\n",
  },
  {
    id: "checklist",
    label: "checklist",
    mode: "note",
    noteType: "checklist",
    tags: ["checklist"],
    content: "Checklist: \n\n- [ ] \n- [ ] \n- [ ] \n",
  },
];

interface QuickCaptureProps {
  onCreated?: (note: Note) => void;
  /** Which mode the capture box starts in — snippet pages want "snippet". */
  defaultMode?: CaptureMode;
}

function inferTitle(content: string, mode: CaptureMode) {
  const firstLine = content.trim().split("\n").find(Boolean) || "Untitled";
  const cleaned = firstLine
    .replace(/^#+\s*/, "")
    .replace(/^\/\w+\s*/, "")
    .trim();
  if (cleaned.length > 70) return `${cleaned.slice(0, 67)}...`;
  return cleaned || (mode === "snippet" ? "Untitled snippet" : "Untitled note");
}

function stripCommandPrefix(value: string) {
  return value.replace(/^\/(snippet|note)\s+/i, "").trimStart();
}

export function QuickCapture({
  onCreated,
  defaultMode = "note",
}: QuickCaptureProps) {
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<CaptureMode>(defaultMode);
  const [language, setLanguage] = useState("tsx");
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<CaptureTemplate | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applyTemplate = (next: CaptureTemplate) => {
    setTemplate(next);
    setMode(next.mode);
    if (next.language) setLanguage(next.language);
    setContent(next.content);
    // Land the caret at the end of the headline line.
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      const caret = next.content.indexOf("\n");
      el.setSelectionRange(caret, caret);
    });
  };

  const submit = async () => {
    const raw = content.trim();
    if (!raw) return;

    const nextMode: CaptureMode = raw.toLowerCase().startsWith("/snippet")
      ? "snippet"
      : raw.toLowerCase().startsWith("/note")
        ? "note"
        : mode;
    const nextContent = stripCommandPrefix(raw);
    const activeTemplate = template?.mode === nextMode ? template : null;
    const tags = activeTemplate
      ? activeTemplate.tags
      : nextMode === "snippet"
        ? ["snippet"]
        : [];

    setSaving(true);
    try {
      const note = await createNote({
        title: inferTitle(nextContent, nextMode),
        content: nextContent,
        tags,
        note_type: activeTemplate?.noteType ?? nextMode,
        language: nextMode === "snippet" ? language : null,
      });
      setContent("");
      setTemplate(null);
      onCreated?.(note);
      gooeyToast.success(
        nextMode === "snippet" ? "Snippet captured" : "Note captured",
        { description: "Saved to your workspace." },
      );
    } catch (error: unknown) {
      const message = normalizeErrorMessage(error, "Capture failed");
      gooeyToast.error("Capture failed", {
        description: message,
        action: { label: "retry", onClick: submit },
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-7 overflow-hidden rounded-none border border-[var(--border)] bg-[var(--bg)]/70 shadow-sm shadow-black/5 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          Quick capture
        </div>
        <div className="flex items-center gap-4 border-l border-[var(--border)] pl-4">
          {(["note", "snippet"] as const).map((item) => {
            const Icon = item === "note" ? FileText : Code2;
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setTemplate(null);
                }}
                className={`inline-flex items-center gap-1.5 border-b py-1 text-xs transition-colors ${
                  mode === item
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={13} />
                {item}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              const submitCombo = event.metaKey || event.ctrlKey;
              // Notes save on plain Enter (Shift+Enter for a newline);
              // snippets are usually multi-line, so they keep Ctrl+Enter.
              const plainEnterSave =
                mode === "note" && !event.shiftKey && !submitCombo;
              if (submitCombo || plainEnterSave) {
                event.preventDefault();
                submit();
              }
            }}
            rows={mode === "snippet" ? 5 : 3}
            placeholder={
              mode === "snippet"
                ? "Paste a command, config, stack trace, or reusable code pattern..."
                : "What do you want to remember?"
            }
            className="min-h-24 w-full resize-none bg-transparent text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="font-mono text-[10px] text-[var(--text-secondary)]">
              {mode === "note"
                ? "enter saves · shift+enter for newline"
                : "ctrl+enter saves"}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                tpl:
              </span>
              {TEMPLATES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyTemplate(item)}
                  className="rounded-none border px-2 py-0.5 font-mono text-[10px] lowercase transition-colors hover:-translate-y-px"
                  style={{
                    color:
                      template?.id === item.id
                        ? "var(--accent)"
                        : "var(--text-secondary)",
                    borderColor:
                      template?.id === item.id
                        ? "var(--accent)"
                        : "var(--border)",
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-row items-end gap-2 lg:flex-col lg:justify-between">
          {mode === "snippet" && (
            <input
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              placeholder="lang"
              className="h-10 w-24 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/70 px-3 text-xs text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          )}
          <Button
            type="button"
            onClick={submit}
            disabled={saving || !content.trim()}
            className="gap-2 rounded-none bg-[var(--accent)] px-4 text-[var(--bg)] hover:bg-[var(--accent-hover)]"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            capture
          </Button>
        </div>
      </div>
    </div>
  );
}
