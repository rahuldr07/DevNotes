import { stripMarkdown } from "@/lib/notes";

export function countWords(content: string) {
  return stripMarkdown(content).split(/\s+/).filter(Boolean).length;
}

export function readingTimeMinutes(content: string, wordsPerMinute = 220) {
  return Math.max(1, Math.ceil(countWords(content) / wordsPerMinute));
}

export function noteKindLabel(noteType?: string | null) {
  if (!noteType) return "note";
  return noteType.replace(/_/g, " ");
}
