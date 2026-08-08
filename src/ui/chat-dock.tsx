import { MessageCircle } from "lucide-react";
import { useEffect, useState, type MutableRefObject, type ReactNode, type RefObject } from "react";

import type { ChatDockMode } from "../hooks/use-chat-dock.js";
import { useFlipTransition } from "../hooks/use-flip-transition.js";
import { useFocusTrap } from "../hooks/use-focus-trap.js";
import { cn } from "../lib/utils.js";
import { CHAT_DOCK_ENTRANCE_MS, CHAT_DOCK_SCRIM_MS } from "./chat-dock-timing.js";

/** Only `fullpage` covers the whole viewport and demands modal behavior — `docked` is a corner panel the rest of the page stays usable behind. */
function isModal(mode: ChatDockMode): boolean {
  return mode === "fullpage";
}

/** Caps the badge at "9+" rather than growing unboundedly wide on a fixed-size FAB. */
function formatUnreadCount(unreadCount: number): string {
  return unreadCount > 9 ? "9+" : String(unreadCount);
}

function mergeRefs<T>(...refs: ReadonlyArray<RefObject<T | null>>): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) (ref as MutableRefObject<T | null>).current = node;
  };
}

/** `docked` and `fullpage` are the only two modes that morph into each other; `closed` plays its own entrance/exit animation instead. */
function flipKey(mode: ChatDockMode): string | null {
  return mode === "closed" ? null : mode;
}

/**
 * Locks the page's own scroll while `locked` is true, restoring whatever
 * `overflow` it had on unmount — `fullpage` covers the viewport, so a
 * background scroll underneath it would move content the reader can't see.
 */
function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
}

/**
 * The dim-and-blur backdrop behind an open dock. Rendered only for
 * `fullpage` — that is the one mode that covers the viewport and is modal;
 * `docked` is a non-modal corner panel and must leave the rest of the page
 * fully interactive, so it gets no scrim. Clicking the scrim closes the
 * dock, same as Escape.
 */
export function ChatDockScrim({ mode, onClose, className }: { mode: ChatDockMode; onClose: () => void; className?: string }) {
  if (!isModal(mode)) return null;
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close chat"
      style={{ animationDuration: `${CHAT_DOCK_SCRIM_MS}ms` }}
      className={cn(
        "fixed inset-0 z-40 cursor-default bg-foreground/20 backdrop-blur-[2px] [animation-name:corbits-fade-in] [animation-timing-function:var(--ease-out)] [animation-fill-mode:both]",
        className,
      )}
    />
  );
}

/**
 * The closed-state pill. Rendered *inside* `ChatDock` while `mode === "closed"`
 * — the pill and the panel share the one dock element, so opening the dock is
 * a class change on that element, not a swap between two fixed-position nodes.
 *
 * The pop-in plays once, tracked with a mount flag rather than left as a
 * static animation class: a class that's always present can be retriggered
 * by unrelated DOM churn, where a flag that flips once after mount cannot.
 */
export function ChatDockFab({
  onOpen,
  label = "Ask",
  unreadCount = 0,
  className,
}: {
  onOpen: () => void;
  label?: string;
  /** Unread message count to surface on the launcher. Non-positive values render no badge. */
  unreadCount?: number;
  className?: string;
}) {
  const [playEntrance, setPlayEntrance] = useState(true);
  const hasUnread = unreadCount > 0;

  useEffect(() => {
    const timer = window.setTimeout(() => setPlayEntrance(false), CHAT_DOCK_ENTRANCE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={false}
      aria-label={hasUnread ? `Open chat, ${unreadCount} unread` : "Open chat"}
      className={cn(
        "relative inline-flex h-full w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg transition-colors hover:bg-primary-active",
        playEntrance && "[animation:corbits-fab-in_280ms_var(--ease-out)_both]",
        className,
      )}
    >
      <MessageCircle className="size-4" aria-hidden />
      {label}
      {hasUnread ? (
        <span
          data-slot="chat-dock-fab-badge"
          aria-hidden="true"
          className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-popover bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
        >
          {formatUnreadCount(unreadCount)}
        </span>
      ) : null}
    </button>
  );
}

const MODE_CLASS: Record<ChatDockMode, string> = {
  closed: "pointer-events-none right-6 bottom-6 h-14 w-14 rounded-full opacity-0",
  docked:
    "pointer-events-auto top-3 right-3 bottom-3 left-auto h-auto w-[min(520px,50vw)] max-w-[calc(100vw-24px)] rounded-2xl opacity-100",
  fullpage: "pointer-events-auto inset-3 h-auto w-auto rounded-2xl opacity-100",
};

export type ChatDockProps = {
  readonly mode: ChatDockMode;
  readonly children: ReactNode;
  /** Plays the pop-in entrance for this render — pass `useChatDock().shouldAnimateEntrance`. Never true for a `docked <-> fullpage` resize. */
  readonly shouldAnimateEntrance?: boolean;
  readonly className?: string;
};

/**
 * The dock's own persistent element: `closed`, `docked` and `fullpage` are
 * three sets of classes on this *one* fixed-position container, never three
 * components — `closed` is the one mode whose content (the FAB) is a
 * genuinely different child, but the container itself never remounts.
 *
 * Mode changes jump straight to their new `inset`/`width`/`height` — nothing
 * here transitions a layout property. A fixed element sized against the
 * viewport is exactly the case where animating `inset`/`width`/`height`
 * forces a layout recalculation on every frame; `useFlipTransition` measures
 * the box before and after the jump and animates only `transform` (plus
 * `opacity` for the closed states) to make `docked ↔ fullpage` read as one
 * panel growing, at zero layout cost.
 *
 * `prefers-reduced-motion` is handled once, globally, in `theme.css` — every
 * transition and animation on this element collapses to a single frame there,
 * so this piece carries no reduced-motion logic of its own.
 *
 * Modality differs by mode, deliberately: `fullpage` covers the viewport and
 * behaves like a dialog — `aria-modal`, a focus trap, the page's own scroll
 * locked. `docked` is a corner panel the reader can leave open while working
 * elsewhere on the page, so it stays non-modal — `role="complementary"`, no
 * `aria-modal`, no focus trap, no scroll lock, and nothing about the rest of
 * the page is disabled or made inert. Escape still steps `fullpage` down to
 * `docked` and `docked` down to `closed` in both cases (see `useChatDock`).
 */
export function ChatDock({ mode, children, shouldAnimateEntrance = false, className }: ChatDockProps) {
  const isOpen = mode !== "closed";
  const modal = isModal(mode);
  const trapRef = useFocusTrap<HTMLDivElement>(modal);
  const flipRef = useFlipTransition<HTMLDivElement>(flipKey(mode));
  useBodyScrollLock(modal);

  return (
    <div
      ref={mergeRefs(trapRef, flipRef)}
      data-slot="chat-dock"
      data-mode={mode}
      role={modal ? "dialog" : "complementary"}
      aria-label="Chat"
      aria-modal={modal ? "true" : undefined}
      aria-hidden={mode === "closed"}
      tabIndex={-1}
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden border border-border bg-popover text-popover-foreground shadow-xl transition-opacity duration-300 ease-[var(--ease-out)]",
        MODE_CLASS[mode],
        isOpen && shouldAnimateEntrance && "[animation:corbits-dock-in_280ms_var(--ease-out)_both]",
        className,
      )}
    >
      {children}
    </div>
  );
}
