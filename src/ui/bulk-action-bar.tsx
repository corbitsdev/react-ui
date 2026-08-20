import { useEffect } from "react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type BulkActionBarProps = {
  readonly count: number;
  readonly onClear: () => void;
  /** Action buttons, rendered after the "N selected" label — typically `Button`s. */
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * The floating pill that appears once a list has a selection: sticky to the
 * bottom of its positioning context, riding in with a small rise so it
 * reads as newly arrived rather than always having been there. Renders
 * nothing while `count` is 0 — the caller does not need to guard the render
 * site itself.
 *
 * Escape clears the selection from anywhere on the page while the bar is
 * showing, not only while it has focus — the bar is a global consequence of
 * list state, not a dialog the user has stepped into, so it listens on
 * `window` rather than requiring focus to land on it first.
 */
export function BulkActionBar({ count, onClear, children, className }: BulkActionBarProps) {
  useEffect(() => {
    if (count === 0) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClear();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [count, onClear]);

  if (count === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className={cn(
        "fixed bottom-6 left-1/2 z-40 flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg",
        "motion-safe:[animation:corbits-bulk-action-bar-in_220ms_var(--ease-out)_both]",
        className,
      )}
    >
      <span className="text-sm font-medium whitespace-nowrap">
        {count} selected
      </span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
