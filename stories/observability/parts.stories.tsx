import { Ledger } from "../../src/ui/observability/ledger.js";
import { usageOf } from "../../src/ui/observability/metrics.js";
import { DEFAULT_LAYERS } from "../../src/ui/observability/model.js";
import { Shape, StepCosts } from "../../src/ui/observability/finops.js";
import {
  AgentBrief,
  SpanInspector,
} from "../../src/ui/observability/span-inspector.js";
import { TraceSteps } from "../../src/ui/observability/trace-steps.js";
import { TraceTimeline } from "../../src/ui/observability/timeline.js";
import { placeSpans, traceEnd } from "../../src/ui/observability/tree.js";
import { UsageMix } from "../../src/ui/observability/usage-mix.js";
import { trace } from "./fixtures.js";

export default { title: "Observability / Parts" };

const review = trace("wf-review");
const editor = trace("ag-editor");

export const Usage = () => (
  <div className="max-w-md p-6">
    <UsageMix usage={usageOf(review)} />
  </div>
);

export const LedgerPage = () => (
  <div className="p-6">
    <Ledger trace={review} sort="cost" />
  </div>
);
LedgerPage.storyName = "Ledger";

export const CostByStep = () => (
  <div className="max-w-xl p-6">
    <StepCosts trace={review} />
  </div>
);
CostByStep.storyName = "Cost by step";

export const RunShape = () => (
  <div className="p-6">
    <Shape trace={review} />
  </div>
);
RunShape.storyName = "Shape";

export const Timeline = () => (
  <div className="p-6">
    <TraceTimeline
      spans={review.spans}
      endMs={Math.max(review.durationMs, traceEnd(review.spans), 1)}
      timeMs={40_000}
      playing={false}
      onTimeChange={() => {}}
      onPlayingChange={() => {}}
    />
  </div>
);

export const Steps = () => (
  <div className="h-[640px] border border-border">
    <TraceSteps
      placed={placeSpans(review.spans)}
      end={Math.max(review.durationMs, traceEnd(review.spans), 1)}
      timeMs={40_000}
      selectedId="tool-shell"
      onSeek={() => {}}
    />
  </div>
);

export const Brief = () => {
  if (editor.brief === undefined)
    throw new Error("editor fixture has no brief");
  return <AgentBrief brief={editor.brief} />;
};

export const Inspector = () => {
  const span = editor.spans.find((item) => item.id === "e5");
  if (span === undefined) throw new Error("missing compaction span");
  return (
    <div className="max-w-lg p-4">
      <SpanInspector
        traceSpans={editor.spans}
        span={span}
        timeMs={span.startMs + span.durationMs}
        layers={DEFAULT_LAYERS}
        playing={false}
      />
    </div>
  );
};
