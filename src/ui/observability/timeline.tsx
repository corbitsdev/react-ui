"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";
import { seriesColor } from "../../lib/chart-palette.js";
import { cn } from "../../lib/utils.js";
import { Button } from "../button.js";
import { formatClock } from "./format.js";
import type { Span, SpanKind } from "./model.js";
import { nextBoundary, previousBoundary, SCAN_MS } from "./playback.js";
import { stepTitle } from "./wording.js";

export type TraceTimelineProps = {
  readonly spans: readonly Span[];
  readonly endMs: number;
  readonly timeMs: number;
  readonly playing: boolean;
  readonly onTimeChange: (timeMs: number) => void;
  readonly onPlayingChange: (playing: boolean) => void;
  readonly className?: string;
};

function ink(amount: number): string {
  return `color-mix(in oklab, var(--foreground) ${amount}%, transparent)`;
}

function seekAt(
  node: HTMLDivElement,
  clientX: number,
  end: number,
  onTimeChange: (timeMs: number) => void,
  onPlayingChange: (playing: boolean) => void,
): void {
  const rect = node.getBoundingClientRect();
  if (rect.width <= 0) return;
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  onPlayingChange(false);
  onTimeChange(Math.round(ratio * end));
}

const KIND_MARK: Record<SpanKind, string> = {
  turn: ink(70),
  reasoning: ink(40),
  tool: ink(80),
  permission: "var(--destructive)",
  subagent: ink(70),
  compact: seriesColor(2),
  transform: seriesColor(3),
  nudge: ink(60),
  error: "var(--destructive)",
  event: ink(40),
  step: ink(50),
  gate: "var(--foreground)",
  mail: seriesColor(1),
  provision: seriesColor(3),
  fork: seriesColor(0),
  reactor: seriesColor(2),
  network: seriesColor(0),
  attachment: seriesColor(1),
  citation: ink(40),
};

export function TraceTimeline({
  spans,
  endMs,
  timeMs,
  playing,
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
      <div className="rounded-sm focus-within:ring-2 focus-within:ring-ring">
        <div
          className="relative h-6 cursor-pointer rounded-sm bg-muted"
          aria-hidden="true"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            seekAt(
              event.currentTarget,
              event.clientX,
              end,
              onTimeChange,
              onPlayingChange,
            );
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            seekAt(
              event.currentTarget,
              event.clientX,
              end,
              onTimeChange,
              onPlayingChange,
            );
          }}
        >
          {spans.map((span) => (
            <span
              key={span.id}
              title={stepTitle(span)}
              className={cn(
                "absolute top-1.5 h-3 rounded-full",
                span.startMs > timeMs && "opacity-35",
              )}
              style={{
                left: `${(span.startMs / end) * 100}%`,
                width: `max(4px, ${(Math.max(span.durationMs, 1) / end) * 100}%)`,
                backgroundColor: KIND_MARK[span.kind],
              }}
            />
          ))}
          <span
            className="absolute top-0 h-full w-0.5 bg-foreground"
            style={{ left: `${(Math.min(timeMs, end) / end) * 100}%` }}
          />
        </div>
        <label className="sr-only">
          Trace time
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
          />
        </label>
      </div>
    </div>
  );
}
