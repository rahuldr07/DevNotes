"use client";

import {
  Check,
  Clipboard,
  Code2,
  ExternalLink,
  Hash,
  Layers3,
  RefreshCw,
  Search,
  Sparkles,
  Tags,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QuickCapture } from "@/components/QuickCapture";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { gooeyToast } from "@/components/ui/goey-toaster";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { copyToClipboard } from "@/lib/clipboard";
import { normalizeErrorMessage } from "@/lib/errors";
import { formatNoteDate } from "@/lib/format";
import { getSnippetNotesPage } from "@/lib/note-api";
import type { Note } from "@/types/notes";

const ALL_LANGUAGES = "all";
const UNKNOWN_LANGUAGE = "text";

function normalizeLanguage(language?: string | null) {
  return language?.trim().toLowerCase() || UNKNOWN_LANGUAGE;
}

/** Cards and the clipboard want runnable code. When the note has fenced
 *  blocks, use only their contents (surrounding prose stays in the editor);
 *  otherwise treat the whole note as code, minus any stray fence markers. */
function extractSnippetCode(content: string) {
  const fenced = Array.from(content.matchAll(/```[^\n]*\n([\s\S]*?)```/g))
    .map((match) => match[1].trimEnd())
    .filter(Boolean);
  if (fenced.length > 0) return fenced.join("\n\n").trim();
  return content.replace(/^```[^\n]*\n?/gm, "").trim();
}

function snippetPreview(content: string) {
  const trimmed = extractSnippetCode(content);
  return trimmed.length > 420 ? `${trimmed.slice(0, 420)}...` : trimmed;
}

function snippetLineCount(content: string) {
  return Math.max(1, extractSnippetCode(content).split("\n").length);
}

function formatSnippetDate(note: Note) {
  return formatNoteDate(note, "monthDay");
}

function groupByLanguage(snippets: Note[]) {
  const groups = new Map<string, Note[]>();
  for (const snippet of snippets) {
    const language = normalizeLanguage(snippet.language);
    groups.set(language, [...(groups.get(language) ?? []), snippet]);
  }
  return Array.from(groups.entries()).sort(([left], [right]) =>
    left.localeCompare(right),
  );
}

function topTagsForSnippets(snippets: Note[]) {
  const counts = new Map<string, number>();
  for (const snippet of snippets) {
    for (const tag of snippet.tags || []) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4);
}

function SnippetCard({ note }: { note: Note }) {
  const [copied, setCopied] = useState(false);
  const [copyCount, setCopyCount] = useState(0);
  const language = normalizeLanguage(note.language);
  const lines = snippetLineCount(note.content);

  const copy = async () => {
    if (await copyToClipboard(extractSnippetCode(note.content))) {
      setCopied(true);
      setCopyCount((count) => count + 1);
      gooeyToast.success("Snippet copied", {
        description: `${note.title || language} is ready on your clipboard.`,
      });
      window.setTimeout(() => setCopied(false), 1600);
    } else {
      gooeyToast.error("Copy failed", {
        description: "Clipboard access was blocked by the browser.",
      });
    }
  };

  return (
    <article className="group overflow-hidden rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/55 shadow-lg shadow-black/5 backdrop-blur transition-colors hover:border-[var(--accent)]/40 hover:shadow-md hover:shadow-black/10">
      <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5 rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-2 py-0.5 text-[var(--accent)]">
              <Code2 size={12} />
              {language}
            </span>
            <span>{lines} lines</span>
            <span>{copyCount > 0 ? `${copyCount} copied` : "copy-ready"}</span>
            <span>updated {formatSnippetDate(note)}</span>
          </div>
          <h2 className="line-clamp-2 text-base font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            {note.title || "Untitled snippet"}
          </h2>
        </div>
        <Button
          type="button"
          onClick={copy}
          variant="ghost"
          className="gap-2 rounded-none border border-[var(--border)] bg-[var(--bg)]/70 px-3 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)]/50 hover:text-[var(--text-primary)]"
        >
          {copied ? <Check size={14} /> : <Clipboard size={14} />}
          {copied ? "copied" : "copy"}
        </Button>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap bg-[var(--bg)]/38 p-4 font-mono text-xs leading-5 text-[var(--text-primary)]">
        {snippetPreview(note.content)}
      </pre>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--text-secondary)]">
        <div className="flex min-h-6 flex-wrap gap-1.5">
          {(note.tags || []).length > 0 ? (
            (note.tags || []).slice(0, 5).map((tag) => (
              <span
                key={`${note.id}-${tag}`}
                className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 px-2 py-0.5 text-[var(--accent)]"
              >
                #{tag}
              </span>
            ))
          ) : (
            <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
              <Hash size={12} /> no tags
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/dashboard/edit_note?id=${note.id}`}
            className="hover:text-[var(--accent)]"
          >
            edit
          </a>
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
      </div>
    </article>
  );
}

function SnippetEmptyState() {
  const examples = [
    "/snippet docker compose postgres healthcheck",
    "/snippet python fastapi dependency override",
    "/snippet git undo last commit safely",
  ];

  return (
    <EmptyState
      icon={<Code2 size={24} />}
      title="no snippets yet"
      description="Start a reusable vault for commands, configs, stack traces, SQL, regexes, and tiny fixes. Use quick capture above or create a snippet from the editor."
      action={
        <div className="grid max-w-2xl gap-2 text-left text-xs text-[var(--text-secondary)] md:grid-cols-3">
          {examples.map((example) => (
            <div
              key={example}
              className="rounded-none border border-[var(--border)] bg-[var(--bg)]/60 p-3 font-mono"
            >
              {example}
            </div>
          ))}
        </div>
      }
    />
  );
}

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(ALL_LANGUAGES);

  const fetchSnippets = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const page = await getSnippetNotesPage({ limit: 80 });
      setSnippets(page.items);
    } catch (err: unknown) {
      setError(normalizeErrorMessage(err, "Failed to load snippets"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSnippets();
  }, [fetchSnippets]);

  const languages = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of snippets) {
      const language = normalizeLanguage(note.language);
      counts.set(language, (counts.get(language) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }, [snippets]);

  const filteredSnippets = useMemo(() => {
    if (selectedLanguage === ALL_LANGUAGES) return snippets;
    return snippets.filter(
      (note) => normalizeLanguage(note.language) === selectedLanguage,
    );
  }, [selectedLanguage, snippets]);

  const groupedSnippets = useMemo(
    () => groupByLanguage(filteredSnippets),
    [filteredSnippets],
  );

  const stats = useMemo(
    () => [
      { label: "snippets", value: snippets.length, hint: "copy-ready items" },
      { label: "languages", value: languages.length, hint: "retrieval lanes" },
      {
        label: "tagged",
        value: snippets.filter((note) => note.tags.length > 0).length,
        hint: "tagged snippets",
      },
      {
        label: "sources",
        value: snippets.filter((note) => note.source_url).length,
        hint: "linked context",
      },
    ],
    [languages.length, snippets],
  );

  return (
    <div className="space-y-6">
      <section className="dev-panel overflow-hidden p-4 sm:p-5 lg:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div>
            <p className="type-eyebrow mb-3 text-[var(--accent)]">Snippets</p>
            <h1 className="type-hero max-w-3xl text-[var(--text-primary)]">
              Copy-ready patterns, commands, configs, and fixes.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Save reusable code blocks and commands for fast recall.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat) => (
              <StatTile
                key={stat.label}
                value={loading ? "—" : stat.value}
                label={stat.label}
                sublabel={stat.hint}
              />
            ))}
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={fetchSnippets}
            variant="ghost"
            className="gap-2 rounded-none border border-[var(--border)] bg-[var(--bg)]/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RefreshCw size={15} />
            refresh
          </Button>
          <a
            href="/dashboard/create_note"
            className="inline-flex h-9 items-center gap-2 rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
          >
            <Sparkles size={14} /> open editor
          </a>
        </div>
        <QuickCapture
          defaultMode="snippet"
          onCreated={(note) => {
            if (note.note_type === "snippet") {
              setSnippets((prev) => [note, ...prev]);
            }
          }}
        />
      </section>

      <section className="dev-panel p-4">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <Layers3 size={14} className="text-[var(--accent)]" />
              language lanes
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Filter by language or runtime.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/45 px-3 py-2 text-xs text-[var(--text-secondary)]">
            <Search size={14} /> snippets indexed
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip
            active={selectedLanguage === ALL_LANGUAGES}
            count={snippets.length}
            onClick={() => setSelectedLanguage(ALL_LANGUAGES)}
          >
            all
          </Chip>
          {languages.map(([language, count]) => (
            <Chip
              key={language}
              active={selectedLanguage === language}
              count={count}
              onClick={() => setSelectedLanguage(language)}
            >
              {language}
            </Chip>
          ))}
        </div>
      </section>

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
              className="h-72 rounded-none bg-[var(--bg-secondary)]"
            />
          ))}
        </div>
      ) : snippets.length === 0 ? (
        <SnippetEmptyState />
      ) : filteredSnippets.length === 0 ? (
        <EmptyState
          title={`no snippets in ${selectedLanguage}`}
          action={
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelectedLanguage(ALL_LANGUAGES)}
              className="text-[var(--accent)]"
            >
              show all snippets
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {groupedSnippets.map(([language, items]) => (
            <section key={language} className="space-y-3">
              <div className="flex flex-col gap-3 rounded-none border border-[var(--border)] bg-[var(--bg-secondary)]/35 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-none border border-[var(--border)] bg-[var(--bg)]/60 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    <Code2 size={13} className="text-[var(--accent)]" />
                    {language}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                    <span>
                      {items.length}{" "}
                      {items.length === 1 ? "snippet" : "snippets"}
                    </span>
                    <span>·</span>
                    <span>
                      {items.reduce(
                        (sum, item) => sum + snippetLineCount(item.content),
                        0,
                      )}{" "}
                      lines indexed
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                  <Tags size={12} className="text-[var(--accent)]" />
                  {topTagsForSnippets(items).length > 0 ? (
                    topTagsForSnippets(items).map(([tag, count]) => (
                      <span
                        key={`${language}-${tag}`}
                        className="rounded-none border border-[var(--border)] bg-[var(--bg)]/55 px-2 py-0.5 text-[var(--accent)]"
                      >
                        #{tag}{" "}
                        <span className="text-[var(--text-secondary)]">
                          {count}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span>no tag clusters yet</span>
                  )}
                </div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {items.map((note) => (
                  <SnippetCard key={note.id} note={note} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
