import { useEffect, useState } from "react";
import { cn } from "../lib/utils.js";
import { ShimmerText } from "./shimmer-text.js";

export type ThinkingLabelProps = {
  /** What the agent is doing, in its own words — rotated in order. */
  readonly verbs: readonly string[];
  readonly intervalMs?: number;
  readonly className?: string;
};

const DEFAULT_INTERVAL_MS = 3_000;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The shimmering "working" word, rotating through caller-supplied verbs on
 * an interval. `aria-live="polite"` announces each new verb without
 * interrupting whatever a screen reader is already reading; reduced motion
 * stops the rotation outright rather than just stilling the shimmer, so a
 * reduced-motion reader isn't re-announced every few seconds for no visible
 * change.
 */
export function ThinkingLabel({ verbs, intervalMs = DEFAULT_INTERVAL_MS, className }: ThinkingLabelProps) {
  const [at, setAt] = useState(0);

  useEffect(() => {
    if (verbs.length < 2 || prefersReducedMotion()) return;
    const timer = setInterval(() => setAt((current) => (current + 1) % verbs.length), intervalMs);
    return () => clearInterval(timer);
  }, [verbs.length, intervalMs]);

  if (verbs.length === 0) return null;

  const verb = verbs[at % verbs.length];

  return (
    <span role="status" aria-live="polite" className={cn("text-sm", className)}>
      <ShimmerText key={at}>{`${verb}`}</ShimmerText>
    </span>
  );
}
