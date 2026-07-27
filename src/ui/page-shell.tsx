import type * as React from "react";

import { cn } from "../lib/utils.js";

export type PageShellProps = React.ComponentProps<"div"> & {
  /**
   * The shell owns the vertical scroll. Turn it off when the page has its own
   * scrolling body under a sticky header — two nested scroll containers is how
   * a header ends up scrolling away with the content under it.
   */
  readonly scroll?: boolean;
  /** Caps and centres the content. Omit for full-bleed pages like a dashboard. */
  readonly width?: "prose" | "wide" | "full";
};

const WIDTH_CLASS = {
  prose: "mx-auto w-full max-w-3xl",
  wide: "mx-auto w-full max-w-5xl",
  full: "w-full",
} as const;

/**
 * The frame a top-level page sits in: full height, one scroll container, and a
 * consistent measure.
 *
 * It exists so margins, max-width and scroll ownership are decided once instead
 * of by whichever page was written most recently. It is not `Section` — that is
 * a titled block *within* a page — and it is not `Card`, which is a surface.
 * This is the page's outer boundary and it deliberately draws nothing.
 */
export function PageShell({ scroll = true, width = "wide", className, children, ...props }: PageShellProps) {
  return (
    <div
      data-slot="page-shell"
      className={cn("flex h-full flex-col", scroll ? "overflow-y-auto" : "overflow-hidden", className)}
      {...props}
    >
      <div className={cn("flex min-h-0 flex-1 flex-col gap-6 px-4 py-6", WIDTH_CLASS[width])}>{children}</div>
    </div>
  );
}
