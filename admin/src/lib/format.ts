import type { Note } from "@/types/notes";

/**
 * Shared date formatting. Every surface should pick one of these styles
 * instead of hand-rolling toLocaleDateString options:
 *   short    → "Jul 11, 2026"   (cards, lists)
 *   monthDay → "Jul 11"         (compact metadata rows)
 *   long     → "July 11, 2026"  (public article headers)
 *   dateTime → "Jul 11, 09:30 AM" (version history, audit trails)
 */
export type DateStyle =
  | "short"
  | "monthDay"
  | "monthYear"
  | "long"
  | "dateTime";

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { month: "short", day: "numeric", year: "numeric" },
  monthDay: { month: "short", day: "numeric" },
  monthYear: { month: "long", year: "numeric" },
  long: { month: "long", day: "numeric", year: "numeric" },
  dateTime: {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
};

export function formatDate(
  date: string | Date | null | undefined,
  style: DateStyle = "short",
) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", DATE_OPTIONS[style]);
}

/** The timestamp a note was last touched — updated wins over created. */
export function noteTouchedAt(note: Pick<Note, "created_at" | "updated_at">) {
  return note.updated_at ?? note.created_at;
}

export function formatNoteDate(
  note: Pick<Note, "created_at" | "updated_at">,
  style: DateStyle = "short",
) {
  return formatDate(noteTouchedAt(note), style);
}
