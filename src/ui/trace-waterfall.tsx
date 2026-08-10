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
  readonly durationLabel: string;
  readonly tokensLabel?: string;
  readonly phase: TracePhase;
  readonly error?: string;
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
 * Run-trace timeline: one row per span with a proportional bar, duration,
 * and optional token count. Failed spans surface their error under the row.
 * The accessible table carries the same numbers for non-visual readers.
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
          span.durationLabel,
          span.tokensLabel ?? "—",
          PHASE_LABEL[span.phase],
        ]),
      }}
      className={className}
    >
      <div className="flex flex-col gap-1.5" role="presentation">
        {spans.map((span) => {
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
                  <div
                    className={cn(
                      "absolute inset-y-0",
                      PHASE_FILL[span.phase],
                      span.phase === "awaiting" &&
                        "[background-image:repeating-linear-gradient(135deg,transparent,transparent_3px,rgba(0,0,0,0.15)_3px,rgba(0,0,0,0.15)_6px)]",
                    )}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                </div>
                <div className="text-right font-mono text-[11px] leading-tight">
                  <p className="font-semibold">{span.durationLabel}</p>
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

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
