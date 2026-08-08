import type { Point, StepGraphLayoutAxis } from "./chart-geometry.js";

/**
 * The step graph's layout arithmetic, separated from its rendering the same
 * way `chart-geometry.ts` is separated from the charts: plain functions over
 * plain numbers, checkable in isolation. Internal — none of these names
 * appear in a public prop type.
 */

export type StepGraphDensitySpec = {
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly gap: number;
  readonly nodeInset: number;
  readonly crossCenter: number;
  readonly padding: number;
  readonly axis: StepGraphLayoutAxis;
};

export const STEP_GRAPH_DENSITY: Record<"compact" | "expanded", StepGraphDensitySpec> = {
  compact: { nodeWidth: 172, nodeHeight: 48, gap: 20, nodeInset: 14, crossCenter: 18, padding: 4, axis: "horizontal" },
  expanded: { nodeWidth: 240, nodeHeight: 56, gap: 28, nodeInset: 18, crossCenter: 120, padding: 8, axis: "vertical" },
};

export function stepGraphSpan(count: number, spec: StepGraphDensitySpec): number {
  if (count <= 0) return 0;
  const size = spec.axis === "horizontal" ? spec.nodeWidth : spec.nodeHeight;
  return spec.padding * 2 + count * size + Math.max(0, count - 1) * spec.gap;
}

export function stepGraphNodeOffset(index: number, spec: StepGraphDensitySpec): { readonly left: number; readonly top: number } {
  if (spec.axis === "horizontal") {
    return { left: spec.padding + index * (spec.nodeWidth + spec.gap), top: spec.crossCenter + 10 };
  }
  return { left: spec.padding, top: spec.padding + index * (spec.nodeHeight + spec.gap) };
}

export type StepGraphLayout = {
  readonly centers: readonly Point[];
  readonly width: number;
  readonly height: number;
};

/** The full frame: node centers for edge drawing plus the canvas extent. */
export function computeStepGraphLayout(count: number, spec: StepGraphDensitySpec): StepGraphLayout {
  const span = stepGraphSpan(count, spec);
  const centers = Array.from({ length: count }, (_, index) => {
    const { left, top } = stepGraphNodeOffset(index, spec);
    return spec.axis === "horizontal"
      ? { x: left + spec.nodeWidth / 2, y: top + 14 }
      : { x: left + spec.nodeWidth / 2, y: top + spec.nodeHeight / 2 };
  });
  const width = spec.axis === "horizontal" ? span : spec.nodeWidth + spec.padding * 2;
  const height = spec.axis === "horizontal" ? spec.nodeHeight + spec.crossCenter + 24 : span;
  return { centers, width, height };
}
