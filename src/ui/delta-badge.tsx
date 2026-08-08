import type { DeltaResult } from "../lib/metrics.js";
import { cn } from "../lib/utils.js";

export type DeltaBadgeProps = {
  /** From `computeDelta`. Renders nothing when there is no comparison window. */
  readonly delta: DeltaResult;
  /**
   * Whether an increase is a good thing. Error rate and cost say `false`;
   * throughput says `true`. Required because the mapping from direction to
   * sentiment is a property of the metric — defaulting it paints a rising
   * error rate as improvement.
   */
  readonly upIsGood: boolean;
  readonly className?: string;
};

/**
 * The period-over-period chip beside a stat's headline number.
 *
 * Renders nothing when the delta is not comparable: a flat "0%" over a range
 * with no previous window would read as stability that was never measured.
 * When the percentage has no baseline (previous period was zero) it shows the
 * absolute delta instead of a misleading "∞%". Sentiment is carried by tone
 * *and* by words — the `aria-label` says the direction and whether that is
 * better or worse, so the colour is never the only channel.
 */
export function DeltaBadge({ delta, upIsGood, className }: DeltaBadgeProps) {
  if (!delta.comparable) {
    return null;
  }
  if (delta.direction === "flat") {
    return (
      <span
        className={cn("font-mono text-[11px] tracking-[0.04em] text-muted-foreground tabular-nums", className)}
        aria-label="no change vs previous period"
      >
        0%
      </span>
    );
  }
  const up = delta.direction === "up";
  const good = up === upIsGood;
  const text =
    delta.pct !== null ? `${Math.abs(delta.pct).toFixed(0)}%` : `${delta.delta > 0 ? "+" : ""}${delta.delta}`;
  return (
    <span
      className={cn(
        "flex items-center gap-1 font-mono text-[11px] tracking-[0.04em] tabular-nums",
        good ? "text-primary-emphasis" : "text-destructive",
        className,
      )}
      aria-label={`${up ? "up" : "down"} ${text} vs previous period, ${good ? "better" : "worse"}`}
    >
      <span aria-hidden>{up ? "▲" : "▼"}</span>
      {text}
    </span>
  );
}
