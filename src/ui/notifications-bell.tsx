import { Bell } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";

export type NotificationsBellProps = {
  /** Unread count. `0` renders the bell with no marker. */
  readonly count: number;
  /** Panel contents — a notification list, an empty state, whatever the host has. */
  readonly children: ReactNode;
  /** Counts above this render as "N+" so the marker cannot grow unbounded. */
  readonly maxCount?: number;
  readonly className?: string;
};

/**
 * Bell + count, with the panel body as a slot. It renders a count and opens a
 * panel; it does not know what a notification is, does not fetch, and does not
 * mark anything read — the host puts a list in `children` and handles the rest.
 *
 * The panel is a `dialog`-role popup rather than a menu: its contents are
 * arbitrary (links, buttons, an empty state), and a menu role would promise
 * arrow-key semantics that a free-form list does not have. Escape closes and
 * returns focus to the bell; a pointer-down outside closes without stealing
 * focus back, so clicking straight into another control still works.
 */
export function NotificationsBell({ count, children, maxCount = 99, className }: NotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const label = count === 0 ? "Notifications" : `Notifications, ${count} unread`;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="relative grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-4" aria-hidden />
        {count > 0 ? (
          <span
            aria-hidden
            className="absolute top-1 right-1 min-w-4 rounded-full bg-primary px-1 text-center font-mono text-[10px] leading-4 text-primary-foreground"
          >
            {count > maxCount ? `${maxCount}+` : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={label}
          tabIndex={-1}
          className="absolute top-full right-0 z-50 mt-1 max-h-96 w-80 overflow-y-auto rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-lg"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
