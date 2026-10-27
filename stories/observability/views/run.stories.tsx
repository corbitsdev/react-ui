import {
  ChildRun,
  Compaction,
  Execution,
  Grant,
  Sidecar,
  Signal,
  Thinking,
  Tool,
  Trigger,
} from "../../../src/ui/observability/elements.js";
import { TimingBreakdown } from "../../../src/ui/observability/elements.js";
import { Step, Timing } from "../../../src/ui/observability/trace-steps.js";
import { Run } from "../../../src/ui/observability/trace-view.js";
import { TraceHeader } from "../../../src/ui/observability/trace-header.js";
import { placeSpans, traceEnd } from "../../../src/ui/observability/tree.js";
import { trace } from "../fixtures.js";

export default { title: "Observability / Views / Run" };

const review = trace("wf-review");
const editor = trace("ag-editor");

function span(id: string, source = editor) {
  const found = source.spans.find((item) => item.id === id);
  if (found === undefined) throw new Error(`Missing step ${id}`);
  return found;
}

export const NameOnly = () => (
  <div className="h-[640px] border border-border">
    <Run trace={review}>{() => <TraceHeader trace={review} />}</Run>
  </div>
);
NameOnly.storyName = "Name only";

export const ParseableStart = () => {
  const run = {
    ...review,
    startedAt: "2026-10-24T15:04:00.000Z",
    spans: [span("turn", review), span("sub", review)],
  };
  return (
    <div className="border border-border">
      <TraceHeader trace={run} />
    </div>
  );
};
ParseableStart.storyName = "Parseable start";

export const WithSteps = () => (
  <div className="h-[640px] border border-border">
    <Run trace={review}>
      {(state) => (
        <div role="listbox" aria-label="Steps">
          {state.placed.map((row) => (
            <Step
              key={row.span.id}
              span={row.span}
              depth={row.depth}
              selected={row.span.id === state.selected?.id}
              onSelect={() => state.select(row.span.id, row.span.startMs)}
            />
          ))}
        </div>
      )}
    </Run>
  </div>
);
WithSteps.storyName = "With steps";

export const WithTiming = () => {
  const end = Math.max(review.durationMs, traceEnd(review.spans), 1);
  const placed = placeSpans(review.spans);
  const shell = span("tool-shell", review);
  return (
    <div className="border border-border p-4">
      <Timing
        span={shell}
        end={end}
        timeMs={shell.startMs + shell.durationMs}
      />
      <div className="mt-4 max-w-md">
        <TimingBreakdown spans={placed.map((row) => row.span)} />
      </div>
    </div>
  );
};
WithTiming.storyName = "Timing";

export const SidecarStory = () =>
  review.placement === undefined ? null : (
    <Sidecar
      placement={review.placement}
      shares={["Investigate a failing check"]}
      connectMs={1800}
      costUsd={0.04}
    />
  );
SidecarStory.storyName = "Sidecar";

export const TriggerStory = () => <Trigger span={span("mail-in", review)} />;
TriggerStory.storyName = "Trigger";

export const SignalStory = () => (
  <Signal span={span("h2", trace("ag-shell"))} />
);
SignalStory.storyName = "Signal";

export const ToolStory = () => <Tool span={span("tool-shell", review)} />;
ToolStory.storyName = "Tool";

export const ThinkingStory = () => <Thinking span={span("e3", editor)} />;
ThinkingStory.storyName = "Thinking";

export const CompactionStory = () => <Compaction span={span("e5", editor)} />;
CompactionStory.storyName = "Compaction";

export const GrantStory = () => <Grant span={span("tool-shell", review)} />;
GrantStory.storyName = "Grant";

export const ChildRunStory = () => <ChildRun name="Fork a test run" />;
ChildRunStory.storyName = "Child run";

export const ExecutionStory = () => (
  <Execution id="exec-1" status="completed" />
);
ExecutionStory.storyName = "Execution";

export const StepStory = () => (
  <div role="listbox" aria-label="Step">
    <Step span={span("tool-shell", review)} selected />
  </div>
);
StepStory.storyName = "Step";
