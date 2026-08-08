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
 * The live-updating row: a channel, a thread, a running workflow. Mounting
 * plays `corbits-row-in` for free — no timer, no state, the animation just
 * runs on the frame the element appears, which is why a freshly-arrived row
 * at the top of a list reads as *arriving* rather than popping into place.
 *
 * `unread` is weight and a dot, never colour alone: the name goes semibold
 * and a `StatusDot`-shaped marker is expected in `meta`, which is how the
 * state survives colour-blindness and grayscale screenshots alike.
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
  return (
    <li
      data-slot="sidebar-item-row"
      className={cn(
        "group/row",
        leaving
          ? "pointer-events-none animate-[corbits-row-out_150ms_ease-in]"
          : "animate-[corbits-row-in_180ms_ease-out]",
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
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pl-2 text-left"
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
