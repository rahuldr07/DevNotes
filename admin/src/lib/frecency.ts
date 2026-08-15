/**
 * Frecency: how often a note is opened, decayed by how long ago.
 *
 * Pure lexical scoring treats a note opened four times this week exactly like
 * one opened once last spring. Multiplying by recency-weighted usage puts the
 * notes someone actually lives in at the top, without hiding a strong text
 * match behind an old favourite — the boost is bounded.
 *
 * A 7-day half-life means a visit is worth half as much a week later, a
 * quarter after a fortnight. That matches how quickly a developer's "current
 * problem" set turns over.
 */
const STORAGE_KEY = "devnotes-note-frecency";
const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;
/** Beyond this the map is mostly notes nobody has opened in months. */
const MAX_TRACKED = 200;
/** Ceiling on the multiplier, so frecency ranks ties — it never overrules relevance. */
const MAX_BOOST = 0.45;

export interface FrecencyEntry {
  count: number;
  lastUsedAt: number;
}

export type FrecencyMap = Record<string, FrecencyEntry>;

export function readFrecency(): FrecencyMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as FrecencyMap) : {};
  } catch {
    return {};
  }
}

function writeFrecency(map: FrecencyMap): void {
  if (typeof window === "undefined") return;
  try {
    const entries = Object.entries(map);
    // Keep the most recently used; the tail is noise.
    const trimmed =
      entries.length > MAX_TRACKED
        ? Object.fromEntries(
            entries
              .sort((a, b) => b[1].lastUsedAt - a[1].lastUsedAt)
              .slice(0, MAX_TRACKED),
          )
        : map;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or blocked: ranking quietly falls back to relevance only.
  }
}

export function recordNoteOpened(
  noteId: number,
  now = Date.now(),
): FrecencyMap {
  const map = readFrecency();
  const key = String(noteId);
  const existing = map[key];
  const next: FrecencyMap = {
    ...map,
    [key]: {
      count: (existing?.count ?? 0) + 1,
      lastUsedAt: now,
    },
  };
  writeFrecency(next);
  return next;
}

/** Decayed visit weight. 0 for a note never opened. */
export function frecencyScore(
  entry: FrecencyEntry | undefined,
  now = Date.now(),
): number {
  if (!entry || entry.count <= 0) return 0;
  const age = Math.max(0, now - entry.lastUsedAt);
  const decay = 2 ** (-age / HALF_LIFE_MS);
  return entry.count * decay;
}

/**
 * Applies the boost to a Fuse score, where **lower is better** and 0 is a
 * perfect match. A frequently opened note has its score pulled toward 0.
 */
export function applyFrecency(
  fuseScore: number,
  entry: FrecencyEntry | undefined,
  now = Date.now(),
): number {
  const score = frecencyScore(entry, now);
  if (score <= 0) return fuseScore;
  // Saturating curve: the first few visits matter, the twentieth does not.
  const boost = MAX_BOOST * (1 - 1 / (1 + score));
  return fuseScore * (1 - boost);
}

/** Note ids ordered by frecency, for the empty-query state. */
export function recentlyOpenedIds(
  map: FrecencyMap,
  now = Date.now(),
): number[] {
  return Object.entries(map)
    .map(([id, entry]) => ({
      id: Number(id),
      score: frecencyScore(entry, now),
    }))
    .filter((entry) => Number.isFinite(entry.id) && entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.id);
}
