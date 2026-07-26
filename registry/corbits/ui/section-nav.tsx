import { cn } from "@/registry/corbits/lib/utils";

export type SectionNavItem = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  /**
   * An in-page anchor rather than a route. Marked `aria-current="location"`
   * instead of `"page"` when active — the user has not navigated anywhere, they
   * have scrolled, and the two are different facts.
   */
  readonly anchor?: boolean;
};

export type SectionNavGroup = {
  readonly heading?: string;
  readonly items: readonly SectionNavItem[];
};

export type SectionNavProps = {
  /** Names the nav. Required — a settings page may hold more than one. */
  readonly label: string;
  readonly groups: readonly SectionNavGroup[];
  readonly activeId: string | null;
  readonly className?: string;
};

/**
 * The in-page rail for a sectioned area: settings, a library, a long
 * configuration page.
 *
 * Not the `Sidebar` parts, and the difference is the container. `Sidebar` is
 * the app's chrome — a fixed-width `<aside>` with a collapsed icon-only mode
 * and its own surface. This lives inside the page content, scrolls
 * horizontally when the viewport is narrow instead of collapsing, and has no
 * surface of its own. Sharing one component would mean a `variant` prop that
 * switches nearly every class, which is two components wearing one name.
 *
 * A group the viewer may not use should be left out of `groups` entirely
 * rather than passed and rendered disabled. A greyed row advertises something
 * the user cannot have and invites them to go looking for why.
 */
export function SectionNav({ label, groups, activeId, className }: SectionNavProps) {
  return (
    <nav aria-label={label} className={cn("flex flex-col gap-1", className)}>
      {groups.map((group, index) => (
        <div
          key={group.heading ?? `group-${index}`}
          className={cn("flex flex-col gap-1", index > 0 && "mt-2 border-t border-border pt-2")}
        >
          {group.heading === undefined ? null : (
            <p className="px-3 pt-1 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {group.heading}
            </p>
          )}
          {/* Horizontal strip on narrow screens, column from lg. A settings
              rail that stacks into a tall list pushes the content it navigates
              off the first screen entirely. */}
          <div className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {group.items.map((item) => {
              const active = item.id === activeId;
              return (
                <a
                  key={item.id}
                  href={item.href}
                  aria-current={active ? (item.anchor === true ? "location" : "page") : undefined}
                  className={cn(
                    "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary-emphasis"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/**
 * A sectioned area: the rail beside the content, stacking on narrow screens.
 *
 * The rail sticks on wide viewports so it stays reachable down a long settings
 * page, and does not on narrow ones, where a sticky element would eat a third
 * of the screen.
 */
export function SectionNavLayout({
  nav,
  children,
  className,
}: {
  nav: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-8 lg:flex-row lg:gap-8", className)}>
      <div className="lg:sticky lg:top-4 lg:w-56 lg:shrink-0 lg:self-start">{nav}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-6">{children}</div>
    </div>
  );
}
