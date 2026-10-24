"use client";

import { useEffect, type ReactNode } from "react";

import { useControllableState } from "../../hooks/use-controllable-state.js";
import { cn } from "../../lib/utils.js";
import type { Span, Trace } from "./model.js";
import { deepestAt } from "./playback.js";
import { placeSpans, traceEnd, type PlacedSpan } from "./tree.js";

export type RunState = {
  readonly timeMs: number;
  readonly setTimeMs: (timeMs: number) => void;
  readonly playing: boolean;
  readonly setPlaying: (playing: boolean) => void;
  readonly selected: Span | undefined;
  readonly select: (id: string, startMs: number) => void;
  readonly end: number;
  readonly placed: readonly PlacedSpan[];
};

export function Run({
  trace,
  className,
  selectedId: selectedProp,
  defaultSelectedId,
  onSelect,
  timeMs: timeProp,
  defaultTimeMs = 0,
  onTimeChange,
  playing: playingProp,
  defaultPlaying = false,
  onPlayingChange,
  children,
}: {
  readonly trace: Trace;
  readonly className?: string;
  readonly selectedId?: string;
  readonly defaultSelectedId?: string;
  readonly onSelect?: (id: string) => void;
  readonly timeMs?: number;
  readonly defaultTimeMs?: number;
  readonly onTimeChange?: (timeMs: number) => void;
  readonly playing?: boolean;
  readonly defaultPlaying?: boolean;
  readonly onPlayingChange?: (playing: boolean) => void;
  readonly children: (state: RunState) => ReactNode;
}) {
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
  const placed = placeSpans(trace.spans);
  const selected = trace.spans.find((span) => span.id === selectedId);
  const end = Math.max(trace.durationMs, traceEnd(trace.spans), 1);
  useEffect(() => {
    if (!playing) return;
    const active = deepestAt(trace.spans, timeMs);
    if (active !== undefined && active.id !== selectedId)
      setSelectedId(active.id);
  }, [playing, trace.spans, timeMs, selectedId, setSelectedId]);

  function select(id: string, at: number) {
    setPlaying(false);
    setSelectedId(id);
    setTimeMs(at);
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {children({
        timeMs,
        setTimeMs,
        playing,
        setPlaying,
        selected,
        select,
        end,
        placed,
      })}
    </div>
  );
}
