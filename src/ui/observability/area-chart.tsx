"use client";

import { useState } from "react";

import { areaPath, linePath, niceTicks } from "../../lib/chart-geometry.js";
import { seriesColor, seriesDash } from "../../lib/chart-palette.js";
import { ChartFrame } from "../chart-frame.js";
import type { SeriesPoint } from "./model.js";

export type AreaChartProps = {
  readonly title: string;
  readonly description?: string;
  readonly data: readonly SeriesPoint[];
  /** A second series, same order and labels as `data`. Drawn dashed. */
  readonly compare?: readonly SeriesPoint[];
  readonly valueLabel?: string;
  readonly compareLabel?: string;
  readonly format?: (value: number) => string;
  readonly className?: string;
};

const WIDTH = 560;
const HEIGHT = 180;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

/**
 * One or two series over time, with a pointer crosshair.
 *
 * The fill is the line colour at low opacity, so it does not invent another
 * series. Orange is not used: it is the action accent, and a passive series
 * painted orange reads as a button. The table under the frame has the numbers.
 */
export function AreaChart({
  title,
  description,
  data,
  compare,
  valueLabel = "Value",
  compareLabel = "Compare",
  format = (value) => String(value),
  className,
}: AreaChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const compareValues =
    compare !== undefined && compare.length === data.length ? compare : undefined;
  const max = Math.max(
    0,
    ...data.map((point) => point.value),
    ...(compareValues ?? []).map((point) => point.value),
  );
  const ticks = niceTicks(max);
  const axisMax = ticks[ticks.length - 1] ?? 1;
  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const steps = Math.max(data.length - 1, 1);
  const plot = (value: number, index: number) => ({
    x: PAD_LEFT + (index / steps) * innerW,
    y: PAD_TOP + innerH - (axisMax <= 0 ? 0 : value / axisMax) * innerH,
  });
  const primary = data.map((point, index) => plot(point.value, index));
  const secondary = compareValues?.map((point, index) => plot(point.value, index));
  const baseline = PAD_TOP + innerH;
  const color = seriesColor(0);
  const compareColor = seriesColor(1);
  const dash = seriesDash(1);
  const active = hover === null ? undefined : data[hover];
  const activeCompare = hover === null ? undefined : compareValues?.[hover];

  function hoverAt(clientX: number, width: number) {
    if (data.length === 0 || width <= 0) return;
    const x = (clientX / width) * WIDTH;
    let best = 0;
    let dist = Number.POSITIVE_INFINITY;
    primary.forEach((point, index) => {
      const delta = Math.abs(point.x - x);
      if (delta < dist) {
        dist = delta;
        best = index;
      }
    });
    setHover(best);
  }

  return (
    <ChartFrame
      title={title}
      {...(description === undefined ? {} : { description })}
      {...(compareValues === undefined
        ? {}
        : {
            legend: [
              { label: valueLabel, color },
              {
                label: compareLabel,
                color: compareColor,
                ...(dash === undefined ? {} : { dash }),
              },
            ],
          })}
      className={className}
      table={{
        columns:
          compareValues === undefined
            ? ["When", valueLabel]
            : ["When", valueLabel, compareLabel],
        rows: data.map((point, index) => {
          const row = [point.label, format(point.value)];
          const other = compareValues?.[index];
          if (other !== undefined) row.push(format(other.value));
          return row;
        }),
      }}
    >
      <div
        className="relative"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          hoverAt(event.clientX - rect.left, rect.width);
        }}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-44 w-full"
          role="group"
          aria-label={title}
        >
          {ticks.map((tick) => {
            const y = plot(tick, 0).y;
            return (
              <g key={tick}>
                <line
                  x1={PAD_LEFT}
                  x2={WIDTH - PAD_RIGHT}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                />
                <text
                  x={PAD_LEFT - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill="currentColor"
                  fontSize={10}
                  className="fill-muted-foreground"
                >
                  {format(tick)}
                </text>
              </g>
            );
          })}
          {primary.length > 1 ? (
            <path d={areaPath(primary, baseline)} fill={color} opacity={0.16} />
          ) : null}
          {primary.length > 1 ? (
            <path d={linePath(primary)} fill="none" stroke={color} strokeWidth={2} />
          ) : null}
          {secondary !== undefined && secondary.length > 1 ? (
            <path
              d={linePath(secondary)}
              fill="none"
              stroke={compareColor}
              strokeWidth={2}
              {...(dash === undefined ? {} : { strokeDasharray: dash })}
            />
          ) : null}
          {data.map((point, index) => (
            <text
              key={point.label}
              x={primary[index]?.x ?? 0}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontSize={10}
              className="fill-muted-foreground"
            >
              {point.label}
            </text>
          ))}
          {hover !== null && primary[hover] !== undefined ? (
            <g>
              <line
                x1={primary[hover].x}
                x2={primary[hover].x}
                y1={PAD_TOP}
                y2={baseline}
                stroke="var(--foreground)"
                strokeOpacity={0.45}
              />
              <circle cx={primary[hover].x} cy={primary[hover].y} r={3.5} fill={color} />
              {secondary?.[hover] !== undefined ? (
                <circle
                  cx={secondary[hover].x}
                  cy={secondary[hover].y}
                  r={3.5}
                  fill={compareColor}
                />
              ) : null}
            </g>
          ) : null}
        </svg>
        {active === undefined ? null : (
          <p className="pointer-events-none absolute right-2 top-2 rounded-md border border-border bg-background px-2 py-1 font-mono text-[11px] shadow-sm">
            {active.label} · {valueLabel} {format(active.value)}
            {activeCompare === undefined
              ? ""
              : ` · ${compareLabel} ${format(activeCompare.value)}`}
          </p>
        )}
      </div>
    </ChartFrame>
  );
}
