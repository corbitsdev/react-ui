"use client";

import { useId } from "react";

import {
  describeRecurrence,
  RECURRENCE_UNITS,
  type Recurrence,
  type RecurrenceUnit,
} from "@/registry/corbits/lib/schedule";
import { cn } from "@/registry/corbits/lib/utils";
import { Input } from "@/registry/corbits/ui/input";

const WEEKDAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * How often something runs: a count, a unit, and — where it means anything — a
 * time of day and a weekday.
 *
 * The controls that do not apply are not rendered rather than disabled. A
 * greyed time picker next to "every hour" invites the user to wonder what they
 * did wrong; an absent one says the question does not arise.
 *
 * It reads back what it is set to, in the same words the schedule list will use
 * later. Confirming a repeating job from two dropdowns without a sentence is
 * how people end up with a workflow that runs every hour forever.
 */
export function RecurrenceInput({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: Recurrence;
  onChange: (next: Recurrence) => void;
  disabled?: boolean;
  className?: string;
}) {
  const baseId = useId();
  const showTime = value.unit !== "hour";
  const showWeekday = value.unit === "week";

  return (
    <fieldset className={cn("flex flex-col gap-3", className)} disabled={disabled}>
      <legend className="text-sm font-medium">Repeats</legend>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${baseId}-every`} className="text-xs text-muted-foreground">
            Every
          </label>
          <Input
            id={`${baseId}-every`}
            type="number"
            min={1}
            max={99}
            value={value.every}
            onChange={(event) => {
              // Clamp rather than trust: an empty field parses to NaN and a
              // recurrence of "every NaN days" is a schedule nobody can fix.
              const parsed = event.target.valueAsNumber;
              onChange({ ...value, every: Number.isFinite(parsed) ? Math.max(1, Math.min(99, parsed)) : 1 });
            }}
            className="w-20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${baseId}-unit`} className="text-xs text-muted-foreground">
            Unit
          </label>
          <select
            id={`${baseId}-unit`}
            value={value.unit}
            onChange={(event) => onChange({ ...value, unit: event.target.value as RecurrenceUnit })}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {RECURRENCE_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {value.every === 1 ? unit : `${unit}s`}
              </option>
            ))}
          </select>
        </div>

        {showWeekday ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${baseId}-weekday`} className="text-xs text-muted-foreground">
              On
            </label>
            <select
              id={`${baseId}-weekday`}
              value={value.weekday ?? 1}
              onChange={(event) => onChange({ ...value, weekday: Number(event.target.value) })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {WEEKDAY_LABELS.map((label, index) => (
                <option key={label} value={index}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {showTime ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${baseId}-at`} className="text-xs text-muted-foreground">
              At
            </label>
            <Input
              id={`${baseId}-at`}
              type="time"
              value={value.at ?? "09:00"}
              onChange={(event) => onChange({ ...value, at: event.target.value })}
              className="w-32"
            />
          </div>
        ) : null}
      </div>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {describeRecurrence(value)}
      </p>
    </fieldset>
  );
}
