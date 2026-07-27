import { useRef, useState } from "react";

import { formatCompact, linePath, niceTicks, scaleLinear } from "../lib/chart-geometry.js";
import { CHART_SERIES_SLOTS, seriesColor, seriesDash } from "../lib/chart-palette.js";
import { cn } from "../lib/utils.js";
import { ChartFrame } from "./chart-frame.js";

export type TimeSeries = {
  readonly label: string;
  /** One value per entry in `labels`, same order. */
  readonly values: readonly number[];
};

export type TimeSeriesChartProps = {
  readonly title: string;
  readonly description?: string;
  /** The shared x axis — pre-formatted period labels. */
  readonly labels: readonly string[];
  /** At most five. Past that, sum the tail into an "Other" series first. */
  readonly series: readonly TimeSeries[];
  readonly format?: (value: number) => string;
  readonly className?: string;
};

const WIDTH = 480;
const HEIGHT = 180;
const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 8;
const PAD_BOTTOM = 22;

/**
 * Several series over one shared x axis.
 *
 * The x axis is a list of labels shared by every series rather than a date per
 * point, so the series are aligned by construction. Per-series timestamps mean
 * every consumer gets to invent their own alignment rule, and the ones that get
 * it wrong draw two lines that silently disagree about what "March" means.
 *
 * **One y axis, always.** Two series of different magnitude go in two charts or
 * get indexed to a common base — never a second axis. A dual-axis chart lets
 * whoever chose the two scales decide where the lines cross, which means the
 * crossing carries no information while looking like it carries the most.
 *
 * Series are told apart by two channels, not one. Colour is the fast one, but
 * the five palette steps are only guaranteed to separate under simulated
 * protanopia and deuteranopia by a margin that assumes a second channel exists,
 * so each slot also gets its own `seriesDash` stroke pattern — carried on the
 * line, in the legend swatch and in the tooltip swatch, so the cross-reference
 * works wherever the reader is looking. The data table underneath is the
 * fallback; the dash is the encoding.
 *
 * The hover layer is not optional polish; without it there is no way to read an
 * exact value off a line. It reads the nearest index from the pointer's x and
 * shows every series at once, so the tooltip answers "what happened in March"
 * rather than "what was this one line in March".
 *
 * The same read is available from the keyboard. The plot is a `tabbable`
 * `role="application"`-free group with arrow-key stepping — the focus ring comes
 * from the theme, the arrow keys move the same index the pointer moves, and the
 * readout is echoed into a `role="status"` so it is announced rather than merely
 * drawn. Anything less makes precise values mouse-only.
 */
export function TimeSeriesChart({
  title,
  description,
  labels,
  series,
  format = formatCompact,
  className,
}: TimeSeriesChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const drawn = series.slice(0, CHART_SERIES_SLOTS);
  const max = Math.max(0, ...drawn.flatMap((entry) => entry.values));
  const ticks = niceTicks(max);
  const axisMax = ticks[ticks.length - 1] ?? 1;

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  // A single point has nowhere to travel; dividing by zero would put every mark
  // at NaN and blank the chart.
  const stepX = labels.length > 1 ? plotWidth / (labels.length - 1) : 0;

  const xAt = (index: number) => PAD_LEFT + index * stepX;
  const yAt = (value: number) => PAD_TOP + plotHeight - scaleLinear(value, axisMax, plotHeight);

  function indexFromClientX(clientX: number): number {
    const box = svgRef.current?.getBoundingClientRect();
    if (box === undefined || labels.length === 0) return 0;
    // The SVG scales to its container, so client pixels must be converted back
    // into viewBox units before they mean anything.
    const viewX = ((clientX - box.left) / box.width) * WIDTH;
    const raw = stepX === 0 ? 0 : Math.round((viewX - PAD_LEFT) / stepX);
    return Math.min(labels.length - 1, Math.max(0, raw));
  }

  function step(delta: number) {
    setActive((current) => {
      const next = (current ?? 0) + delta;
      return Math.min(labels.length - 1, Math.max(0, next));
    });
  }

  const readout =
    active === null
      ? ""
      : `${labels[active]}: ${drawn.map((entry) => `${entry.label} ${format(entry.values[active] ?? 0)}`).join(", ")}`;

  return (
    <ChartFrame
      title={title}
      {...(description === undefined ? {} : { description })}
      // `dash` as well as `color`: the lines carry two channels, so the legend
      // has to cross-reference both or it only explains half the plot.
      legend={drawn.map((entry, index) => ({
        label: entry.label,
        color: seriesColor(index),
        dash: seriesDash(index) ?? "none",
      }))}
      table={{
        columns: ["Period", ...drawn.map((entry) => entry.label)],
        rows: labels.map((label, index) => [label, ...drawn.map((entry) => format(entry.values[index] ?? 0))]),
      }}
      className={className}
    >
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`${title}. Use the arrow keys to read each period.`}
          tabIndex={0}
          onPointerMove={(event) => setActive(indexFromClientX(event.clientX))}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((current) => current ?? 0)}
          onBlur={() => setActive(null)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              step(1);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              step(-1);
            } else if (event.key === "Escape") {
              setActive(null);
            }
          }}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                y1={yAt(tick)}
                x2={WIDTH - PAD_RIGHT}
                y2={yAt(tick)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 8}
                y={yAt(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {format(tick)}
              </text>
            </g>
          ))}

          {/* First and last only. Every period labelled collides at any real
              width, and the tooltip names the period being read anyway. */}
          {labels.length === 0 ? null : (
            <>
              <text x={PAD_LEFT} y={HEIGHT - 6} className="fill-muted-foreground text-[10px]">
                {labels[0]}
              </text>
              <text
                x={WIDTH - PAD_RIGHT}
                y={HEIGHT - 6}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {labels[labels.length - 1]}
              </text>
            </>
          )}

          {active === null ? null : (
            <line
              x1={xAt(active)}
              y1={PAD_TOP}
              x2={xAt(active)}
              y2={PAD_TOP + plotHeight}
              stroke="var(--muted-foreground)"
              strokeWidth={1}
            />
          )}

          {drawn.map((entry, index) => (
            <path
              key={entry.label}
              d={linePath(entry.values.map((value, pointIndex) => ({ x: xAt(pointIndex), y: yAt(value) })))}
              fill="none"
              stroke={seriesColor(index)}
              strokeDasharray={seriesDash(index)}
              strokeWidth={2}
              strokeLinecap="butt"
              strokeLinejoin="round"
            />
          ))}

          {active === null
            ? null
            : drawn.map((entry, index) => (
                <circle
                  key={entry.label}
                  cx={xAt(active)}
                  cy={yAt(entry.values[active] ?? 0)}
                  r={4}
                  fill={seriesColor(index)}
                  // A 2px ring in the surface colour, so a marker stays legible
                  // where it crosses a line or another marker.
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              ))}
        </svg>

        {active === null ? null : (
          <div className="pointer-events-none absolute top-0 left-0 rounded-md border border-border bg-popover px-2 py-1.5 text-xs text-popover-foreground shadow-lg">
            <p className="font-medium">{labels[active]}</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {drawn.map((entry, index) => (
                <li key={entry.label} className="flex items-center gap-1.5">
                  <svg aria-hidden viewBox="0 0 20 4" className="h-1 w-5 shrink-0 overflow-visible">
                    <line
                      x1={0}
                      y1={2}
                      x2={20}
                      y2={2}
                      stroke={seriesColor(index)}
                      strokeDasharray={seriesDash(index)}
                      strokeWidth={2.5}
                    />
                  </svg>
                  <span className="text-muted-foreground">{entry.label}</span>
                  <span className="ml-auto pl-3 font-mono tabular-nums">{format(entry.values[active] ?? 0)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* The same readout, announced. `sr-only` rather than hidden: a visually
          hidden live region is still read, an `aria-hidden` one is not. */}
      <p role="status" className={cn("sr-only")}>
        {readout}
      </p>
    </ChartFrame>
  );
}
