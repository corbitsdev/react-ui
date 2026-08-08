import { useId, useMemo } from "react";

import { buildStepGraphEdgePath, sequentialStepEdges, type StepGraphLayoutAxis } from "../lib/chart-geometry.js";
import { StepGraphNode, type StepGraphNodeKind, type StepGraphNodeStatus } from "./step-graph-node.js";

export type StepGraphStep = {
  readonly id: string;
  readonly title: string;
  readonly kind: StepGraphNodeKind;
  readonly status?: StepGraphNodeStatus;
};

export type StepGraphEdge = { readonly from: string; readonly to: string };

type DensitySpec = {
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly gap: number;
  readonly nodeInset: number;
  readonly crossCenter: number;
  readonly padding: number;
  readonly axis: StepGraphLayoutAxis;
};

const DENSITY: Record<"compact" | "expanded", DensitySpec> = {
  compact: { nodeWidth: 172, nodeHeight: 48, gap: 20, nodeInset: 14, crossCenter: 18, padding: 4, axis: "horizontal" },
  expanded: { nodeWidth: 240, nodeHeight: 56, gap: 28, nodeInset: 18, crossCenter: 120, padding: 8, axis: "vertical" },
};

function graphSpan(count: number, spec: DensitySpec): number {
  if (count <= 0) return 0;
  const size = spec.axis === "horizontal" ? spec.nodeWidth : spec.nodeHeight;
  return spec.padding * 2 + count * size + Math.max(0, count - 1) * spec.gap;
}

function nodeOffset(index: number, spec: DensitySpec): { readonly left: number; readonly top: number } {
  if (spec.axis === "horizontal") {
    return { left: spec.padding + index * (spec.nodeWidth + spec.gap), top: spec.crossCenter + 10 };
  }
  return { left: spec.padding, top: spec.padding + index * (spec.nodeHeight + spec.gap) };
}

export type StepGraphProps = {
  readonly steps: readonly StepGraphStep[];
  /** Defaults to a straight chain through `steps` in order. */
  readonly edges?: readonly StepGraphEdge[];
  readonly density?: "compact" | "expanded";
  readonly emptyMessage?: string;
  readonly className?: string;
};

/**
 * A workflow's steps as a small node-and-edge diagram: nodes in run order,
 * connectors drawn between them. `StepGraphNode` renders each node; this
 * component owns only the layout math and the SVG connectors.
 */
export function StepGraph({
  steps,
  edges,
  density = "compact",
  emptyMessage = "This workflow has no preview available. You can still run it.",
  className,
}: StepGraphProps) {
  const labelId = useId();
  const spec = DENSITY[density];

  const resolvedEdges = useMemo(
    () => (edges !== undefined && edges.length > 0 ? edges : sequentialStepEdges(steps.map((step) => step.id))),
    [edges, steps],
  );

  const layout = useMemo(() => {
    const span = graphSpan(steps.length, spec);
    const centers = steps.map((_, index) => {
      const { left, top } = nodeOffset(index, spec);
      return spec.axis === "horizontal" ? { x: left + spec.nodeWidth / 2, y: top + 14 } : { x: left + spec.nodeWidth / 2, y: top + spec.nodeHeight / 2 };
    });
    const width = spec.axis === "horizontal" ? span : spec.nodeWidth + spec.padding * 2;
    const height = spec.axis === "horizontal" ? spec.nodeHeight + spec.crossCenter + 24 : span;
    return { centers, width, height };
  }, [steps, spec]);

  const idToIndex = useMemo(() => new Map(steps.map((step, index) => [step.id, index])), [steps]);

  if (steps.length === 0) {
    return <p className={className}>{emptyMessage}</p>;
  }

  return (
    <figure aria-labelledby={labelId} className={className}>
      <p id={labelId} className="sr-only">
        {`Workflow steps: ${steps.map((step, index) => `${index + 1}. ${step.title}`).join("; ")}`}
      </p>
      <div className={density === "compact" ? "overflow-x-auto pb-1" : "overflow-y-auto"}>
        <div className="relative" style={{ width: layout.width, height: layout.height, minWidth: "100%" }}>
          <svg
            aria-hidden
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            className="pointer-events-none absolute left-0 top-0 text-border"
          >
            <defs>
              <marker id={`${labelId}-arrow`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" className="fill-border" />
              </marker>
            </defs>
            {resolvedEdges.map((edge) => {
              const fromIdx = idToIndex.get(edge.from);
              const toIdx = idToIndex.get(edge.to);
              if (fromIdx === undefined || toIdx === undefined) return null;
              const fromCenter = layout.centers[fromIdx];
              const toCenter = layout.centers[toIdx];
              if (fromCenter === undefined || toCenter === undefined) return null;
              const d = buildStepGraphEdgePath(fromCenter, toCenter, spec.nodeInset, spec.axis);
              if (d === "") return null;
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  markerEnd={`url(#${labelId}-arrow)`}
                />
              );
            })}
          </svg>

          <ol className="relative m-0 list-none p-0">
            {steps.map((step, index) => {
              const { left, top } = nodeOffset(index, spec);
              return (
                <StepGraphNode
                  key={step.id}
                  title={step.title}
                  kind={step.kind}
                  status={step.status}
                  index={index}
                  width={spec.nodeWidth}
                  minHeight={spec.nodeHeight}
                  left={left}
                  top={top}
                />
              );
            })}
          </ol>
        </div>
      </div>
    </figure>
  );
}
