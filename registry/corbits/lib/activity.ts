/**
 * One thing that happened, at a time.
 *
 * The vocabulary of `kind` belongs to whatever produced the entry — this is a
 * viewer, and a closed union here would fork on the first event type a producer
 * adds. `summary` is the sentence a reader actually reads; producing it is the
 * producer's job, because only it knows what "ran" means for its own events.
 */
export type ActivityEntry = {
  readonly id: string;
  /** ISO 8601. Sorting and grouping both depend on it parsing. */
  readonly timestamp: string;
  readonly kind: string;
  /** One line, already written. Absent when the producer recorded no detail. */
  readonly summary?: string;
  readonly actorName?: string;
  /** Colours the badge. Omit for the ordinary case — most events are ordinary. */
  readonly tone?: "neutral" | "positive" | "warning" | "critical";
};

export type ActivityDay = {
  /** `YYYY-MM-DD` in the viewer's timezone — the grouping key. */
  readonly key: string;
  /** "Fri, 24 Jul 2026", localised. */
  readonly label: string;
  readonly entries: readonly ActivityEntry[];
};

/** Local `YYYY-MM-DD`. Deliberately not UTC — a feed's "today" is the reader's. */
function dayKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Groups a time-ordered list into runs of the same day.
 *
 * A single forward pass that starts a new group whenever the key changes,
 * rather than bucketing into a map and sorting the buckets. That preserves
 * whatever order the source sent — which is the source's decision, and usually
 * newest-first — instead of silently re-sorting it. Entries whose timestamp
 * does not parse are dropped rather than grouped under "Invalid Date": a feed
 * that shows a real event under a nonsense heading is worse than one that shows
 * one fewer event.
 */
export function groupByDay(entries: readonly ActivityEntry[]): readonly ActivityDay[] {
  const days: ActivityDay[] = [];

  for (const entry of entries) {
    const date = new Date(entry.timestamp);
    if (Number.isNaN(date.getTime())) continue;

    const key = dayKey(date);
    const last = days[days.length - 1];
    if (last !== undefined && last.key === key) {
      (last.entries as ActivityEntry[]).push(entry);
      continue;
    }
    days.push({
      key,
      label: date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      entries: [entry],
    });
  }

  return days;
}
