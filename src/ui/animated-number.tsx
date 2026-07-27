import { useEffect, useRef, useState } from "react";

import { cn } from "../lib/utils.js";

export type AnimatedNumberProps = {
  readonly value: number;
  /** Decimal places for the default formatting. Ignored when `format` is given. */
  readonly decimals?: number;
  readonly format?: (value: number) => string;
  /** Duration of the count, in ms. */
  readonly durationMs?: number;
  readonly className?: string;
};

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * A number that counts to its new value instead of snapping.
 *
 * Hand-rolled on `requestAnimationFrame` rather than pulling in a motion
 * library: this registry has no animation dependency, and one component's
 * count-up is not a good reason to add ~30kB that a consumer then owns.
 *
 * `tabular-nums`, so the digits do not change width mid-count and shove the
 * layout around — a KPI row that jitters while it settles is worse than one
 * that does not animate at all.
 *
 * Reduced motion is checked here rather than left to the theme's CSS override.
 * The theme can collapse a CSS animation, but this is a JS interpolation the
 * cascade cannot reach, so it snaps to the value instead.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  format,
  durationMs = 600,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const frameRef = useRef(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    if (reduce || from === value) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      setDisplay(from + (value - from) * easeOut(t));
      if (t < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = value;
      }
    };
    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, durationMs]);

  const text = format === undefined ? display.toFixed(decimals) : format(display);

  return (
    <span className={cn("tabular-nums", className)}>
      {/* The settled value is what assistive tech reads — announcing every
          interpolated frame would be unusable. */}
      <span aria-hidden>{text}</span>
      <span className="sr-only">{format === undefined ? value.toFixed(decimals) : format(value)}</span>
    </span>
  );
}
