import { useEffect, useState } from "react";
import type * as React from "react";

import { cn } from "../lib/utils.js";

export type SidebarItemRowProps = {
  readonly name: React.ReactNode;
  /** An icon, an avatar, a status dot — whatever leads the row. */
  readonly leading?: React.ReactNode;
  /** A badge, a status dot, a timestamp — right-aligned, always visible. */
  readonly meta?: React.ReactNode;
  /** A menu trigger or icon button, revealed on hover/focus only. */
  readonly action?: React.ReactNode;
  readonly unread?: boolean;
  readonly selected?: boolean;
  /**
   * Set right before removing the row from its list, and keep it mounted for
   * one more frame (~150ms) so `corbits-row-out` gets to play. `use-sidebar-
   * panel` does not manage this — list membership is the consumer's data,
   * not the panel's.
   */
  readonly leaving?: boolean;
  readonly onSelect?: () => void;
  readonly className?: string;
};

/**
 * The live-updating row: a channel, a thread, a running workflow. Motion is a
 * CSS transition on `transform`/`opacity` driven by a `data-state` of
 * `entering` | `visible` | `leaving`, not an enter/exit keyframe pair — a
 * keyframe animation restarts from its `from` value every time it is
 * retriggered, so a row that gets un-marked `leaving` mid-exit (the live-
 * activity list does this) would snap instead of reversing. A transition has
 * no such restart: toggling the state class mid-flight just continues from
 * wherever the interrupted transition already got to.
 *
 * `unread` is weight only: the name goes semibold. `meta` carries whatever
 * the caller wants rendered — a `Badge`, a `StatusDot`, a timestamp — with no
 * shape enforced by this component; callers who need the unread state to
 * survive colour-blindness and grayscale screenshots should pass a `meta`
 * that is not colour-only (a `StatusDot`, a count), not rely on this
 * component to supply one.
 */
export function SidebarItemRow({
  name,
  leading,
  meta,
  action,
  unread = false,
  selected = false,
  leaving = false,
  onSelect,
  className,
}: SidebarItemRowProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const state = !mounted ? "entering" : leaving ? "leaving" : "visible";

  return (
    <li
      data-slot="sidebar-item-row"
      data-state={state}
      className={cn(
        "group/row transition-[transform,opacity] duration-150 ease-out",
        state === "entering" && "-translate-y-1 opacity-0",
        state === "leaving" && "pointer-events-none translate-y-1 opacity-0",
        state === "visible" && "translate-y-0 opacity-100",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full items-center gap-2 rounded-md pr-1.5 text-sm transition-colors",
          selected ? "bg-primary/10 text-primary-emphasis" : "text-foreground hover:bg-muted",
        )}
      >
        {/* The whole row's identity and selection live on this one button; the
            hover action is a sibling, not a child, so two interactive elements
            never nest inside each other. */}
        <button
          type="button"
          aria-current={selected ? "true" : undefined}
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pl-2 text-left active:brightness-95"
        >
          {leading === undefined ? null : (
            <span className="grid size-5 shrink-0 place-items-center [&_svg]:size-4" aria-hidden>
              {leading}
            </span>
          )}
          <span className={cn("min-w-0 flex-1 truncate", unread && "font-semibold")}>{name}</span>
          {meta === undefined ? null : <span className="flex shrink-0 items-center gap-1.5">{meta}</span>}
        </button>
        {action === undefined ? null : (
          <span className="shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100">
            {action}
          </span>
        )}
      </div>
    </li>
  );
}
