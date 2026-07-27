import { cn } from "../lib/utils.js";

export type StatusDotTone = "neutral" | "emphasis" | "danger";

export type StatusDotProps = {
  /** Names the state for assistive tech. Required — a bare colour says nothing. */
  readonly label: string;
  /** Adds a ring that pulses outward: this state is live and still changing. */
  readonly live?: boolean;
  readonly tone?: StatusDotTone;
  readonly className?: string;
};

/**
 * Three tones, not one per status, and that is deliberate. A dot is a non-text
 * UI element and has to clear 3:1 against both the page and a card; the only
 * fills in the theme that do so at 8px are the emphasis orange, the destructive
 * red and the muted ink. A green "done" dot would have to invent a token, and
 * the run's own `Badge` already carries the full status colour on a
 * contrast-tested fill/foreground pair. The dot marks *liveness*; the badge
 * names the state.
 *
 * Classes are spelled out rather than composed at runtime — Tailwind's scanner
 * only emits utilities it can see literally in the source.
 */
const TONE_CLASS: Record<StatusDotTone, string> = {
  neutral: "bg-muted-foreground",
  emphasis: "bg-primary-emphasis",
  danger: "bg-destructive",
};

/**
 * A state marker carrying its own accessible name — a coloured dot with no
 * label is invisible to a screen reader, so the label is required rather than
 * optional.
 *
 * The `live` ring is a separate `aria-hidden` element: motion says "still
 * changing" to people who can see it, and the label already says so to those
 * who cannot. It stills under the theme's reduced-motion rule.
 */
export function StatusDot({ label, live = false, tone = "neutral", className }: StatusDotProps) {
  return (
    <span role="img" aria-label={label} className={cn("relative inline-flex size-2 shrink-0", className)}>
      {live ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 rounded-full [animation:corbits-status-pulse_1.8s_ease-out_infinite]",
            TONE_CLASS[tone],
          )}
        />
      ) : null}
      <span aria-hidden className={cn("relative size-full rounded-full", TONE_CLASS[tone])} />
    </span>
  );
}
