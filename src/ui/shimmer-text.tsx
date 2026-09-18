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
 * contrast gate never sees it as a text/background pair. The theme's base
 * layer collapses `prefers-reduced-motion` to a single frame, which leaves
 * this at a flat `--muted-foreground` reading rather than mid-sweep.
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
        className,
      )}
    >
      {children}
    </span>
  );
}
