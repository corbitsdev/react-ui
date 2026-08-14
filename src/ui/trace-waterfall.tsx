import { cn } from "../lib/utils.js";
import { ChartFrame } from "./chart-frame.js";

export type TracePhase = "ok" | "awaiting" | "failed";

export type TraceSpan = {
  readonly id: string;
  readonly label: string;
  readonly kind: string;
  /** Inclusive start as a fraction of the total timeline (0–1). */
  readonly start: number;
  /** Inclusive end as a fraction of the total timeline (0–1). */
  readonly end: number;
  readonly durationLabel: string | null;
  readonly tokensLabel?: string;
  readonly phase: TracePhase;
  readonly error?: string;
  /**
   * How `start`/`end` were derived. "measured" (the default when omitted)
   * means real wall-clock timing, rendered as a proportional duration bar.
   * "ordinal" means the span was positioned only by event order within its
   * parent, with no real duration — it renders as a point marker at `start`
   * instead of a bar spanning start→end, so the chart never implies a
   * duration the data doesn't have.
   */
  readonly timingSource?: "measured" | "ordinal";
};

export type TraceWaterfallProps = {
  readonly title: string;
  readonly description?: string;
  readonly spans: readonly TraceSpan[];
  readonly className?: string;
};

const PHASE_FILL: Record<TracePhase, string> = {
  ok: "bg-success-foreground",
  awaiting: "bg-warning-foreground",
  failed: "bg-destructive",
};

const PHASE_LABEL: Record<TracePhase, string> = {
  ok: "ok",
  awaiting: "awaiting",
  failed: "failed",
};

/**
 * Run-trace timeline: one row per span with a duration, and optional token
 * count. A span with real wall-clock timing renders a proportional bar; a
 * span positioned only by event order (`timingSource: "ordinal"`) renders a
 * point marker instead, so the chart never implies a duration the data
 * doesn't have. Failed spans surface their error under the row. The
 * accessible table carries the same numbers for non-visual readers.
 */
export function TraceWaterfall({ title, description, spans, className }: TraceWaterfallProps) {
  return (
    <ChartFrame
      title={title}
      {...(description === undefined ? {} : { description })}
      table={{
        columns: ["Step", "Kind", "Duration", "Tokens", "Status"],
        rows: spans.map((span) => [
          span.label,
          span.kind,
          durationText(span.durationLabel),
          span.tokensLabel ?? "—",
          PHASE_LABEL[span.phase],
        ]),
      }}
      className={className}
    >
      <div className="flex flex-col gap-1.5" role="presentation">
        {spans.map((span) => {
          const isOrdinal = span.timingSource === "ordinal";
          const left = clamp01(span.start) * 100;
          const width = Math.max(0.5, (clamp01(span.end) - clamp01(span.start)) * 100);
          return (
            <div key={span.id} className="flex flex-col gap-0.5">
              <div className="grid grid-cols-[minmax(7rem,11rem)_1fr_minmax(4.5rem,6rem)] items-center gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{span.label}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{span.kind}</p>
                </div>
                <div className="relative h-4 w-full bg-muted">
                  {isOrdinal ? (
                    <span
                      className={cn(
                        "absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45",
                        PHASE_FILL[span.phase],
                      )}
                      style={{ left: `${left}%` }}
                    >
                      <span className="sr-only">
                        Approximate position by event order, not a measured duration
                      </span>
                    </span>
                  ) : (
                    <div
                      className={cn(
                        "absolute inset-y-0",
                        PHASE_FILL[span.phase],
                        span.phase === "awaiting" &&
                          "[background-image:repeating-linear-gradient(135deg,transparent,transparent_3px,rgba(0,0,0,0.15)_3px,rgba(0,0,0,0.15)_6px)]",
                      )}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                  )}
                </div>
                <div className="text-right font-mono text-[11px] leading-tight">
                  <p className="font-semibold">{durationText(span.durationLabel)}</p>
                  {span.tokensLabel === undefined ? null : (
                    <p className="text-muted-foreground">{span.tokensLabel}</p>
                  )}
                </div>
              </div>
              {span.error === undefined ? null : (
                <p className="ml-[11.5rem] border border-destructive/40 bg-destructive/10 px-2 py-1 text-[11px] text-destructive-foreground">
                  {span.error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </ChartFrame>
  );
}

function durationText(durationLabel: string | null): string {
  return durationLabel ?? "—";
}

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
