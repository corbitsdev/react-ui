import { DEFAULT_LAYERS } from "../../src/ui/observability/model.js";
import { SpanInspector } from "../../src/ui/observability/span-inspector.js";
import { Step } from "../../src/ui/observability/trace-steps.js";
import { placeSpans, traceEnd } from "../../src/ui/observability/tree.js";
import { trace } from "./fixtures.js";

export default { title: "Observability / Step" };

function ShownStep({
  traceId,
  spanId,
}: {
  readonly traceId: string;
  readonly spanId: string;
}) {
  const run = trace(traceId);
  const placed = placeSpans(run.spans).find((row) => row.span.id === spanId);
  if (placed === undefined) throw new Error(`Missing step ${spanId}`);
  const end = Math.max(run.durationMs, traceEnd(run.spans), 1);
  const at = placed.span.startMs + placed.span.durationMs;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_20rem] items-start border border-border">
      <div role="listbox" aria-label="Step">
        <Step
          span={placed.span}
          depth={placed.depth}
          end={end}
          timeMs={at}
          selected
          onSelect={() => {}}
        />
      </div>
      <div className="overflow-auto border-l border-border p-4">
        <SpanInspector
          traceSpans={run.spans}
          span={placed.span}
          timeMs={at}
          layers={DEFAULT_LAYERS}
          playing={false}
        />
      </div>
    </div>
  );
}

export const FailedShell = () => (
  <ShownStep traceId="wf-review" spanId="tool-shell" />
);
FailedShell.storyName = "Failed shell";

export const DeniedWrite = () => <ShownStep traceId="ag-editor" spanId="e4" />;
DeniedWrite.storyName = "Denied write";

export const Compaction = () => <ShownStep traceId="ag-editor" spanId="e5" />;
Compaction.storyName = "Compaction";

export const StartedByMessage = () => (
  <ShownStep traceId="wf-review" spanId="mail-in" />
);
StartedByMessage.storyName = "Started by a message";

export const WaitingForApproval = () => (
  <ShownStep traceId="ag-shell" spanId="h2" />
);
WaitingForApproval.storyName = "Waiting for approval";
