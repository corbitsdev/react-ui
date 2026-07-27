/**
 * When something repeats.
 *
 * An interval plus an optional time of day — not a cron string. Cron cannot be
 * read back to a user without a parser, cannot be edited with two controls, and
 * its five fields can express schedules no UI here would ever offer. A host that
 * genuinely needs cron can translate at its own edge; everything the scheduling
 * UI can express is representable here, which is the honest boundary.
 */

export type RecurrenceUnit = "hour" | "day" | "week" | "month";

export type Recurrence = {
  /** How many units between runs. `1` with unit `day` is daily. */
  readonly every: number;
  readonly unit: RecurrenceUnit;
  /** Local time of day, "HH:MM". Meaningless for `hour` and ignored there. */
  readonly at?: string;
  /** 0 = Sunday. `week` only. */
  readonly weekday?: number;
};

export type Schedule = {
  readonly id: string;
  readonly name: string;
  /** Paused schedules keep their config and stop running. */
  readonly enabled: boolean;
  readonly recurrence: Recurrence;
  /** ISO timestamps. `nextRunAt` is null while paused. */
  readonly nextRunAt: string | null;
  readonly lastRunAt?: string | null;
};

export const RECURRENCE_UNITS: readonly RecurrenceUnit[] = ["hour", "day", "week", "month"];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * A recurrence in words: "Every 2 days at 09:00", "Weekly on Monday at 07:30".
 *
 * The single source of the human phrasing, used by both the editor's live
 * preview and the list rows — so what you agreed to when saving is worded
 * exactly the way it is shown to you afterwards.
 */
export function describeRecurrence(recurrence: Recurrence): string {
  const { every, unit, at, weekday } = recurrence;
  const plural = every === 1 ? unit : `${unit}s`;

  if (unit === "hour") {
    return every === 1 ? "Every hour" : `Every ${every} hours`;
  }

  const time = at === undefined || at === "" ? "" : ` at ${at}`;

  if (unit === "week") {
    const day = weekday === undefined ? "" : ` on ${WEEKDAYS[weekday] ?? ""}`;
    return every === 1 ? `Weekly${day}${time}` : `Every ${every} weeks${day}${time}`;
  }

  if (every === 1) {
    return `${unit === "day" ? "Daily" : "Monthly"}${time}`;
  }
  return `Every ${every} ${plural}${time}`;
}
