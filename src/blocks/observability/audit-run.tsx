import {
  Brief,
  Compaction,
  ContextTransform,
  Grant,
  Input,
  Network,
  Output,
  Payload,
  Sidecar,
  Signal,
  Thinking,
  Tool,
  ToolResultTransform,
} from "../../ui/observability/elements.js";
import { TimingBreakdown } from "../../ui/observability/elements.js";
import type { Trace } from "../../ui/observability/model.js";
import { TraceHeader } from "../../ui/observability/trace-header.js";
import { Timing, TraceSteps } from "../../ui/observability/trace-steps.js";
import { Run } from "../../ui/observability/trace-view.js";
import { TraceTimeline } from "../../ui/observability/timeline.js";

export function AuditRun({
  trace,
  focusSpan,
}: {
  readonly trace: Trace;
  readonly focusSpan?: string;
}) {
  return (
    <Run
      trace={trace}
      className="min-h-0 flex-1"
      {...(focusSpan === undefined ? {} : { defaultSelectedId: focusSpan })}
    >
      {(state) => (
        <>
          <TraceHeader trace={trace} />
          <Brief brief={trace.brief} />
          {trace.placement === undefined ? null : (
            <Sidecar placement={trace.placement} />
          )}
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
            <TraceTimeline
              spans={trace.spans}
              endMs={state.end}
              timeMs={state.timeMs}
              playing={state.playing}
              onTimeChange={state.setTimeMs}
              onPlayingChange={state.setPlaying}
            />
            <TimingBreakdown spans={trace.spans} />
          </div>
          <div className="flex min-h-0 flex-1">
            <TraceSteps
              placed={state.placed}
              end={state.end}
              selectedId={state.selected?.id ?? ""}
              onSeek={state.select}
              renderTrailing={(span) => (
                <Timing span={span} end={state.end} timeMs={state.timeMs} />
              )}
            />
            <aside className="w-80 shrink-0 overflow-auto border-l border-border p-4">
              {state.selected === undefined ? (
                <p className="text-sm text-muted-foreground">Select a step.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <Signal span={state.selected} />
                  <Tool span={state.selected} />
                  <Thinking
                    span={state.selected}
                    timeMs={state.timeMs}
                    playing={state.playing}
                  />
                  <Compaction span={state.selected} />
                  <ContextTransform span={state.selected} />
                  <ToolResultTransform span={state.selected} />
                  <Grant span={state.selected} />
                  <Input span={state.selected} />
                  <Output span={state.selected} />
                  <Network span={state.selected} />
                  <Payload span={state.selected} />
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </Run>
  );
}
