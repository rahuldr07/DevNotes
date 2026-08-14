import { stripMarkdown } from "@/lib/notes";

/** Shared with the backend (app/services/text.py) so a note's reading time
 *  does not change depending on which side computed it. */
export const WORDS_PER_MINUTE = 220;

export function countWords(content: string) {
  return stripMarkdown(content).split(/\s+/).filter(Boolean).length;
}

export function readingTimeMinutes(
  content: string,
  wordsPerMinute = WORDS_PER_MINUTE,
) {
  return Math.max(1, Math.ceil(countWords(content) / wordsPerMinute));
}

export function noteKindLabel(noteType?: string | null) {
  if (!noteType) return "note";
  return noteType.replace(/_/g, " ");
}
