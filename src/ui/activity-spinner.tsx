import { cn } from "../lib/utils.js";

/**
 * Something running right now, as a quarter arc turning on a faint ring.
 * Still under reduced motion; the words beside it say it is running.
 * Internal to the activity parts, so the main thread and its agents show
 * work in progress the same way.
 */
export function ActivitySpinner({
  className,
}: {
  readonly className?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      data-slot="activity-spinner"
      className={cn("size-3.5 shrink-0 motion-safe:animate-spin", className)}
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        strokeWidth="1.5"
        className="stroke-border-strong"
      />
      <path
        d="M8 2a6 6 0 0 1 6 6"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="stroke-foreground"
      />
    </svg>
  );
}
