"use client";

import { Loader2, Search, Users } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getCommunityNotesPage } from "@/lib/note-api";
import type { Note } from "@/types/notes";

const RichEditor = dynamic(() => import("@/components/ui/RichEditor"), {
  ssr: false,
});

function appendUniqueNotes(current: Note[], incoming: Note[]) {
  const seen = new Set(current.map((note) => note.id));
  return [...current, ...incoming.filter((note) => !seen.has(note.id))];
}

export default function ExplorePage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchFirstPage = useCallback(async () => {
    try {
      setLoading(true);
      const page = await getCommunityNotesPage({ limit: 20 });
      setNotes(page.items);
      setNextCursor(page.next_cursor);
    } catch (err) {
      console.error("Failed to fetch community notes", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFirstPage();
  }, [fetchFirstPage]);

  const fetchNextPage = useCallback(async () => {
    if (loading || loadingMore || nextCursor === null) return;
    try {
      setLoadingMore(true);
      const page = await getCommunityNotesPage({
        limit: 20,
        cursor: nextCursor,
      });
      setNotes((prev) => appendUniqueNotes(prev, page.items));
      setNextCursor(page.next_cursor);
    } catch (err) {
      console.error("Failed to fetch more community notes", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, nextCursor]);

  const lastNoteRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || nextCursor === null) return;

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      });
      observerRef.current.observe(node);
    },
    [fetchNextPage, loading, loadingMore, nextCursor],
  );

  const filteredNotes = notes.filter((note) => {
    const q = search.toLowerCase();
    return (
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q) ||
      note.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container max-w-6xl py-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight mb-2"
            style={{ color: "var(--text-color)" }}
          >
            Explore Community
          </h1>
          <p className="text-sm" style={{ color: "var(--sub-color)" }}>
            Discover notes shared by other developers.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
            style={{ color: "var(--sub-color)" }}
          />
          <input
            type="text"
            placeholder="Search community notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-1"
            style={{
              backgroundColor: "var(--sub-alt-color)",
              borderColor: "var(--border-color)",
              color: "var(--text-color)",
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: "var(--sub-color)" }}
          />
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-20">
          <Users
            className="h-12 w-12 mx-auto mb-4 opacity-20"
            style={{ color: "var(--sub-color)" }}
          />
          <p style={{ color: "var(--sub-color)" }}>No community notes found.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note, index) => (
            <Card
              key={note.id}
              ref={index === filteredNotes.length - 1 ? lastNoteRef : undefined}
              className="cursor-pointer transition-all h-full flex flex-col group"
              onClick={() => setSelectedNote(note)}
              style={{
                backgroundColor: "var(--sub-alt-color)",
                borderColor: "var(--border-color)",
                // Hover effect handled by tailwind classes usually, but here inline styles might override.
                // Let's rely on className for hover but inline for base colors.
              }}
            >
              <CardHeader className="pb-3">
                <CardTitle
                  className="line-clamp-1 text-lg"
                  style={{ color: "var(--text-color)" }}
                >
                  {note.title}
                </CardTitle>
                <CardDescription
                  className="text-xs font-mono"
                  style={{ color: "var(--sub-color)" }}
                >
                  {new Date(note.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-3">
                <p
                  className="text-sm line-clamp-3"
                  style={{ color: "var(--sub-color)" }}
                >
                  {note.content.replace(/[#*`_]/g, "").slice(0, 150)}...
                </p>
              </CardContent>
              <CardFooter className="pt-0">
                <div className="flex flex-wrap gap-1.5">
                  {note.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--main-color) 10%, transparent)",
                        color: "var(--main-color)",
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5"
                      style={{ color: "var(--sub-color)" }}
                    >
                      +{note.tags.length - 3}
                    </span>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!loading && notes.length > 0 && (
        <div className="py-4 text-center text-xs text-[var(--sub-color)]">
          {loadingMore
            ? "loading..."
            : nextCursor === null
              ? "you've reached the end"
              : ""}
        </div>
      )}

      {/* View Note Dialog */}
      <Dialog
        open={!!selectedNote}
        onOpenChange={(open) => !open && setSelectedNote(null)}
      >
        <DialogContent
          className="max-w-3xl max-h-[85vh] overflow-y-auto"
          style={{
            backgroundColor: "var(--bg-color)",
            borderColor: "var(--border-color)",
            color: "var(--text-color)",
          }}
        >
          <DialogHeader>
            <DialogTitle
              className="text-2xl font-bold"
              style={{ color: "var(--text-color)" }}
            >
              {selectedNote?.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-xs font-mono mt-1">
              <span style={{ color: "var(--sub-color)" }}>
                {selectedNote &&
                  new Date(selectedNote.created_at).toLocaleDateString(
                    undefined,
                    { dateStyle: "long" },
                  )}
              </span>
              {selectedNote?.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded-full text-[10px]"
                  style={{
                    backgroundColor: "var(--sub-alt-color)",
                    color: "var(--main-color)",
                  }}
                >
                  #{tag}
                </span>
              ))}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 prose prose-invert max-w-none">
            {selectedNote && (
              <RichEditor
                initialContent={selectedNote.content}
                editable={false}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
