"use client";

import { useId } from "react";

import { cn } from "@/registry/corbits/lib/utils";

export type DialProps = {
  readonly label: string;
  readonly value: number;
  readonly onValueChange: (value: number) => void;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
  /** What the number means, and what moving it costs. */
  readonly description?: string;
  /**
   * Words for the current value — "Focused", "Creative". Shown beside the
   * number and used as `aria-valuetext`, because "0.7" tells a screen-reader
   * user nothing that "0.7, balanced" does not tell them better.
   */
  readonly valueText?: string;
  readonly disabled?: boolean;
  readonly className?: string;
};

/**
 * A continuous setting — temperature, a token budget, a threshold.
 *
 * A native `range` input, not a custom track: it already has full keyboard
 * support (arrows, Page Up/Down, Home/End), works with a screen reader, and is
 * draggable on touch. Every hand-built slider re-implements some of that and
 * misses the rest.
 *
 * The current value is always visible. A slider whose value you can only learn
 * by dragging it is a slider you cannot check.
 */
export function Dial({
  label,
  value,
  onValueChange,
  min,
  max,
  step = 1,
  description,
  valueText,
  disabled = false,
  className,
}: DialProps) {
  const id = useId();
  const descriptionId = description === undefined ? undefined : `${id}-description`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {value}
          {valueText === undefined ? null : ` · ${valueText}`}
        </span>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-describedby={descriptionId}
        aria-valuetext={valueText}
        onChange={(event) => onValueChange(event.target.valueAsNumber)}
        className="h-5 w-full accent-[var(--primary)] disabled:opacity-50"
      />

      {description === undefined ? null : (
        <p id={descriptionId} className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
