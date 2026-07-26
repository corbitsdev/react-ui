import type { ReactNode } from "react";

import { cn } from "@/registry/corbits/lib/utils";
import { Skeleton } from "@/registry/corbits/ui/skeleton";

export type DashboardProps = {
  readonly title: string;
  readonly description?: string;
  /** Page-level actions — export, refresh. Sits beside the title. */
  readonly actions?: ReactNode;
  /**
   * Controls that apply to every panel below: a `TimeRangeControl`, a
   * `FilterBar`. They live above the tabs, not inside a panel, because the
   * window a dashboard is looking at should survive switching between views of
   * it — a time range that resets when you change tab is a time range you set
   * five times.
   */
  readonly controls?: ReactNode;
  /** The tab set, when there is one — usually a `<Tabs>`. */
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * The frame a dashboard's panels hang off: a header that names the view, one
 * band of controls that govern all of it, and the body.
 *
 * It draws almost nothing, on purpose. What it actually contributes is the
 * *arrangement* — title, then scope, then content — and the guarantee that
 * scope is declared once above everything it scopes. Dashboards that grow
 * per-panel date pickers end up showing four panels of four different weeks
 * beside each other, which is worse than showing nothing.
 *
 * The body is a slot rather than a tabs prop. A dashboard with one view has no
 * business rendering a one-tab tablist, and one with five composes `<Tabs>`
 * here — the shell should not care which.
 */
export function Dashboard({ title, description, actions, controls, children, className }: DashboardProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <header className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {description === undefined ? null : (
              <p className="text-sm leading-snug text-muted-foreground">{description}</p>
            )}
          </div>
          {actions === undefined ? null : <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
        {controls === undefined ? null : controls}
      </header>
      {children}
    </div>
  );
}

/**
 * The dashboard's loading state, shaped like the dashboard.
 *
 * A skeleton whose geometry does not match what replaces it is worse than a
 * spinner: the page settles, then jumps, and the reader loses whatever they had
 * started reading. So this mirrors the real arrangement — a KPI row of tiles
 * over a two-up panel grid — rather than being a generic stack of bars.
 *
 * The `role="status"` line is the whole accessibility story here. `Skeleton` is
 * `aria-hidden` by design, so without this a screen reader is told nothing at
 * all while the page loads.
 */
export function DashboardSkeleton({ className }: { readonly className?: string }) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <p role="status" className="text-sm text-muted-foreground">
        Loading…
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-56" />
        ))}
      </div>
    </div>
  );
}
