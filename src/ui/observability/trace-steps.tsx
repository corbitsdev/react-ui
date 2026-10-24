"use client";

import { type ReactNode } from "react";

import { seriesColor } from "../../lib/chart-palette.js";
import { cn } from "../../lib/utils.js";
import { formatDuration } from "./format.js";
import type { Span } from "./model.js";
import { spanEnd } from "./playback.js";
import type { PlacedSpan } from "./tree.js";
import { rowMarker, stepTitle } from "./wording.js";

export function TraceSteps({
  placed,
  end,
  selectedId,
  onSeek,
  rowRef,
  renderTrailing,
}: {
  readonly placed: readonly PlacedSpan[];
  readonly end: number;
  readonly selectedId: string;
  readonly onSeek: (id: string, startMs: number) => void;
  readonly rowRef?: (id: string, node: HTMLButtonElement | null) => void;
  readonly renderTrailing?: (span: Span) => ReactNode;
}) {
  const index = placed.findIndex((row) => row.span.id === selectedId);
  function move(delta: number) {
    const next = placed[index + delta];
    if (next !== undefined) onSeek(next.span.id, next.span.startMs);
  }
  return (
    <div
      className="min-w-0 flex-1 overflow-auto outline-none"
      role="listbox"
      aria-label="Trace steps"
      aria-activedescendant={selectedId === "" ? undefined : selectedId}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          move(1);
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      <div
        className={cn(
          "grid border-b border-border px-2 py-1 font-mono text-[11px] text-muted-foreground",
          renderTrailing === undefined
            ? "grid-cols-1"
            : "grid-cols-[minmax(0,1fr)_16rem]",
        )}
      >
        <span>Step</span>
        {renderTrailing === undefined ? null : (
          <span className="flex justify-between">
            <span>0</span>
            <span>{formatDuration(end)}</span>
          </span>
        )}
      </div>
      {placed.map(({ span, depth }) => (
        <div
          key={span.id}
          className={cn(
            "grid border-b border-border",
            renderTrailing === undefined
              ? "grid-cols-1"
              : "grid-cols-[minmax(0,1fr)_16rem]",
            span.id === selectedId &&
              "bg-muted/70 shadow-[inset_2px_0_0_var(--foreground)]",
          )}
        >
          <Step
            span={span}
            depth={depth}
            selected={span.id === selectedId}
            onSelect={() => onSeek(span.id, span.startMs)}
            buttonRef={(node) => rowRef?.(span.id, node)}
          />
          {renderTrailing === undefined ? null : renderTrailing(span)}
        </div>
      ))}
    </div>
  );
}

export function Step({
  span,
  depth = 0,
  selected = false,
  onSelect,
  buttonRef,
}: {
  readonly span: Span;
  readonly depth?: number;
  readonly selected?: boolean;
  readonly onSelect?: () => void;
  readonly buttonRef?: (node: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      type="button"
      role="option"
      id={span.id}
      aria-selected={selected}
      ref={buttonRef}
      className="flex min-w-0 items-center gap-2 py-1.5 text-left"
      style={{ paddingLeft: 8 + depth * 14 }}
      {...(onSelect === undefined ? {} : { onClick: onSelect })}
    >
      <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">
        {rowMarker(span)}
      </span>
      <span className="truncate text-sm">{stepTitle(span)}</span>
    </button>
  );
}

export function Timing({
  span,
  end,
  timeMs,
}: {
  readonly span: Span;
  readonly end: number;
  readonly timeMs: number;
}) {
  const played = playedRatio(span, timeMs);
  return (
    <div
      className="relative"
      title={formatDuration(span.durationMs)}
      aria-hidden="true"
    >
      <div
        className="absolute inset-y-2 overflow-hidden rounded-sm"
        style={barBox(span, end)}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundColor: barColor(span) }}
        />
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${played * 100}%`,
            backgroundColor: barColor(span),
          }}
        />
      </div>
      <span
        className="absolute inset-y-0 w-px bg-foreground"
        style={{ left: `${(Math.min(timeMs, end) / end) * 100}%` }}
      />
    </div>
  );
}

function playedRatio(span: Span, timeMs: number): number {
  if (timeMs <= span.startMs) return 0;
  if (timeMs >= spanEnd(span)) return 1;
  return (timeMs - span.startMs) / Math.max(span.durationMs, 1);
}

function barBox(span: Span, end: number): { left: string; width: string } {
  const width = (Math.max(span.durationMs, 1) / end) * 100;
  return {
    left: `${(span.startMs / end) * 100}%`,
    width: `max(4px, ${width}%)`,
  };
}

function ink(amount: number): string {
  return `color-mix(in oklab, var(--foreground) ${amount}%, transparent)`;
}

function barColor(span: Span): string {
  if (span.status === "error" || span.status === "denied")
    return "var(--destructive)";
  if (span.status === "waiting") return "var(--warn)";
  if (span.status === "running") return "var(--foreground)";
  if (span.kind === "network") return seriesColor(0);
  if (span.kind === "mail" || span.kind === "attachment") return seriesColor(1);
  if (span.kind === "provision" || span.kind === "reactor")
    return seriesColor(3);
  if (span.kind === "reasoning") return ink(40);
  if (span.kind === "compact") return seriesColor(2);
  if (span.kind === "transform") return seriesColor(3);
  if (span.kind === "nudge") return ink(60);
  return ink(75);
}
