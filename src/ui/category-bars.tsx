import { formatCompact } from "../lib/chart-geometry.js";
import { cn } from "../lib/utils.js";
import { ChartFrame } from "./chart-frame.js";

export type CategoryBarDatum = {
  readonly label: string;
  readonly value: number;
  /** Optional secondary value shown beside the primary (e.g. cost). */
  readonly secondaryLabel?: string;
};

export type CategoryBarsProps = {
  readonly title: string;
  readonly description?: string;
  readonly data: readonly CategoryBarDatum[];
  readonly valueLabel?: string;
  readonly format?: (value: number) => string;
  readonly className?: string;
};

/**
 * Dense horizontal category ranking for cost-by-model / calls-by-tool
 * style tables. Bars share one series colour; length encodes magnitude.
 * Absent secondary labels stay empty rather than inventing a zero.
 */
export function CategoryBars({
  title,
  description,
  data,
  valueLabel = "Value",
  format = formatCompact,
  className,
}: CategoryBarsProps) {
  const max = Math.max(0, ...data.map((d) => d.value));
  const axisMax = max === 0 ? 1 : max;

  return (
    <ChartFrame
      title={title}
      {...(description === undefined ? {} : { description })}
      table={{
        columns: ["Category", valueLabel, "Detail"],
        rows: data.map((datum) => [
          datum.label,
          format(datum.value),
          datum.secondaryLabel ?? "—",
        ]),
      }}
      className={className}
    >
      <div className="flex flex-col gap-2" role="presentation">
        {data.map((datum) => {
          const pct = (datum.value / axisMax) * 100;
          return (
            <div key={datum.label} className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-2">
              <p className="truncate text-xs font-medium">{datum.label}</p>
              <div className="h-3 w-full bg-muted">
                <div
                  className={cn("h-full bg-primary-emphasis")}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="min-w-[3.5rem] text-right font-mono text-[11px] leading-tight">
                <p className="font-semibold">{format(datum.value)}</p>
                {datum.secondaryLabel === undefined ? null : (
                  <p className="text-muted-foreground">{datum.secondaryLabel}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ChartFrame>
  );
}
