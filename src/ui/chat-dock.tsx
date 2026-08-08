import { MessageCircle } from "lucide-react";
import { useEffect, useState, type MutableRefObject, type ReactNode, type RefObject } from "react";

import type { ChatDockMode } from "../hooks/use-chat-dock.js";
import { useFlipTransition } from "../hooks/use-flip-transition.js";
import { useFocusTrap } from "../hooks/use-focus-trap.js";
import { cn } from "../lib/utils.js";
import { CHAT_DOCK_ENTRANCE_MS, CHAT_DOCK_SCRIM_MS } from "./chat-dock-timing.js";

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
 * The dim-and-blur backdrop behind an open dock. Present in both `docked` and
 * `fullpage` — a docked panel still wants the rest of the page to read as
 * "behind" it — clicking it closes the dock, same as Escape.
 */
export function ChatDockScrim({ open, onClose, className }: { open: boolean; onClose: () => void; className?: string }) {
  if (!open) return null;
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
export function ChatDockFab({ onOpen, label = "Ask", className }: { onOpen: () => void; label?: string; className?: string }) {
  const [playEntrance, setPlayEntrance] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setPlayEntrance(false), CHAT_DOCK_ENTRANCE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={false}
      aria-label="Open chat"
      className={cn(
        "inline-flex h-full w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg transition-colors hover:bg-primary-active",
        playEntrance && "[animation:corbits-fab-in_280ms_var(--ease-out)_both]",
        className,
      )}
    >
      <MessageCircle className="size-4" aria-hidden />
      {label}
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
 * Dialog semantics apply in both open modes: `aria-modal` plus a focus trap
 * while open, focus restored to whatever had it on close, and the page's own
 * scroll locked while `fullpage` — `docked` deliberately leaves the page
 * scrollable, since it never covers the whole viewport.
 */
export function ChatDock({ mode, children, shouldAnimateEntrance = false, className }: ChatDockProps) {
  const isOpen = mode !== "closed";
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);
  const flipRef = useFlipTransition<HTMLDivElement>(flipKey(mode));
  useBodyScrollLock(mode === "fullpage");

  return (
    <div
      ref={mergeRefs(trapRef, flipRef)}
      data-slot="chat-dock"
      data-mode={mode}
      role="dialog"
      aria-label="Chat"
      aria-modal={isOpen ? "true" : undefined}
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
