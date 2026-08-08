import type * as React from "react";

import { cn } from "../lib/utils.js";

/**
 * The second column's shell. Composable parts, like `ui/sidebar` — a consumer
 * assembles `SidebarPanelHeader`, `SidebarPanelPins`, `SidebarPanelBody` and
 * `SidebarPanelFooter` in whatever combination the active page calls for, and
 * the root only supplies the width, the border and the flex column.
 */
export function SidebarPanel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-panel"
      className={cn("flex h-full w-72 shrink-0 flex-col border-r border-border bg-card text-card-foreground", className)}
      {...props}
    />
  );
}

export type SidebarPanelHeaderProps = React.ComponentProps<"div"> & {
  readonly title: React.ReactNode;
  /** A single trailing control — "New channel", a filter, a settings icon. */
  readonly action?: React.ReactNode;
};

/** Not `ui/sidebar`'s `SidebarHeader` — that's the single-column family's header slot. */
export function SidebarPanelHeader({ title, action, className, ...props }: SidebarPanelHeaderProps) {
  return (
    <div
      data-slot="sidebar-panel-header"
      className={cn("flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-border px-3", className)}
      {...props}
    >
      <h2 className="min-w-0 truncate text-sm font-semibold">{title}</h2>
      {action === undefined ? null : <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Global pins live above the per-page sections and never scroll away with
 * them — that is the entire reason this is a separate slot rather than just
 * the first `SidebarPanelSection` inside the body.
 */
export function SidebarPanelPins({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-panel-pins" className={cn("shrink-0 border-b border-border px-2 py-2", className)} {...props} />;
}

/** The scrollable region: sections go here. Everything above and below it is pinned. */
export function SidebarPanelBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-panel-body" className={cn("min-h-0 flex-1 overflow-y-auto py-1", className)} {...props} />;
}

/** Not `ui/sidebar`'s `SidebarFooter` — that's the single-column family's footer slot. */
export function SidebarPanelFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-panel-footer" className={cn("shrink-0 border-t border-border p-2", className)} {...props} />;
}
