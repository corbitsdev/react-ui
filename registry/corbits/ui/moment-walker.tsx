"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId } from "react";
import type { ReactNode } from "react";

import { type ActivityEntry } from "@/registry/corbits/lib/activity";
import { formatRelativeTime } from "@/registry/corbits/lib/relative-time";
import { cn } from "@/registry/corbits/lib/utils";
import { Button } from "@/registry/corbits/ui/button";
import { EmptyState } from "@/registry/corbits/ui/empty-state";

export type MomentWalkerProps = {
  /** In the order they should be walked — usually oldest to newest. */
  readonly moments: readonly ActivityEntry[];
  readonly index: number;
  readonly onIndexChange: (index: number) => void;
  /** The detail for the current moment — a payload, a trace, a diff. */
  readonly children?: (moment: ActivityEntry) => ReactNode;
  readonly now?: number;
  readonly className?: string;
};

/**
 * One moment at a time, with the sequence underneath.
 *
 * A timeline answers "what happened"; this answers "what happened *then*". The
 * difference is that a feed asks you to hold context across forty rows, whereas
 * this pins one moment on screen and gives you a step control — which is the
 * right shape whenever the interesting thing is a single event's detail and its
 * position in a run.
 *
 * The strip beneath the controls is a `role="listbox"` of moments, not a row of
 * buttons. Walking a sequence is picking one of many — the listbox role is what
 * says the options are a set with a current selection, and it is what makes
 * "moment 4 of 19, selected" the announcement instead of nineteen unlabelled
 * buttons. The listbox keeps focus and points at the current option with
 * `aria-activedescendant`, which is the half of the composite-widget pattern
 * that actually tells a screen reader *which* option moved; a focused container
 * with a silently changing `aria-selected` underneath announces nothing.
 *
 * Arrow keys move; Home and End jump to the ends. A stepper whose only affordance
 * is two buttons makes stepping through nineteen moments nineteen tab-and-space
 * cycles.
 *
 * The index is the caller's. It is almost always shared — a URL, a chart's
 * hover, a sibling list — and a walker holding it privately cannot be driven
 * from any of them.
 */
export function MomentWalker({ moments, index, onIndexChange, children, now, className }: MomentWalkerProps) {
  const base = useId();
  const optionId = (position: number) => `${base}-moment-${position}`;

  if (moments.length === 0) {
    return <EmptyState className={className} title="No moments recorded" />;
  }

  const clamped = Math.min(moments.length - 1, Math.max(0, index));
  const current = moments[clamped];
  if (current === undefined) return <EmptyState className={className} title="No moments recorded" />;

  const go = (next: number) => onIndexChange(Math.min(moments.length - 1, Math.max(0, next)));

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => go(clamped - 1)}
          disabled={clamped === 0}
          aria-label="Previous moment"
        >
          <ChevronLeft aria-hidden />
          Previous
        </Button>
        {/* Announced on change, so stepping is audible and not only visible. */}
        <p role="status" className="font-mono text-xs text-muted-foreground tabular-nums">
          {clamped + 1} of {moments.length}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => go(clamped + 1)}
          disabled={clamped === moments.length - 1}
          aria-label="Next moment"
        >
          Next
          <ChevronRight aria-hidden />
        </Button>
      </div>

      <div
        role="listbox"
        aria-label="Moments"
        aria-orientation="horizontal"
        aria-activedescendant={optionId(clamped)}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            go(clamped + 1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            go(clamped - 1);
          } else if (event.key === "Home") {
            event.preventDefault();
            go(0);
          } else if (event.key === "End") {
            event.preventDefault();
            go(moments.length - 1);
          }
        }}
        className="flex gap-1 overflow-x-auto rounded-md border border-border p-1"
      >
        {moments.map((moment, momentIndex) => {
          const active = momentIndex === clamped;
          return (
            <div
              key={moment.id}
              id={optionId(momentIndex)}
              role="option"
              aria-selected={active}
              // Not focusable: focus stays on the listbox and the selection
              // moves, which is the composite-widget pattern. Nineteen tab
              // stops in a strip is the thing this avoids.
              onClick={() => go(momentIndex)}
              className={cn(
                "h-6 min-w-2 shrink-0 cursor-pointer rounded-xs transition-colors",
                active ? "bg-primary-emphasis" : "bg-muted hover:bg-input",
              )}
              title={`${momentIndex + 1}. ${moment.kind}`}
            >
              <span className="sr-only">
                {momentIndex + 1}. {moment.kind}
                {moment.summary === undefined ? "" : ` — ${moment.summary}`}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold">{current.kind}</p>
          <time dateTime={current.timestamp} className="font-mono text-xs text-muted-foreground">
            {formatRelativeTime(current.timestamp, now)}
          </time>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{current.summary ?? "No details recorded"}</p>
        {children === undefined ? null : <div className="mt-2">{children(current)}</div>}
      </div>
    </div>
  );
}
