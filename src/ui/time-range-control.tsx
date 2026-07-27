import { type DateRange, TIME_RANGE_PRESETS, type TimeRangePreset } from "../lib/time-range.js";
import { cn } from "../lib/utils.js";
import { Input } from "./input.js";

export type TimeRangeControlProps = {
  readonly preset: TimeRangePreset;
  readonly onPresetChange: (preset: TimeRangePreset) => void;
  readonly custom: DateRange;
  readonly onCustomChange: (range: DateRange) => void;
  readonly className?: string;
};

/**
 * The window selector: presets as a single-choice group, with two date fields
 * that appear only for "Custom".
 *
 * `role="radiogroup"` with `aria-checked` buttons, not a row of toggles.
 * Choosing a window is a one-of-many choice, and the radio role is what tells a
 * screen reader that picking one un-picks the rest — six independent
 * `aria-pressed` buttons announce as six unrelated switches, six of which could
 * apparently be on.
 *
 * The custom fields are revealed rather than always present. Two date inputs
 * that do nothing for five of six presets are five-sixths noise, and their
 * emptiness reads as something the user forgot to fill in.
 *
 * Native `<input type="date">`, not a bespoke calendar. It comes with the
 * platform's own picker, its keyboard handling, its locale formatting and its
 * mobile behaviour — all of which a hand-rolled popover has to re-earn and
 * usually does not.
 */
export function TimeRangeControl({ preset, onPresetChange, custom, onCustomChange, className }: TimeRangeControlProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div role="radiogroup" aria-label="Time range" className="flex flex-wrap items-center gap-0.5 rounded-md border border-border p-0.5">
        {TIME_RANGE_PRESETS.map((option) => {
          const active = option.value === preset;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onPresetChange(option.value)}
              className={cn(
                "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                active ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {preset !== "custom" ? null : (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="From"
            value={custom.from ?? ""}
            // `max`/`min` cross-bound the pair so the picker itself refuses an
            // inverted range — cheaper and clearer than validating afterwards.
            max={custom.to ?? undefined}
            onChange={(event) => onCustomChange({ ...custom, from: event.target.value })}
            className="h-8 w-auto text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            aria-label="To"
            value={custom.to ?? ""}
            min={custom.from ?? undefined}
            onChange={(event) => onCustomChange({ ...custom, to: event.target.value })}
            className="h-8 w-auto text-xs"
          />
        </div>
      )}
    </div>
  );
}
