"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import { cn } from "../../lib/utils.js";
import { Button } from "../button.js";
import { formatClock } from "./format.js";
import type { Span, SpanKind } from "./model.js";
import { nextBoundary, previousBoundary, SCAN_MS } from "./playback.js";
import { stepTitle, type Wording } from "./wording.js";

export type TraceTimelineProps = {
  readonly spans: readonly Span[];
  readonly endMs: number;
  readonly timeMs: number;
  readonly playing: boolean;
  readonly wording: Wording;
  readonly onTimeChange: (timeMs: number) => void;
  readonly onPlayingChange: (playing: boolean) => void;
  readonly className?: string;
};

const KIND_MARK: Record<SpanKind, string> = {
  turn: "bg-foreground/70",
  reasoning: "bg-foreground/40",
  tool: "bg-foreground/80",
  permission: "bg-destructive",
  subagent: "bg-foreground/70",
  compact: "bg-chart-3",
  transform: "bg-chart-4",
  nudge: "bg-foreground/60",
  error: "bg-destructive",
  event: "bg-foreground/40",
  step: "bg-foreground/50",
  gate: "bg-foreground",
  mail: "bg-chart-2",
  provision: "bg-chart-4",
  fork: "bg-chart-1",
  reactor: "bg-chart-3",
  network: "bg-chart-1",
  attachment: "bg-chart-2",
  citation: "bg-foreground/40",
};

export function TraceTimeline({
  spans,
  endMs,
  timeMs,
  playing,
  wording,
  onTimeChange,
  onPlayingChange,
  className,
}: TraceTimelineProps) {
  const reduce = usePrefersReducedMotion();
  const timeRef = useRef(timeMs);
  const spansRef = useRef(spans);
  timeRef.current = timeMs;
  spansRef.current = spans;
  const end = Math.max(endMs, 1);

  useEffect(() => {
    if (!playing) return;
    if (reduce) {
      const id = window.setInterval(() => {
        const next = nextBoundary(spansRef.current, timeRef.current);
        if (next === undefined) {
          onTimeChange(end);
          onPlayingChange(false);
          return;
        }
        onTimeChange(next);
      }, 700);
      return () => window.clearInterval(id);
    }

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      const next = timeRef.current + (dt / SCAN_MS) * end;
      if (next >= end) {
        onTimeChange(end);
        onPlayingChange(false);
        return;
      }
      onTimeChange(next);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, reduce, end, onTimeChange, onPlayingChange]);

  function step(direction: 1 | -1) {
    onPlayingChange(false);
    const boundary =
      direction === 1
        ? nextBoundary(spans, timeMs)
        : previousBoundary(spans, timeMs);
    onTimeChange(boundary ?? (direction === 1 ? end : 0));
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={playing ? "outline" : "primary"}
          aria-pressed={playing}
          onClick={() => {
            if (!playing && timeMs >= end) onTimeChange(0);
            onPlayingChange(!playing);
          }}
        >
          {playing ? "Pause" : "Play"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => step(-1)}>
          Previous
        </Button>
        <Button size="sm" variant="outline" onClick={() => step(1)}>
          Next
        </Button>
        <span className="font-mono text-xs text-muted-foreground">
          {formatClock(timeMs)}
          <span className="text-foreground/40"> / {formatClock(end)}</span>
        </span>
      </div>
      <label className="flex flex-col gap-1">
        <span className="sr-only">Trace time</span>
        <input
          type="range"
          min={0}
          max={end}
          step={1}
          value={Math.min(timeMs, end)}
          aria-valuetext={formatClock(timeMs)}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            onPlayingChange(false);
            onTimeChange(next);
          }}
          className="h-2 w-full cursor-pointer"
          style={{ accentColor: "var(--foreground)" }}
        />
      </label>
      <div className="relative h-4 rounded-sm bg-muted" aria-hidden="true">
        {spans.map((span) => (
          <span
            key={span.id}
            title={stepTitle(span, wording)}
            className={cn(
              "absolute top-1 h-2 rounded-full",
              KIND_MARK[span.kind],
              span.startMs > timeMs && "opacity-35",
            )}
            style={{
              left: `${(span.startMs / end) * 100}%`,
              width: `max(3px, ${(Math.max(span.durationMs, 1) / end) * 100}%)`,
            }}
          />
        ))}
        <span
          className="absolute top-0 h-3 w-px bg-foreground"
          style={{ left: `${(Math.min(timeMs, end) / end) * 100}%` }}
        />
      </div>
    </div>
  );
}
