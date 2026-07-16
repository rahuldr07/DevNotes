/**
 * Ask Workspace — retrieval-first Q&A over your own notes.
 *
 * Route: /dashboard/ask
 *
 * Ask a question, get ranked source cards pulled from your workspace via
 * the backend's full-text search (websearch_to_tsquery + ts_rank on
 * Postgres). This is deliberately retrieval-only: when LLM synthesis
 * lands, the generated answer will sit above these same source cards and
 * cite them — no citation, no answer.
 */
"use client";

import {
  ArrowRight,
  CornerDownLeft,
  FileText,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CopyContentButton } from "@/components/CopyContentButton";
import { Reveal } from "@/components/motion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Chip } from "@/components/ui/chip";
import { formatDate } from "@/lib/format";
import { searchNotes } from "@/lib/note-api";
import { previewText } from "@/lib/notes";
import type { Note } from "@/types/notes";

const RECENT_QUESTIONS_KEY = "devnotes-ask-recent";
const MAX_RECENT_QUESTIONS = 6;
const SOURCE_LIMIT = 8;

const TYPE_FILTERS = [
  { value: "", label: "everything" },
  { value: "note", label: "notes" },
  { value: "snippet", label: "snippets" },
  { value: "guide", label: "guides" },
  { value: "checklist", label: "checklists" },
];

const SAMPLE_QUESTIONS = [
  "docker compose networking",
  "jwt refresh rotation",
  "postgres upsert on conflict",
];

/** Mirror of the backend's _search_terms tokenizer (note_repo.py). */
function questionTerms(question: string): string[] {
  return (question.toLowerCase().match(/[\w#+.-]+/g) ?? []).filter(
    (term) => term.length > 1,
  );
}

interface ExcerptSegment {
  start: number;
  text: string;
  hit: boolean;
}

/** Slice a readable window around the first term hit and mark matches. */
function buildExcerpt(
  content: string,
  terms: string[],
  windowSize = 260,
): ExcerptSegment[] {
  const plain = previewText(content).replace(/\s+/g, " ").trim();
  if (!plain) return [];

  const lower = plain.toLowerCase();
  let anchor = -1;
  for (const term of terms) {
    const index = lower.indexOf(term);
    if (index !== -1 && (anchor === -1 || index < anchor)) {
      anchor = index;
    }
  }

  const start = Math.max(0, (anchor === -1 ? 0 : anchor) - 60);
  const raw = plain.slice(start, start + windowSize);
  const excerpt = `${start > 0 ? "…" : ""}${raw}${
    start + windowSize < plain.length ? "…" : ""
  }`;

  if (!terms.length) {
    return [{ start: 0, text: excerpt, hit: false }];
  }

  const escaped = terms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const termSet = new Set(terms);
  const segments: ExcerptSegment[] = [];
  let offset = 0;
  for (const part of excerpt.split(pattern)) {
    if (part) {
      segments.push({
        start: offset,
        text: part,
        hit: termSet.has(part.toLowerCase()),
      });
    }
    offset += part.length;
  }
  return segments;
}

function formatSourceDate(date: string | null) {
  return formatDate(date) || "—";
}

export default function AskWorkspacePage() {
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [noteType, setNoteType] = useState("");
  const [sources, setSources] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentQuestions, setRecentQuestions] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_QUESTIONS_KEY);
      if (stored) setRecentQuestions(JSON.parse(stored));
    } catch {
      // Ignore corrupted local history.
    }
    return () => abortRef.current?.abort();
  }, []);

  const rememberQuestion = useCallback((asked: string) => {
    setRecentQuestions((previous) => {
      const next = [
        asked,
        ...previous.filter((entry) => entry !== asked),
      ].slice(0, MAX_RECENT_QUESTIONS);
      try {
        localStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(next));
      } catch {
        // Storage may be unavailable; history is a nicety, not a requirement.
      }
      return next;
    });
  }, []);

  const ask = useCallback(
    async (rawQuestion: string, type: string) => {
      const trimmed = rawQuestion.trim();
      if (!trimmed) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setQuestion(trimmed);
      setAskedQuestion(trimmed);
      setLoading(true);
      setError("");
      rememberQuestion(trimmed);

      try {
        const page = await searchNotes(trimmed, controller.signal, {
          noteType: type || undefined,
          limit: SOURCE_LIMIT,
        });
        if (!controller.signal.aborted) {
          setSources(page.items);
        }
      } catch (askError: unknown) {
        if (
          !(askError instanceof DOMException && askError.name === "AbortError")
        ) {
          setError("Could not reach your workspace index. Try again.");
          setSources([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [rememberQuestion],
  );

  const terms = questionTerms(askedQuestion);

  return (
    <div className="space-y-5">
      {/* ── Ask console ── */}
      <Reveal>
        <section className="dev-panel relative overflow-hidden p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
              <Sparkles size={14} className="text-[var(--accent)]" />
              ask workspace
            </div>
            <span className="dev-chip px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              retrieval mode · ranked by postgres fts
            </span>
          </div>

          <h1 className="type-page-title mt-4 text-2xl text-[var(--text-primary)] sm:text-3xl">
            Ask your past self before you ask the internet.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Questions run against your own notes and snippets with ranked
            full-text retrieval. Answer synthesis will cite these exact sources
            when it ships — the sources are already the answer most days.
          </p>

          <form
            className="mt-5"
            onSubmit={(event) => {
              event.preventDefault();
              ask(question, noteType);
            }}
          >
            <div className="flex items-center gap-3 border border-[var(--border)] bg-[var(--bg)]/70 px-3 py-1.5 transition-colors focus-within:border-[var(--accent)]/60">
              <Search size={16} className="shrink-0 text-[var(--accent)]" />
              <input
                ref={inputRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="what do i know about…"
                className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]/60"
                // biome-ignore lint/a11y/noAutofocus: the question input is the sole purpose of this page
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-none px-4 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}
              >
                {loading ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CornerDownLeft size={13} />
                )}
                ask
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {TYPE_FILTERS.map((filter) => (
                <Chip
                  key={filter.value || "all"}
                  active={noteType === filter.value}
                  onClick={() => {
                    setNoteType(filter.value);
                    if (askedQuestion) ask(askedQuestion, filter.value);
                  }}
                >
                  {filter.label}
                </Chip>
              ))}
            </div>
          </form>

          {recentQuestions.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="type-eyebrow text-[var(--text-secondary)]">
                recent
              </span>
              {recentQuestions.map((recent) => (
                <button
                  key={recent}
                  type="button"
                  onClick={() => ask(recent, noteType)}
                  className="dev-chip px-2.5 py-1 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                >
                  {recent}
                </button>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      {error && (
        <Alert className="border-[var(--error)] bg-[var(--bg-secondary)] text-[var(--text-primary)]">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Results ── */}
      {askedQuestion && !error ? (
        <Reveal delay={0.05}>
          <section className="dev-panel p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                <FileText size={14} className="text-[var(--accent)]" />
                sources for “{askedQuestion}”
              </div>
              <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                {loading
                  ? "scanning workspace…"
                  : `${sources.length} source${sources.length === 1 ? "" : "s"} · ranked by relevance`}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 p-6 text-sm text-[var(--text-secondary)]">
                <Loader2
                  size={15}
                  className="animate-spin text-[var(--accent)]"
                />
                retrieving ranked matches…
              </div>
            ) : sources.length === 0 ? (
              <div className="flex flex-col items-start gap-3 p-6">
                <p className="text-sm text-[var(--text-primary)]">
                  Nothing in your workspace matches that yet.
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Try fewer or different words — or make today the day this
                  answer gets captured.
                </p>
                <Link
                  href="/dashboard/create_note"
                  className="inline-flex items-center gap-2 rounded-none border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                >
                  write it down now <ArrowRight size={13} />
                </Link>
              </div>
            ) : (
              <ol className="space-y-3">
                {sources.map((source, index) => {
                  const segments = buildExcerpt(source.content, terms);
                  return (
                    <li
                      key={source.id}
                      className="group border border-[var(--border)] bg-[var(--bg)]/45 p-4 transition-colors hover:border-[var(--accent)]/50"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11px] text-[var(--accent)]">
                          [{index + 1}]
                        </span>
                        <Link
                          href={`/dashboard/edit_note?id=${source.id}`}
                          className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
                        >
                          {source.title}
                        </Link>
                        <span className="dev-chip px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          {source.note_type ?? "note"}
                        </span>
                        {source.language && (
                          <span className="dev-chip px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.12em] text-[var(--accent)]">
                            {source.language}
                          </span>
                        )}
                      </div>

                      {segments.length > 0 && (
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          {segments.map((segment) =>
                            segment.hit ? (
                              <mark
                                key={segment.start}
                                className="bg-transparent font-medium"
                                style={{ color: "var(--accent)" }}
                              >
                                {segment.text}
                              </mark>
                            ) : (
                              <span key={segment.start}>{segment.text}</span>
                            ),
                          )}
                        </p>
                      )}

                      {source.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {source.tags.map((tag) => (
                            <span
                              key={tag}
                              className="dev-chip px-2 py-0.5 text-[0.68rem] text-[var(--text-secondary)]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2.5">
                        <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                          updated{" "}
                          {formatSourceDate(
                            source.updated_at ?? source.created_at,
                          )}
                        </span>
                        <div className="flex items-center gap-1">
                          <CopyContentButton
                            content={source.content}
                            className="h-8 gap-1.5 rounded-none px-2.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]"
                          />
                          <Link
                            href={`/dashboard/edit_note?id=${source.id}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-none px-2.5 text-xs text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                          >
                            open <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </Reveal>
      ) : (
        !error && (
          /* ── Pre-ask empty state ── */
          <Reveal delay={0.05}>
            <section className="dev-panel p-6">
              <div className="flex flex-col items-start gap-4">
                <p className="type-eyebrow text-[var(--text-secondary)]">
                  how it works
                </p>
                <div className="grid gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
                  {[
                    [
                      "01 · ask",
                      "Type a question the way you'd search your own memory.",
                    ],
                    [
                      "02 · retrieve",
                      "Ranked full-text search pulls the most relevant notes and snippets.",
                    ],
                    [
                      "03 · reuse",
                      "Copy the source, open it in the editor, or capture the missing note.",
                    ],
                  ].map(([step, body]) => (
                    <div key={step} className="bg-[var(--bg)] p-4">
                      <p className="font-mono text-[11px] text-[var(--accent)]">
                        {step}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                        {body}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="type-eyebrow text-[var(--text-secondary)]">
                    try
                  </span>
                  {SAMPLE_QUESTIONS.map((sample) => (
                    <Chip
                      key={sample}
                      onClick={() => {
                        setQuestion(sample);
                        ask(sample, noteType);
                      }}
                    >
                      {sample}
                    </Chip>
                  ))}
                </div>
              </div>
            </section>
          </Reveal>
        )
      )}
    </div>
  );
}
