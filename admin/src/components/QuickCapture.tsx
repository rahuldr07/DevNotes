"use client";

import { Code2, FileText, Loader2, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { normalizeErrorMessage } from "@/lib/errors";
import { createNote } from "@/lib/note-api";
import type { Note } from "@/types/notes";

type CaptureMode = "note" | "snippet";

interface QuickCaptureProps {
  onCreated?: (note: Note) => void;
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

export function QuickCapture({ onCreated }: QuickCaptureProps) {
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<CaptureMode>("note");
  const [language, setLanguage] = useState("tsx");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const raw = content.trim();
    if (!raw) return;

    const nextMode: CaptureMode = raw.toLowerCase().startsWith("/snippet")
      ? "snippet"
      : raw.toLowerCase().startsWith("/note")
        ? "note"
        : mode;
    const nextContent = stripCommandPrefix(raw);

    setSaving(true);
    try {
      const note = await createNote({
        title: inferTitle(nextContent, nextMode),
        content: nextContent,
        tags: nextMode === "snippet" ? ["snippet"] : [],
        note_type: nextMode,
        language: nextMode === "snippet" ? language : null,
      });
      setContent("");
      onCreated?.(note);
      gooeyToast.success(
        nextMode === "snippet" ? "Snippet captured" : "Note captured",
        { description: "Saved to your DevNotes cockpit." },
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
    <div className="mt-7 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg)]/70 shadow-xl shadow-black/5 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Sparkles size={14} className="text-[var(--accent)]" />
          quick capture
          <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
            /snippet supported
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/60 p-1">
          {(["note", "snippet"] as const).map((item) => {
            const Icon = item === "note" ? FileText : Code2;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs transition-colors ${
                  mode === item
                    ? "bg-[var(--accent)] text-[var(--bg)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
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
          className="min-h-24 resize-none bg-transparent text-sm leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
        />
        <div className="flex flex-row items-end gap-2 lg:flex-col lg:justify-between">
          {mode === "snippet" && (
            <input
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              placeholder="lang"
              className="h-10 w-24 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/70 px-3 text-xs text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
          )}
          <Button
            type="button"
            onClick={submit}
            disabled={saving || !content.trim()}
            className="gap-2 rounded-2xl bg-[var(--accent)] px-4 text-[var(--bg)] hover:bg-[var(--accent-hover)]"
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
