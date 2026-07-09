"use client";

import { Flame } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { getUserNotesPage } from "@/lib/note-api";
import type { Note } from "@/types/notes";

const WEEKS = 26;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Sequential single-hue ramp built from the active theme's accent over the
 * page surface — monotonic by construction, so it stays readable (and
 * colorblind-safe: lightness carries the signal) across every theme.
 * Level 0 is a neutral, deliberately outside the ramp.
 */
const LEVEL_COLORS = [
  "color-mix(in srgb, var(--border) 55%, transparent)",
  "color-mix(in srgb, var(--accent) 25%, var(--bg))",
  "color-mix(in srgb, var(--accent) 50%, var(--bg))",
  "color-mix(in srgb, var(--accent) 75%, var(--bg))",
  "var(--accent)",
];

function activityLevel(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Each note counts its creation day, plus its update day when different. */
function buildActivity(notes: Note[]): Map<string, number> {
  const activity = new Map<string, number>();
  const bump = (iso: string | null | undefined) => {
    if (!iso) return;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return;
    const key = dayKey(date);
    activity.set(key, (activity.get(key) ?? 0) + 1);
  };
  for (const note of notes) {
    bump(note.created_at);
    if (
      note.updated_at &&
      dayKey(new Date(note.updated_at)) !== dayKey(new Date(note.created_at))
    ) {
      bump(note.updated_at);
    }
  }
  return activity;
}

interface DayCell {
  key: string;
  count: number;
  level: number;
  label: string;
  inRange: boolean;
}

interface WeekColumn {
  key: string;
  monthLabel: string | null;
  days: DayCell[];
}

function buildWeeks(activity: Map<string, number>): WeekColumn[] {
  const today = startOfDay(new Date());
  // Snap the window's end to the end of the current week (Monday-start).
  const weekday = (today.getDay() + 6) % 7; // 0 = Monday
  const weekStart = new Date(today.getTime() - weekday * DAY_MS);
  const firstWeekStart = new Date(
    weekStart.getTime() - (WEEKS - 1) * 7 * DAY_MS,
  );

  const weeks: WeekColumn[] = [];
  let previousMonth = -1;
  for (let w = 0; w < WEEKS; w++) {
    const columnStart = new Date(firstWeekStart.getTime() + w * 7 * DAY_MS);
    const month = columnStart.getMonth();
    const monthLabel =
      month !== previousMonth
        ? columnStart.toLocaleDateString("en-US", { month: "short" })
        : null;
    previousMonth = month;

    const days: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(columnStart.getTime() + d * DAY_MS);
      const key = dayKey(date);
      const count = activity.get(key) ?? 0;
      days.push({
        key,
        count,
        level: activityLevel(count),
        label: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        inRange: date.getTime() <= today.getTime(),
      });
    }
    weeks.push({ key: dayKey(columnStart), monthLabel, days });
  }
  return weeks;
}

interface StreakStats {
  current: number;
  best: number;
  activeDays: number;
  busiest: number;
  total: number;
}

function buildStreaks(activity: Map<string, number>): StreakStats {
  const today = startOfDay(new Date());
  const windowStart = today.getTime() - WEEKS * 7 * DAY_MS;

  let best = 0;
  let run = 0;
  let activeDays = 0;
  let busiest = 0;
  let total = 0;
  for (let t = windowStart; t <= today.getTime(); t += DAY_MS) {
    const count = activity.get(dayKey(new Date(t))) ?? 0;
    if (count > 0) {
      run += 1;
      activeDays += 1;
      total += count;
      if (count > busiest) busiest = count;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }

  // Current streak may start today or yesterday (today isn't over yet).
  let current = 0;
  let cursor = today.getTime();
  if (!activity.has(dayKey(new Date(cursor)))) cursor -= DAY_MS;
  while (activity.has(dayKey(new Date(cursor)))) {
    current += 1;
    cursor -= DAY_MS;
  }

  return { current, best, activeDays, busiest, total };
}

export function KnowledgeHeatmap() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<DayCell | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // The newest weeks live at the right edge — start there when the grid
  // is wider than its container (recent activity is what matters).
  useEffect(() => {
    if (loading) return;
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    getUserNotesPage({ limit: 100 })
      .then((page) => {
        if (!cancelled) setNotes(page.items);
      })
      .catch(() => {
        // The heatmap is decorative context — fail quiet, render empty.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activity = useMemo(() => buildActivity(notes), [notes]);
  const weeks = useMemo(() => buildWeeks(activity), [activity]);
  const streaks = useMemo(() => buildStreaks(activity), [activity]);

  const statTiles = [
    {
      label: "current streak",
      value: streaks.current,
      unit: streaks.current === 1 ? "day" : "days",
    },
    {
      label: "best streak",
      value: streaks.best,
      unit: streaks.best === 1 ? "day" : "days",
    },
    {
      label: "active days",
      value: streaks.activeDays,
      unit: `of ${WEEKS * 7}`,
    },
    {
      label: "busiest day",
      value: streaks.busiest,
      unit: streaks.busiest === 1 ? "touch" : "touches",
    },
  ];

  return (
    <section className="dev-panel mb-5 overflow-hidden">
      <div className="dev-panel-header flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <Flame size={14} className="text-[var(--accent)]" />
          <p className="type-eyebrow text-[var(--accent)]">knowledge pulse</p>
          <span className="hidden font-mono text-[11px] text-[var(--text-secondary)] sm:inline">
            last {WEEKS} weeks
          </span>
        </div>
        <span className="font-mono text-[11px] text-[var(--text-secondary)]">
          {loading
            ? "scanning activity…"
            : hovered
              ? `${hovered.label} · ${hovered.count} ${hovered.count === 1 ? "touch" : "touches"}`
              : `${streaks.total} captures + edits · ${streaks.activeDays} active ${streaks.activeDays === 1 ? "day" : "days"}`}
        </span>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div ref={scrollRef} className="min-w-0 overflow-x-auto">
          <div
            role="img"
            aria-label={`Activity heatmap: ${streaks.total} captures and edits across ${streaks.activeDays} active days in the last ${WEEKS} weeks.`}
            className="inline-block"
          >
            <div className="mb-1 flex gap-[3px] pl-8">
              {weeks.map((week) => (
                <span
                  key={`label-${week.key}`}
                  className="w-3 overflow-visible whitespace-nowrap font-mono text-[9px] lowercase text-[var(--text-secondary)]"
                >
                  {week.monthLabel ?? ""}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              <div className="flex w-8 flex-col gap-[3px] pr-1 text-right">
                {["mon", "", "wed", "", "fri", "", ""].map((label, index) => (
                  <span
                    key={`day-${label || index}`}
                    className="h-3 font-mono text-[9px] leading-3 text-[var(--text-secondary)]"
                  >
                    {label}
                  </span>
                ))}
              </div>
              {weeks.map((week) => (
                <div key={week.key} className="flex flex-col gap-[3px]">
                  {week.days.map((day) => (
                    // Hover detail only; the container's aria-label carries
                    // the summary, so cells stay out of the tab order.
                    <button
                      key={day.key}
                      type="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      title={
                        day.inRange
                          ? `${day.label}: ${day.count} ${day.count === 1 ? "touch" : "touches"}`
                          : undefined
                      }
                      onMouseEnter={() => day.inRange && setHovered(day)}
                      onMouseLeave={() => setHovered(null)}
                      className="h-3 w-3 cursor-default rounded-none border border-black/5 p-0"
                      style={{
                        backgroundColor: day.inRange
                          ? LEVEL_COLORS[day.level]
                          : "transparent",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1 pl-8 font-mono text-[9px] lowercase text-[var(--text-secondary)]">
              <span className="mr-1">less</span>
              {LEVEL_COLORS.map((color) => (
                <span
                  key={color}
                  className="h-3 w-3 rounded-none"
                  style={{ backgroundColor: color }}
                />
              ))}
              <span className="ml-1">more</span>
            </div>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-px self-start border border-[var(--border)] bg-[var(--border)] lg:w-64">
          {statTiles.map((tile) => (
            <div key={tile.label} className="bg-[var(--bg)] p-3">
              <p className="type-number text-2xl text-[var(--text-primary)]">
                {loading ? "—" : tile.value}
                <span className="ml-1 font-mono text-[10px] text-[var(--text-secondary)]">
                  {tile.unit}
                </span>
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                {tile.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
