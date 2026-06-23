"use client";

import { Check, Clipboard, Code2, ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QuickCapture } from "@/components/QuickCapture";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { getSnippetNotesPage } from "@/lib/note-api";
import type { Note } from "@/types/notes";

function snippetPreview(content: string) {
  const trimmed = content.trim();
  return trimmed.length > 380 ? `${trimmed.slice(0, 380)}...` : trimmed;
}

function SnippetCard({ note }: { note: Note }) {
  const [copied, setCopied] = useState(false);
  const language = note.language || "text";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(note.content);
      setCopied(true);
      gooeyToast.success("Snippet copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      gooeyToast.error("Copy failed");
    }
  };

  return (
    <article className="group overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)]/55 shadow-lg shadow-black/5 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[var(--accent)]/40">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            <Code2 size={13} className="text-[var(--accent)]" />
            {language}
          </div>
          <h2 className="line-clamp-2 text-base font-semibold text-[var(--text-primary)]">
            {note.title || "Untitled snippet"}
          </h2>
        </div>
        <Button
          type="button"
          onClick={copy}
          variant="ghost"
          className="gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/60 px-3 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {copied ? <Check size={14} /> : <Clipboard size={14} />}
          {copied ? "copied" : "copy"}
        </Button>
      </div>
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap p-4 font-mono text-xs leading-5 text-[var(--text-primary)]">
        {snippetPreview(note.content)}
      </pre>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--text-secondary)]">
        <div className="flex flex-wrap gap-1.5">
          {(note.tags || []).slice(0, 4).map((tag) => (
            <span
              key={`${note.id}-${tag}`}
              className="rounded-full border border-[var(--border)] px-2 py-0.5 text-[var(--accent)]"
            >
              #{tag}
            </span>
          ))}
        </div>
        {note.source_url && (
          <a
            href={note.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-[var(--accent)]"
          >
            source <ExternalLink size={12} />
          </a>
        )}
      </div>
    </article>
  );
}

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSnippets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const page = await getSnippetNotesPage({ limit: 60 });
      setSnippets(page.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load snippets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  const languages = useMemo(() => {
    const values = new Set(
      snippets.map((note) => note.language).filter(Boolean) as string[],
    );
    return Array.from(values).sort();
  }, [snippets]);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-secondary)]/55 p-5 shadow-2xl shadow-black/5 backdrop-blur-xl sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[var(--accent)] opacity-[0.07] blur-3xl" />
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)]/70 px-3 py-1 text-xs text-[var(--text-secondary)]">
          <Code2 size={13} className="text-[var(--accent)]" />
          developer snippet vault
        </div>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-[-0.06em] text-[var(--text-primary)] sm:text-5xl">
              Copy-ready patterns, commands, configs, and fixes.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Capture code-heavy knowledge separately from long-form notes so it
              is fast to retrieve and reuse.
            </p>
          </div>
          <Button
            type="button"
            onClick={fetchSnippets}
            variant="ghost"
            className="gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RefreshCw size={15} />
            refresh
          </Button>
        </div>
        <QuickCapture
          onCreated={(note) => {
            if (note.note_type === "snippet") {
              setSnippets((prev) => [note, ...prev]);
            }
          }}
        />
      </section>

      {languages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {languages.map((language) => (
            <span
              key={language}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/60 px-3 py-1 text-xs text-[var(--text-secondary)]"
            >
              {language}
            </span>
          ))}
        </div>
      )}

      {error && (
        <Alert className="border-[var(--error)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            "snippet-skeleton-1",
            "snippet-skeleton-2",
            "snippet-skeleton-3",
            "snippet-skeleton-4",
          ].map((key) => (
            <Skeleton
              key={key}
              className="h-64 rounded-3xl bg-[var(--bg-secondary)]"
            />
          ))}
        </div>
      ) : snippets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--bg-secondary)]/35 p-8 text-center">
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            No snippets yet
          </p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Use quick capture above or type /snippet from the dashboard.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {snippets.map((note) => (
            <SnippetCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
