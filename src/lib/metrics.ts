/**
 * Pure arithmetic behind the dashboard viz pieces: period-over-period deltas,
 * sparkline and mosaic geometry, and zero-filling a sparse daily series. Plain
 * numbers in, plain numbers out — no React, no SVG — so the part of a dashboard
 * that can silently lie is the part you can check by hand.
 */

export { formatCompact } from "./chart-geometry.js";

export type DeltaDirection = "up" | "down" | "flat";

export type DeltaResult = {
  readonly direction: DeltaDirection;
  /** Percent change vs the previous window, or null when it cannot be computed. */
  readonly pct: number | null;
  readonly delta: number;
  /**
   * False when there is no previous window to compare against. Distinguishes
   * "no change" (comparable, delta 0) from "no comparison available", so a UI
   * never renders a flat indicator that reads as stability.
   */
  readonly comparable: boolean;
};

/**
 * Period-over-period change. `comparable` is false when there is no previous
 * window. `pct` is null when the previous value is absent or zero — there is no
 * meaningful baseline to divide by, so callers render the absolute delta rather
 * than a misleading "∞%".
 */
export function computeDelta(current: number, previous: number | null | undefined): DeltaResult {
  if (previous === null || previous === undefined) {
    return { direction: "flat", pct: null, delta: 0, comparable: false };
  }
  const delta = current - previous;
  const direction: DeltaDirection = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  if (previous === 0) {
    return { direction, pct: null, delta, comparable: true };
  }
  return { direction, pct: (delta / previous) * 100, delta, comparable: true };
}

export type SparklineGeometry = {
  /** SVG `<polyline>` `points` string. Empty for an empty series. */
  readonly points: string;
  readonly coords: readonly { readonly x: number; readonly y: number }[];
};

/**
 * Maps a value series to polyline coordinates in a `width` × `height` viewBox.
 * The minimum value sits on the bottom edge and the maximum on the top — the
 * shape is the message, and a zero baseline would flatten every real series in
 * a box this small. A flat series renders along the vertical centre and a
 * single point is centred horizontally.
 */
export function buildSparkline(values: readonly number[], width: number, height: number): SparklineGeometry {
  if (values.length === 0) {
    return { points: "", coords: [] };
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;

  const coords = values.map((value, index) => ({
    x: values.length > 1 ? index * stepX : width / 2,
    y: span === 0 ? height / 2 : height - ((value - min) / span) * height,
  }));

  const points = coords.map((c) => `${round(c.x)},${round(c.y)}`).join(" ");
  return { points, coords };
}

export type MosaicSegment = {
  readonly label: string;
  readonly value: number;
  /** Width as a percentage of the total, 0 when the total is 0. */
  readonly pct: number;
};

/** Shares of a whole, as percentage widths for a stacked strip. */
export function buildMosaic(parts: readonly { label: string; value: number }[]): MosaicSegment[] {
  const total = parts.reduce((sum, part) => sum + part.value, 0);
  return parts.map((part) => ({
    label: part.label,
    value: part.value,
    pct: total <= 0 ? 0 : (part.value / total) * 100,
  }));
}

export type FillDailySeriesOptions<T> = {
  /** Reads the row's UTC calendar date, `YYYY-MM-DD`. */
  readonly dateOf: (row: T) => string;
  /** Builds the zero row for a date with no activity. */
  readonly zero: (date: string) => T;
};

/** Runaway guard: the longest spine `fillDailySeries` will build. */
export const FILL_DAILY_SERIES_MAX_DAYS = 400;

/**
 * Expands a sparse daily series (only days with activity) into a continuous,
 * zero-filled spine from `startDate` to `endDate` inclusive (UTC). Without this
 * a sparkline plots gapped days at equal spacing, drawing a false slope across
 * dates where nothing happened. Returns the input unchanged for an unparseable
 * or inverted range, and caps at `FILL_DAILY_SERIES_MAX_DAYS`.
 */
export function fillDailySeries<T>(
  series: readonly T[],
  startDate: string,
  endDate: string,
  options: FillDailySeriesOptions<T>,
): readonly T[] {
  const byDate = new Map(series.map((row) => [options.dateOf(row), row]));
  const msPerDay = 86_400_000;
  let cursor = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  if (Number.isNaN(cursor) || Number.isNaN(end) || end < cursor) {
    return series;
  }
  const out: T[] = [];
  while (cursor <= end && out.length < FILL_DAILY_SERIES_MAX_DAYS) {
    const date = new Date(cursor).toISOString().slice(0, 10);
    out.push(byDate.get(date) ?? options.zero(date));
    cursor += msPerDay;
  }
  return out;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
