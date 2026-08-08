import { cn } from "../lib/utils.js";

export type LiveRunBannerProps = {
  readonly awaiting?: boolean;
  readonly message?: string;
  readonly elapsed?: string;
  readonly className?: string;
};

/**
 * The one-line status strip above a live run's steps: awaiting gets the
 * accent tone that marks "this needs you" everywhere else in the registry,
 * running gets the info tone. Standalone from `LiveRunInspector` so a
 * consumer building its own run surface can reuse just this strip.
 */
export function LiveRunBanner({ awaiting = false, message, elapsed, className }: LiveRunBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs",
        awaiting ? "border-primary-emphasis/35 bg-primary/10 text-primary-emphasis" : "border-accent bg-accent text-accent-foreground",
        className,
      )}
    >
      <span className="font-semibold">{message ?? (awaiting ? "Paused for your input" : "Running")}</span>
      {elapsed === undefined ? null : <span className="font-mono text-[11.5px] tabular-nums opacity-90">{elapsed}</span>}
    </div>
  );
}
