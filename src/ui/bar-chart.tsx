import { formatCompact, niceTicks, scaleLinear } from "../lib/chart-geometry.js";
import { seriesColor } from "../lib/chart-palette.js";
import { cn } from "../lib/utils.js";
import { ChartFrame } from "./chart-frame.js";

export type BarDatum = {
  readonly label: string;
  readonly value: number;
};

export type BarChartProps = {
  readonly title: string;
  readonly description?: string;
  readonly data: readonly BarDatum[];
  /** Column header for the value in the table view. */
  readonly valueLabel?: string;
  /** Formats the value at each bar's tip and in the table. */
  readonly format?: (value: number) => string;
  readonly className?: string;
};

const ROW_HEIGHT = 28;
const BAR_HEIGHT = 20; // ≤ 24px: the band's leftover is deliberate air.
const LABEL_WIDTH = 120;
const VALUE_WIDTH = 56;
const RADIUS = 4;

/**
 * One value per category, as horizontal bars.
 *
 * Horizontal, not vertical, because category labels are words. Words on a
 * vertical chart's x-axis either rotate 45°, truncate, or force the chart to be
 * as wide as the longest name; on a horizontal chart they sit flat in a fixed
 * gutter and stay readable at any count.
 *
 * Every bar is the *same* colour — slot 1. Colouring nominal bars by their value
 * spends the identity channel re-encoding what bar length already shows, and it
 * makes a legend necessary for information the reader already has. The bars are
 * one series, so there is no legend either: the caption names it.
 *
 * The rounded end is only on the value end. A bar rounded at the baseline no
 * longer starts at zero — it starts at a curve, and small values read as smaller
 * than they are. `RADIUS` is also clamped to half the bar's length so a short
 * bar becomes a stub rather than a lozenge whose length is pure geometry.
 *
 * The whole plot is `aria-hidden` and the table below the frame carries the
 * numbers. An SVG full of `<rect>` elements announced individually is noise, and
 * the exact values — which is what anyone reading non-visually wants — are in
 * the table, in order, with headers.
 */
export function BarChart({ title, description, data, valueLabel = "Value", format = formatCompact, className }: BarChartProps) {
  const max = Math.max(0, ...data.map((datum) => datum.value));
  const ticks = niceTicks(max);
  const axisMax = ticks[ticks.length - 1] ?? 1;
  const plotWidth = 320;
  const height = data.length * ROW_HEIGHT;
  const width = LABEL_WIDTH + plotWidth + VALUE_WIDTH;

  return (
    <ChartFrame
      title={title}
      {...(description === undefined ? {} : { description })}
      table={{
        columns: ["Category", valueLabel],
        rows: data.map((datum) => [datum.label, format(datum.value)]),
      }}
      className={className}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        // Scales to the container's width; the row rhythm is what must stay
        // fixed, and it is expressed in the viewBox.
        className="h-auto w-full"
        aria-hidden
        focusable="false"
      >
        {ticks.map((tick) => {
          const x = LABEL_WIDTH + scaleLinear(tick, axisMax, plotWidth);
          return (
            // Hairline, solid, one step off the surface: present enough to
            // measure against, quiet enough that the bars stay the loud thing.
            <line key={tick} x1={x} y1={0} x2={x} y2={height} stroke="var(--border)" strokeWidth={1} />
          );
        })}

        {data.map((datum, index) => {
          const y = index * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;
          const length = scaleLinear(datum.value, axisMax, plotWidth);
          const radius = Math.min(RADIUS, length / 2);
          return (
            <g key={datum.label}>
              <text
                x={LABEL_WIDTH - 8}
                y={index * ROW_HEIGHT + ROW_HEIGHT / 2}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[11px]"
              >
                {datum.label}
              </text>
              {/* Square at the baseline, rounded at the data end — drawn as a
                  path because SVG's rx rounds all four corners. */}
              <path
                d={
                  length <= 0
                    ? ""
                    : `M${LABEL_WIDTH} ${y}` +
                      `H${LABEL_WIDTH + length - radius}` +
                      `a${radius} ${radius} 0 0 1 ${radius} ${radius}` +
                      `V${y + BAR_HEIGHT - radius}` +
                      `a${radius} ${radius} 0 0 1 ${-radius} ${radius}` +
                      `H${LABEL_WIDTH}Z`
                }
                fill={seriesColor(0)}
              />
              <text
                x={LABEL_WIDTH + length + 8}
                y={index * ROW_HEIGHT + ROW_HEIGHT / 2}
                dominantBaseline="middle"
                className="fill-foreground text-[11px] tabular-nums"
              >
                {format(datum.value)}
              </text>
            </g>
          );
        })}
      </svg>

      <p className={cn("text-xs text-muted-foreground")}>
        Axis to {format(axisMax)}, from zero.
      </p>
    </ChartFrame>
  );
}
