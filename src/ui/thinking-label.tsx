import { useEffect, useState } from "react";

import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion.js";
import { cn } from "../lib/utils.js";
import { ShimmerText } from "./shimmer-text.js";

export type ThinkingLabelProps = {
  /** What the agent is doing, in its own words — rotated in order. */
  readonly verbs: readonly string[];
  /** Rotation cadence. A heartbeat, not a ticker — keep it at ~1s or slower. */
  readonly intervalMs?: number;
  readonly className?: string;
};

const DEFAULT_INTERVAL_MS = 3_000;

/**
 * The shimmering "working" word, rotating through caller-supplied verbs on
 * an interval. Every verb renders stacked in one grid cell, so the element's
 * width is the widest verb and a swap crossfades instead of reflowing
 * siblings. Visual rotation is decorative: a single `role="status"`
 * announces "Working" once, so a screen reader is not re-interrupted every
 * few seconds. Reduced motion is live via `usePrefersReducedMotion` and
 * stops the rotation rather than just stilling the shimmer.
 */
export function ThinkingLabel({ verbs, intervalMs = DEFAULT_INTERVAL_MS, className }: ThinkingLabelProps) {
  const [at, setAt] = useState(0);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (verbs.length < 2 || !reduceMotion) return;
    setAt(0);
  }, [verbs.length, reduceMotion]);

  useEffect(() => {
    if (verbs.length < 2 || reduceMotion) return;
    const timer = setInterval(() => setAt((current) => (current + 1) % verbs.length), intervalMs);
    return () => clearInterval(timer);
  }, [verbs.length, intervalMs, reduceMotion]);

  if (verbs.length === 0) return null;

  const active = at % verbs.length;

  return (
    <span className={cn("text-sm", className)}>
      <span role="status" className="sr-only">
        Working
      </span>
      <span aria-hidden className="inline-grid">
        {verbs.map((verb, index) => (
          <ShimmerText
            key={index}
            className={cn(
              "col-start-1 row-start-1 transition-opacity duration-200",
              index === active ? "opacity-100" : "opacity-0",
            )}
          >
            {verb}
          </ShimmerText>
        ))}
      </span>
    </span>
  );
}
