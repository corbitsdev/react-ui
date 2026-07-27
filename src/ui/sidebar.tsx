import { Slot } from "@radix-ui/react-slot";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils.js";

/**
 * The app rail. Composable parts rather than one `items={...}` component: a
 * consumer owns this file after `shadcn add`, and nav shape (sections, counts,
 * a tenant switcher, an environment badge) differs per app. Every part is a
 * slot — `SidebarHeader` is where an environment badge goes, `SidebarFooter` is
 * where a tenant selector goes — and nothing here fetches anything.
 *
 * Collapse is a prop, not internal state or a context: the host already owns
 * that bit (it persists it, and the top bar's menu button toggles it). The root
 * publishes it as `data-collapsed` and the children style off
 * `group-data-[collapsed=true]/sidebar:` — so a new part added later collapses
 * correctly with no wiring.
 *
 * Collapsing hides labels with `sr-only`, never `hidden`: the icon-only rail
 * must keep its accessible names or it is unusable with a screen reader.
 */
export function Sidebar({
  collapsed = false,
  className,
  ...props
}: React.ComponentProps<"aside"> & { collapsed?: boolean }) {
  return (
    <aside
      data-slot="sidebar"
      data-collapsed={collapsed}
      className={cn(
        "group/sidebar flex h-full shrink-0 flex-col border-r border-border bg-card text-card-foreground",
        "w-60 transition-[width] duration-200 data-[collapsed=true]:w-14",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      className={cn("flex min-h-14 items-center gap-2 border-b border-border px-3", className)}
      {...props}
    />
  );
}

export function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-content" className={cn("min-h-0 flex-1 overflow-y-auto py-2", className)} {...props} />
  );
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sidebar-footer" className={cn("border-t border-border p-2", className)} {...props} />
  );
}

/** One nav section. `label` is required — an unlabelled group is invisible to AT. */
export function SidebarSection({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<"nav"> & { label: string }) {
  return (
    <nav data-slot="sidebar-section" aria-label={label} className={cn("px-2 py-1", className)} {...props}>
      <p className="px-2 py-1 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase group-data-[collapsed=true]/sidebar:sr-only">
        {label}
      </p>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </nav>
  );
}

export type SidebarItemProps = React.ComponentProps<"a"> & {
  /** Renders the current route. Sets `aria-current="page"`, not just a colour. */
  active?: boolean;
  /** Leading icon. Kept visible when collapsed — it is the whole control then. */
  icon?: React.ReactNode;
  /** Unread / pending count. Part of the accessible name, so it survives collapse. */
  count?: number;
  /** Renders the child element instead of an `<a>` — for a router's Link. */
  asChild?: boolean;
};

export function SidebarItem({
  active = false,
  icon,
  count,
  asChild = false,
  className,
  children,
  ...props
}: SidebarItemProps) {
  const Comp = asChild ? Slot : "a";
  return (
    <li>
      <Comp
        data-slot="sidebar-item"
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors",
          "group-data-[collapsed=true]/sidebar:justify-center",
          active
            ? "bg-primary/10 font-medium text-primary-emphasis"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          className,
        )}
        {...props}
      >
        {icon === undefined ? null : (
          <span className="grid size-4 shrink-0 place-items-center [&_svg]:size-4" aria-hidden>
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate group-data-[collapsed=true]/sidebar:sr-only">{children}</span>
        {count === undefined ? null : (
          <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground group-data-[collapsed=true]/sidebar:sr-only">
            {count}
          </span>
        )}
      </Comp>
    </li>
  );
}

/**
 * Collapse control. `aria-expanded` describes the rail it controls, so pass the
 * rail's id in `aria-controls` when the button lives outside the `<aside>`.
 */
export function SidebarCollapseToggle({
  collapsed,
  onToggle,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "onToggle"> & { collapsed: boolean; onToggle: () => void }) {
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  return (
    <button
      type="button"
      data-slot="sidebar-collapse-toggle"
      aria-expanded={!collapsed}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      onClick={onToggle}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
