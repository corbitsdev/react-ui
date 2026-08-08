/**
 * The arithmetic every chart in this registry does before it draws anything:
 * pick round axis numbers, map a value onto a pixel, turn points into a path,
 * and shorten a number without lying about it.
 *
 * It is plain functions over plain numbers, with no SVG and no React, so the
 * hard part of a chart is the part you can read in isolation and check by hand.
 * That is also the reason there is no charting dependency here: the geometry a
 * bar chart and a line chart actually need is this file, and a library would
 * bring a renderer, a theme layer and an interaction model that then have to be
 * fought to match everything else.
 */

/**
 * Axis ticks on round numbers, covering `[0, max]`.
 *
 * Rounds the *step* to 1, 2, 5 or 10 × a power of ten, then extends the top of
 * the axis to a multiple of it. Ticks at 0 / 2,500 / 5,000 are read at a glance;
 * ticks at 0 / 2,317 / 4,634 — what you get from dividing the data range — have
 * to be decoded, and the reader stops trusting their own estimate of where a bar
 * lands.
 *
 * Always starts at zero. A bar chart with a truncated baseline overstates
 * differences by whatever fraction you cut off, which is the most effective way
 * to mislead with a chart and the easiest to do by accident.
 */
export function niceTicks(max: number, count = 4): readonly number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];

  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;

  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  // Accumulating `value += step` drifts on fractional steps (0.1 + 0.2 …);
  // multiplying an integer index does not.
  for (let index = 0; index * step <= top + step / 2; index += 1) {
    ticks.push(index * step);
  }
  return ticks;
}

/**
 * Maps `value` from `[0, domainMax]` onto `[0, rangeMax]` pixels.
 *
 * Guards a zero domain by returning zero rather than `NaN`. An all-zero series
 * is a real thing to plot — "nothing happened" — and one `NaN` in a path
 * attribute makes the entire path vanish, so a flat line at the baseline is both
 * correct and the only readable failure mode.
 */
export function scaleLinear(value: number, domainMax: number, rangeMax: number): number {
  if (domainMax <= 0) return 0;
  return (value / domainMax) * rangeMax;
}

export type Point = { readonly x: number; readonly y: number };

/**
 * An SVG path through points, as straight segments.
 *
 * Straight, not smoothed. A spline through data invents values between the
 * points — it will overshoot a local maximum and draw a peak that was never
 * measured. Curves are for decoration; these are measurements.
 */
export function linePath(points: readonly Point[]): string {
  if (points.length === 0) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
}

/**
 * "1,284" · "12.9K" · "4.2M".
 *
 * Compacts only past a thousand, and keeps one decimal so 12.9K and 13.4K stay
 * distinguishable. Below a thousand the exact number is short enough to show,
 * and rounding it would be a loss with no gain.
 */
export function formatCompact(value: number): string {
  const magnitude = Math.abs(value);
  if (magnitude >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (magnitude >= 10_000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
}

/**
 * The step-graph's node layout runs along one axis at a time — a compact
 * preview reads left to right, an expanded trace pane reads top to bottom —
 * so the same edge-drawing and default-ordering helpers serve both instead of
 * a bespoke path builder per orientation.
 */
export type StepGraphLayoutAxis = "horizontal" | "vertical";

export type StepGraphEdgeEndpoint = { readonly from: string; readonly to: string };

/** Every step connects to the next, in array order — the default edge set
 * when a caller has no real DAG dependency data to draw. */
export function sequentialStepEdges(stepIds: readonly string[]): readonly StepGraphEdgeEndpoint[] {
  const edges: StepGraphEdgeEndpoint[] = [];
  for (let i = 0; i < stepIds.length - 1; i++) {
    const from = stepIds[i];
    const to = stepIds[i + 1];
    if (from !== undefined && to !== undefined) edges.push({ from, to });
  }
  return edges;
}

/**
 * An SVG path for one node-to-node connector, straight and inset from both
 * node centers by `inset` so the line meets each node's edge rather than
 * running through its label. Returns `""` for a degenerate (near-zero-length)
 * connector — an arrowhead with nothing to point along would be a rendering
 * artifact, not information.
 */
export function buildStepGraphEdgePath(from: Point, to: Point, inset: number): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= inset * 2) return "";
  const ux = dx / length;
  const uy = dy / length;
  const start = { x: from.x + ux * inset, y: from.y + uy * inset };
  const end = { x: to.x - ux * inset, y: to.y - uy * inset };
  return linePath([start, end]);
}
