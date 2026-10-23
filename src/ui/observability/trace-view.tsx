"use client";

import { useEffect, useRef } from "react";

import { useControllableState } from "../../hooks/use-controllable-state.js";
import { cn } from "../../lib/utils.js";
import { Badge } from "../badge.js";
import { InspectorHeader, InspectorShell } from "../inspector-shell.js";
import { formatClock, formatDuration } from "./format.js";
import { DEFAULT_LAYERS, type Trace, type TraceLayers } from "./model.js";
import { deepestAt, grantAt, visibleSpans } from "./playback.js";
import { AgentBrief, SpanInspector } from "./span-inspector.js";
import {
  LiveGrant,
  STATUS_LABEL,
  STATUS_TONE,
  TraceHeader,
} from "./trace-header.js";
import { TraceSteps } from "./trace-steps.js";
import { TraceTimeline } from "./timeline.js";
import { placeSpans, traceEnd } from "./tree.js";
import { rowMarker, stepTitle } from "./wording.js";

export type TraceViewProps = {
  readonly trace: Trace;
  readonly selectedId?: string;
  readonly defaultSelectedId?: string;
  readonly onSelect?: (id: string) => void;
  readonly timeMs?: number;
  readonly defaultTimeMs?: number;
  readonly onTimeChange?: (timeMs: number) => void;
  readonly playing?: boolean;
  readonly defaultPlaying?: boolean;
  readonly onPlayingChange?: (playing: boolean) => void;
  readonly layers?: TraceLayers;
  readonly className?: string;
};

export function AgentTrace(props: TraceViewProps) {
  return <TraceView {...props} />;
}

export function WorkflowTrace(props: TraceViewProps) {
  return <TraceView {...props} />;
}

export function TraceView({
  trace,
  selectedId: selectedProp,
  defaultSelectedId,
  onSelect,
  timeMs: timeProp,
  defaultTimeMs = 0,
  onTimeChange,
  playing: playingProp,
  defaultPlaying = false,
  onPlayingChange,
  layers: layersProp,
  className,
}: TraceViewProps) {
  const placedAll = placeSpans(trace.spans);
  const [selectedId, setSelectedId] = useControllableState({
    value: selectedProp,
    defaultValue: defaultSelectedId ?? placedAll[0]?.span.id ?? "",
    onChange: onSelect,
    name: "selectedId",
  });
  const [timeMs, setTimeMs] = useControllableState({
    value: timeProp,
    defaultValue: defaultTimeMs,
    onChange: onTimeChange,
    name: "timeMs",
  });
  const [playing, setPlaying] = useControllableState({
    value: playingProp,
    defaultValue: defaultPlaying,
    onChange: onPlayingChange,
    name: "playing",
  });
  const layers = layersProp ?? DEFAULT_LAYERS;
  const shown = visibleSpans(trace.spans, layers);
  const placed = placeSpans(shown);
  const selected = trace.spans.find((span) => span.id === selectedId);
  const end = Math.max(trace.durationMs, traceEnd(trace.spans), 1);
  const liveGrant = layers.grants ? grantAt(shown, timeMs) : undefined;
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!playing) return;
    const active = deepestAt(visibleSpans(trace.spans, layers), timeMs);
    if (active !== undefined && active.id !== selectedId)
      setSelectedId(active.id);
  }, [playing, trace.spans, layers, timeMs, selectedId, setSelectedId]);

  useEffect(() => {
    rowRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  function seek(id: string, at: number) {
    setPlaying(false);
    setSelectedId(id);
    setTimeMs(at);
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <TraceHeader trace={trace} />
      {trace.brief === undefined ? null : <AgentBrief brief={trace.brief} />}
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
        <TraceTimeline
          spans={shown}
          endMs={end}
          timeMs={timeMs}
          playing={playing}
          onTimeChange={setTimeMs}
          onPlayingChange={setPlaying}
        />
        <LiveGrant span={liveGrant} />
      </div>
      <div className="flex min-h-0 flex-1">
        <TraceSteps
          placed={placed}
          end={end}
          timeMs={timeMs}
          selectedId={selectedId}
          onSeek={seek}
          rowRef={(id, node) => {
            if (node === null) rowRefs.current.delete(id);
            else rowRefs.current.set(id, node);
          }}
        />
        <InspectorShell
          className="w-80 shrink-0"
          header={
            selected === undefined ? undefined : (
              <InspectorHeader
                eyebrow={
                  <>
                    <Badge tone="neutral">{rowMarker(selected)}</Badge>
                    <Badge tone={STATUS_TONE[selected.status]}>
                      {STATUS_LABEL[selected.status]}
                    </Badge>
                  </>
                }
                title={stepTitle(selected)}
                description={`${formatClock(selected.startMs)} · ${formatDuration(selected.durationMs)}`}
              />
            )
          }
          {...(selected === undefined
            ? {
                empty: (
                  <p className="p-4 text-sm text-muted-foreground">
                    Select a step.
                  </p>
                ),
              }
            : {})}
        >
          {selected === undefined ? null : (
            <SpanInspector
              traceSpans={trace.spans}
              span={selected}
              timeMs={timeMs}
              layers={layers}
              playing={playing}
            />
          )}
        </InspectorShell>
      </div>
    </div>
  );
}
