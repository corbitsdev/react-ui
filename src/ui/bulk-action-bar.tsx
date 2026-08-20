import { useEffect } from "react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type BulkActionBarProps = {
  readonly count: number;
  readonly onClear: () => void;
  /** Action buttons, rendered after the "N selected" label — typically `Button`s. */
  readonly children: ReactNode;
  /** Overrides the default `"Bulk actions"` accessible name outright — for a consumer localizing this published library's one hardcoded English string. */
  readonly label?: string;
  readonly className?: string;
};

/**
 * The floating pill that appears once a list has a selection: fixed to the
 * bottom of the viewport (or the nearest ancestor that establishes its own
 * containing block — a `transform`, `filter`, or similar CSS property on an
 * ancestor changes what `fixed` positions against), riding in with a small
 * rise so it reads as newly arrived rather than always having been there.
 * Renders nothing while `count` is 0 — the caller does not need to guard
 * the render site itself.
 *
 * The horizontal centering (`left-1/2` plus a permanent `-translate-x-1/2`)
 * is not part of the entrance animation and is never gated by
 * `motion-safe:` — a `prefers-reduced-motion` viewer gets no animation at
 * all, and if the centering correction lived only in the animation's own
 * `transform`, that viewer would see the bar pinned at the horizontal
 * midpoint with its left edge running off-viewport. The animation itself
 * only touches `opacity`/`translateY`, on an inner element, so it never
 * overwrites the outer element's static centering transform.
 *
 * Escape clears the selection from anywhere on the page while the bar is
 * showing, not only while it has focus — the bar is a global consequence of
 * list state, not a dialog the user has stepped into, so it listens on
 * `window` rather than requiring focus to land on it first. It defers to
 * `event.defaultPrevented`, so a dialog or input stacked above the bar that
 * already handled its own Escape wins instead of also clearing the
 * selection underneath it.
 */
export function BulkActionBar({ count, onClear, children, label = "Bulk actions", className }: BulkActionBarProps) {
  useEffect(() => {
    if (count === 0) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) onClear();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [count, onClear]);

  if (count === 0) return null;

  return (
    <div className={cn("fixed bottom-6 left-1/2 z-40 -translate-x-1/2", className)}>
      <div
        role="group"
        aria-label={label}
        className={cn(
          "flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2 shadow-lg",
          "motion-safe:[animation:corbits-bulk-action-bar-in_220ms_var(--ease-out)_both]",
        )}
      >
        <span aria-live="polite" className="text-sm font-medium whitespace-nowrap">
          {count} selected
        </span>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}
