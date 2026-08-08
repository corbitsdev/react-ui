import { ChevronRight, Plus } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils.js";

export type SidebarPanelSectionProps = {
  readonly label: string;
  readonly children: React.ReactNode;
  /** Shows a trailing "+" affordance — "Add channel", "New view". */
  readonly onAdd?: () => void;
  /** Text under `aria-label` on the add control. Defaults to `Add ${label}`. */
  readonly addLabel?: string;
  /** Omit to render an always-open section with no disclosure control. */
  readonly collapsed?: boolean;
  readonly onToggleCollapse?: () => void;
  readonly className?: string;
};

/**
 * One labelled group inside `SidebarPanelBody` — "Channels", "Direct
 * messages", "Recent runs". The label is the house micro-label scale
 * (11px, uppercase, wide tracking), matching `ui/sidebar`'s `SidebarSection`
 * so the two rails read as the same design language even though they never
 * share a component.
 *
 * Collapse is a prop, not internal state: `use-sidebar-panel` is the thing
 * that remembers which sections are open, so two sections never end up
 * disagreeing with each other's idea of "collapsed" after a re-render.
 */
export function SidebarPanelSection({
  label,
  children,
  onAdd,
  addLabel,
  collapsed = false,
  onToggleCollapse,
  className,
}: SidebarPanelSectionProps) {
  const labelId = `${label.toLowerCase().replace(/\s+/g, "-")}-section-label`;

  return (
    <div data-slot="sidebar-panel-section" className={cn("px-2 py-1.5", className)}>
      <div className="flex items-center justify-between gap-1 px-1">
        {onToggleCollapse === undefined ? (
          <p id={labelId} className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {label}
          </p>
        ) : (
          <button
            type="button"
            id={labelId}
            aria-expanded={!collapsed}
            onClick={onToggleCollapse}
            className="flex items-center gap-1 rounded-sm text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground"
          >
            <ChevronRight
              aria-hidden
              className={cn("size-3 shrink-0 transition-transform", !collapsed && "rotate-90")}
            />
            {label}
          </button>
        )}

        {onAdd === undefined ? null : (
          <button
            type="button"
            aria-label={addLabel ?? `Add ${label}`}
            onClick={onAdd}
            className="grid size-5 shrink-0 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus aria-hidden className="size-3.5" />
          </button>
        )}
      </div>

      {collapsed ? null : (
        <ul aria-labelledby={labelId} className="flex flex-col gap-0.5 pt-0.5">
          {children}
        </ul>
      )}
    </div>
  );
}
