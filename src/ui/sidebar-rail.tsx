import { useId } from "react";
import type * as React from "react";

import { cn } from "../lib/utils.js";

export type SidebarRailItem = {
  readonly id: string;
  /** The accessible name and the tooltip text — one string, not two. */
  readonly label: string;
  readonly icon: React.ReactNode;
  /** An unread dot or count. Rendered small and off to the icon's corner. */
  readonly badge?: React.ReactNode;
};

export type SidebarRailProps = {
  readonly items: readonly SidebarRailItem[];
  readonly activeId: string;
  readonly onSelect: (id: string) => void;
  /** Bench switcher, identity avatar — whatever sits below the page icons. */
  readonly footer?: React.ReactNode;
  /** Names the rail's nav landmark. Defaults to "Pages". */
  readonly label?: string;
  readonly className?: string;
};

/**
 * The first column: which top-level page you are on. 56px wide, icon-only —
 * the label never renders as text here, only as the accessible name and the
 * hover/focus tooltip, so the rail stays this narrow at any zoom level.
 *
 * Each button is a real `<button>` in document order, so Tab and arrow-free
 * keyboard navigation both work with no roving-tabindex machinery. The
 * tooltip is pure CSS (`group-hover`/`group-focus-within`) tied to the
 * button by `aria-describedby`, so it never depends on JS having run.
 */
export function SidebarRail({ items, activeId, onSelect, footer, label = "Pages", className }: SidebarRailProps) {
  const railId = useId();

  return (
    <nav
      data-slot="sidebar-rail"
      aria-label={label}
      className={cn("flex h-full w-14 shrink-0 flex-col items-center border-r border-border bg-card py-2", className)}
    >
      <ul className="flex w-full flex-col items-center gap-1">
        {items.map((item) => {
          const active = item.id === activeId;
          const tooltipId = `${railId}-${item.id}-tooltip`;
          return (
            <li key={item.id} className="group relative w-full">
              <button
                type="button"
                data-slot="sidebar-rail-item"
                aria-current={active ? "page" : undefined}
                aria-describedby={tooltipId}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "relative mx-auto flex size-10 items-center justify-center rounded-md transition-colors active:brightness-95",
                  "[&_svg]:size-5 [&_svg]:shrink-0",
                  active
                    ? "bg-primary/10 text-primary-emphasis"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {item.icon}
                {item.badge === undefined ? null : (
                  <span className="absolute top-1 right-1.5">{item.badge}</span>
                )}
              </button>
              <span
                id={tooltipId}
                role="tooltip"
                className={cn(
                  "pointer-events-none absolute top-1/2 left-full z-50 ml-2 -translate-y-1/2 rounded-md border border-border",
                  "bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-lg transition-opacity",
                  "group-hover:opacity-100 group-focus-within:opacity-100",
                )}
              >
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>

      {footer === undefined ? null : <div className="mt-auto flex w-full flex-col items-center gap-1">{footer}</div>}
    </nav>
  );
}
