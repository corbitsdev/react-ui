import { seriesColor } from "../lib/chart-palette.js";
import { cn } from "../lib/utils.js";

export type HeatmapDay = {
  /** UTC calendar date, `YYYY-MM-DD`. Also the React key. */
  readonly date: string;
  readonly value: number;
};

export type HeatmapProps = {
  readonly days: readonly HeatmapDay[];
  /** What a cell counts — "Runs per day". Read with the computed summary. */
  readonly label: string;
  readonly className?: string;
};

/**
 * A calendar strip of intensity cells — the "how often" picture beside charts
 * that say "how much".
 *
 * Intensity is the first series colour at graded opacity, never a second hue:
 * a sequential scale that changes hue mid-ramp reads as categories. Zero days
 * keep the muted fill with a border, so "nothing happened" stays visible
 * instead of disappearing into the page. The whole strip is one `role="img"`
 * whose name carries the summary (active days, peak); per-cell values are in
 * each cell's `title`.
 */
export function Heatmap({ days, label, className }: HeatmapProps) {
  const max = days.reduce((peak, day) => Math.max(peak, day.value), 0);
  const activeDays = days.filter((day) => day.value > 0).length;
  return (
    <div
      className={cn("flex flex-wrap gap-[3px]", className)}
      role="img"
      aria-label={`${label}: ${activeDays} active days, peak ${max}`}
    >
      {days.map((day) => {
        const empty = day.value === 0;
        const intensity = max <= 0 ? 0 : day.value / max;
        return (
          <span
            key={day.date}
            title={`${day.date}: ${day.value}`}
            className={cn("size-3 rounded-[2px] border border-border", empty && "bg-muted")}
            style={empty ? undefined : { backgroundColor: seriesColor(0), opacity: 0.4 + intensity * 0.6 }}
          />
        );
      })}
    </div>
  );
}
