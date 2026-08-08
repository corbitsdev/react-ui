import { useId, useMemo } from "react";

import { buildStepGraphEdgePath, sequentialStepEdges } from "../lib/chart-geometry.js";
import { computeStepGraphLayout, STEP_GRAPH_DENSITY, stepGraphNodeOffset } from "../lib/step-graph-layout.js";
import { StepGraphNode, type StepGraphNodeKind, type StepGraphNodeStatus } from "./step-graph-node.js";

export type StepGraphStep = {
  readonly id: string;
  readonly title: string;
  readonly kind: StepGraphNodeKind;
  readonly status?: StepGraphNodeStatus;
};

export type StepGraphEdge = { readonly from: string; readonly to: string };

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
 * connectors drawn between them. `StepGraphNode` renders each node and
 * `lib/step-graph-layout` computes the geometry; this component only wires
 * the two together and draws the SVG connectors.
 */
export function StepGraph({
  steps,
  edges,
  density = "compact",
  emptyMessage = "This workflow has no preview available. You can still run it.",
  className,
}: StepGraphProps) {
  const labelId = useId();
  const spec = STEP_GRAPH_DENSITY[density];

  const resolvedEdges = useMemo(
    () => (edges !== undefined && edges.length > 0 ? edges : sequentialStepEdges(steps.map((step) => step.id))),
    [edges, steps],
  );

  const layout = useMemo(() => computeStepGraphLayout(steps.length, spec), [steps.length, spec]);

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
              const d = buildStepGraphEdgePath(fromCenter, toCenter, spec.nodeInset);
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
              const { left, top } = stepGraphNodeOffset(index, spec);
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
