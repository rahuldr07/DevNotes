/**
 * Local draft persistence for the create-note editor.
 *
 * Autosave only runs in edit mode — a note has to exist before it can be
 * PATCHed — so everything typed before the first save lived in React state
 * and nothing else. Closing the tab, following a link, or a reload lost it
 * with no prompt. This keeps an unsent draft in localStorage until the note
 * is actually created.
 */
export interface NoteDraft {
  title: string;
  content: string;
  tags: string[];
  noteType: string;
  language: string;
  sourceUrl: string;
  savedAt: number;
}

const DRAFT_KEY = "devnotes-draft-note";
/** Older than this and the draft is probably not what the user came back for. */
const MAX_DRAFT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function readDraft(): NoteDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as NoteDraft;
    if (!draft?.savedAt || Date.now() - draft.savedAt > MAX_DRAFT_AGE_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    if (!draft.title?.trim() && !draft.content?.trim()) return null;
    return draft;
  } catch {
    return null;
  }
}

export function writeDraft(draft: Omit<NoteDraft, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    if (!draft.title.trim() && !draft.content.trim()) {
      clearDraft();
      return;
    }
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
  } catch {
    // Storage full or blocked — the in-memory editor state still stands.
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to recover from.
  }
}
