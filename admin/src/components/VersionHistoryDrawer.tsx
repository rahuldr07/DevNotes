"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clock3, Loader2, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ReadOnlyEditor } from "@/components/ReadOnlyEditor";
import { Button } from "@/components/ui/button";
import { getNoteVersions } from "@/lib/note-api";
import type { NoteVersion } from "@/types/notes";

interface VersionHistoryDrawerProps {
  open: boolean;
  noteId: number;
  current: {
    title: string;
    content: string;
    tags: string[];
  };
  restoring: boolean;
  onClose: () => void;
  onRestore: (version: NoteVersion) => Promise<void>;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return (
      <span className="text-xs text-[var(--text-secondary)]">no tags</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className="text-xs text-[var(--accent)]">
          #{tag}
        </span>
      ))}
    </div>
  );
}

export function VersionHistoryDrawer({
  open,
  noteId,
  current,
  restoring,
  onClose,
  onRestore,
}: VersionHistoryDrawerProps) {
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError("");
    getNoteVersions(noteId)
      .then((items) => {
        if (cancelled) return;
        setVersions(items);
        setSelectedId(items[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setVersions([]);
        setSelectedId(null);
        setError(
          err instanceof Error ? err.message : "Failed to load versions",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [noteId, open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  const selected = useMemo(
    () => versions.find((version) => version.id === selectedId) ?? null,
    [selectedId, versions],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] bg-black/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="ml-auto flex h-full w-full max-w-5xl flex-col bg-[var(--bg)] text-[var(--text-primary)]"
            style={{ borderLeft: "1px solid var(--border)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <header
              className="flex h-14 items-center justify-between px-4 sm:px-6"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <Clock3 size={16} className="text-[var(--accent)]" />
                <h2 className="text-sm font-medium">version history</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-none text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                aria-label="Close version history"
              >
                <X size={16} />
              </button>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_1fr]">
              <aside
                className="min-h-0 overflow-y-auto p-4"
                style={{ borderRight: "1px solid var(--border)" }}
              >
                {loading ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Loader2 size={13} className="animate-spin" />
                    loading...
                  </div>
                ) : error ? (
                  <p className="text-xs text-[var(--error)]">{error}</p>
                ) : versions.length === 0 ? (
                  <p className="text-xs text-[var(--text-secondary)]">
                    no versions yet
                  </p>
                ) : (
                  <div className="space-y-1">
                    {versions.map((version) => (
                      <button
                        key={version.id}
                        type="button"
                        onClick={() => setSelectedId(version.id)}
                        className="w-full rounded-none px-3 py-2 text-left transition-colors hover:bg-[var(--bg-secondary)]"
                        style={{
                          backgroundColor:
                            selectedId === version.id
                              ? "var(--bg-secondary)"
                              : "transparent",
                        }}
                      >
                        <div className="text-sm text-[var(--text-primary)]">
                          v{version.version}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-secondary)]">
                          {formatDate(version.created_at)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </aside>

              <section className="min-h-0 overflow-y-auto p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium">
                      {selected ? `previewing v${selected.version}` : "preview"}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      compare the selected version against your current draft
                    </p>
                  </div>
                  <Button
                    type="button"
                    disabled={!selected || restoring}
                    onClick={() => selected && onRestore(selected)}
                    className="gap-2 bg-[var(--accent)] text-xs text-[var(--bg)] hover:bg-[var(--accent-hover)]"
                  >
                    {restoring ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <RotateCcw size={14} />
                    )}
                    restore
                  </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <article className="min-w-0 rounded-none bg-[var(--bg-secondary)] p-4">
                    <p className="mb-3 text-xs text-[var(--text-secondary)]">
                      current
                    </p>
                    <h4 className="mb-3 line-clamp-2 text-base font-medium">
                      {current.title || "untitled"}
                    </h4>
                    <TagList tags={current.tags} />
                    <div
                      className="my-4"
                      style={{ borderTop: "1px solid var(--border)" }}
                    />
                    <ReadOnlyEditor content={current.content} />
                  </article>

                  <article className="min-w-0 rounded-none bg-[var(--bg-secondary)] p-4">
                    <p className="mb-3 text-xs text-[var(--text-secondary)]">
                      selected
                    </p>
                    {selected ? (
                      <>
                        <h4 className="mb-3 line-clamp-2 text-base font-medium">
                          {selected.title || "untitled"}
                        </h4>
                        <TagList tags={selected.tags} />
                        <div
                          className="my-4"
                          style={{ borderTop: "1px solid var(--border)" }}
                        />
                        <ReadOnlyEditor content={selected.content} />
                      </>
                    ) : (
                      <p className="text-sm text-[var(--text-secondary)]">
                        choose a version
                      </p>
                    )}
                  </article>
                </div>
              </section>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
