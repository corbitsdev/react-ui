/**
 * The time window a dashboard is looking at.
 *
 * Presets plus a custom range, resolved to plain `YYYY-MM-DD` bounds. Dates,
 * not timestamps: a dashboard's window is a span of days a human picked, and
 * carrying an instant with it invites a timezone argument that shifts every
 * total by one day's worth of rows.
 */

export type TimeRangePreset = "24h" | "7d" | "30d" | "90d" | "all" | "custom";

export type DateRange = {
  /** Inclusive lower bound, `YYYY-MM-DD`. Absent means unbounded. */
  readonly from?: string;
  /** Inclusive upper bound, `YYYY-MM-DD`. Absent means "up to now". */
  readonly to?: string;
};

export const TIME_RANGE_PRESETS: readonly { readonly value: TimeRangePreset; readonly label: string }[] = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

const PRESET_DAYS: Record<Exclude<TimeRangePreset, "all" | "custom">, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** `YYYY-MM-DD` in UTC. `toISOString` is the only date formatter that is not locale-dependent. */
function isoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Turns a preset plus whatever the custom inputs hold into concrete bounds.
 *
 * `now` is a parameter, not a `Date.now()` inside. A resolver that reads the
 * clock is a function whose output changes between the render that produced a
 * query key and the render that used it — which is exactly how a dashboard ends
 * up refetching forever.
 *
 * A `custom` preset with no start resolves to unbounded rather than to an
 * error. Someone selecting "Custom" has not entered anything yet, and showing
 * them all their data for one keystroke is better than an error where their
 * chart used to be.
 */
export function resolveTimeRange(
  preset: TimeRangePreset,
  custom: DateRange,
  now: number = Date.now(),
): DateRange {
  if (preset === "all") return {};
  if (preset === "custom") {
    if (custom.from === undefined || custom.from === "") return {};
    return custom.to === undefined || custom.to === "" ? { from: custom.from } : { from: custom.from, to: custom.to };
  }
  return { from: isoDate(now - PRESET_DAYS[preset] * 24 * 60 * 60 * 1000) };
}
