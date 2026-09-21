import { cn } from "../lib/utils.js";

export type ShimmerTextProps = {
  readonly children: string;
  /** Omit when an ancestor already carries the live region. */
  readonly role?: "status";
  readonly className?: string;
};

/**
 * A shimmer sweep over inline text: a brighter band slides through the
 * words to signal "still going" without the words themselves changing. The
 * sweep is a `background-clip: text` gradient animating its position, built
 * from `--muted-foreground` and `--foreground` only — no new hex, so the
 * contrast gate never sees it as a text/background pair.
 *
 * The theme's global reduced-motion rule collapses animation duration, but
 * that would still leave `text-transparent` + `background-clip: text` with
 * nothing to paint. Under `prefers-reduced-motion` and `forced-colors` this
 * falls back to solid `text-muted-foreground` with no clip.
 */
export function ShimmerText({ children, role, className }: ShimmerTextProps) {
  return (
    <span
      role={role}
      className={cn(
        "bg-clip-text text-transparent",
        "[background-image:linear-gradient(90deg,var(--muted-foreground)_40%,var(--foreground)_50%,var(--muted-foreground)_60%)]",
        "[background-size:200%_100%]",
        "[animation:corbits-shimmer-sweep_1.8s_linear_infinite]",
        "motion-reduce:animate-none motion-reduce:bg-none motion-reduce:bg-clip-border motion-reduce:text-muted-foreground",
        "forced-colors:animate-none forced-colors:bg-none forced-colors:bg-clip-border forced-colors:text-muted-foreground",
        className,
      )}
    >
      {children}
    </span>
  );
}
