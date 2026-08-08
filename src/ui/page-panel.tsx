import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type PagePanelProps = {
  readonly children: ReactNode;
  /**
   * When true the inner panel scrolls vertically; when false it clips overflow
   * and leaves scrolling to its own children (e.g. a header + scroll body).
   */
  readonly scroll?: boolean;
  /** Drop the panel's shadow — some surfaces render flatter. */
  readonly flat?: boolean;
  /**
   * Size the panel to its content instead of filling the viewport. Short pages
   * then leave no dead band below their last section. The framing border is
   * dropped in this mode so a content-height panel has no floating edge where
   * it stops — it blends into the identical fill below it. Still capped at the
   * viewport, so overflowing content scrolls as normal.
   */
  readonly fitContent?: boolean;
  /**
   * Fill token for the outer bleed and the panel itself. `background` (the
   * default) is for top-level routes hosted directly under the app shell; pass
   * `card` when the panel is nested inside a surface that already supplies its
   * own ground, so the panel blends in instead of reading as a stray card.
   */
  readonly surface?: "background" | "card";
  readonly className?: string;
};

/**
 * The standard page-content frame: a full-height outer fill plus a bordered
 * panel that owns the page's vertical scroll. Shared by the top-level pages so
 * margins, border and background are decided once instead of per page.
 *
 * It is not `PageShell` — that caps and centres a measure of content — and not
 * `Card`, which is a surface within a page. This is the boundary between the
 * app shell and whatever the route renders.
 */
export function PagePanel({
  children,
  scroll = true,
  flat = false,
  fitContent = false,
  surface = "background",
  className,
}: PagePanelProps) {
  const sizing = fitContent ? "w-full max-h-full self-start" : "flex-1 border border-border";
  const overflow = scroll ? (fitContent ? "overflow-y-auto" : "min-h-full overflow-y-auto") : "overflow-hidden";
  const fill = surface === "card" ? "bg-card" : "bg-background";
  return (
    <div className={cn("flex h-full overflow-hidden", fill)}>
      <section
        data-slot="page-panel"
        className={cn("flex flex-col", fill, sizing, overflow, !flat && "shadow-sm", className)}
      >
        {children}
      </section>
    </div>
  );
}
