import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

import type { ChatDockMode } from "../hooks/use-chat-dock.js";
import { cn } from "../lib/utils.js";
import { CHAT_DOCK_SCRIM_MS } from "./chat-dock-timing.js";

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
 */
export function ChatDockFab({ onOpen, label = "Ask", className }: { onOpen: () => void; label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={false}
      aria-label="Open chat"
      className={cn(
        "inline-flex h-full w-full items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg transition-colors [animation:corbits-fab-in_280ms_var(--ease-out)_both] hover:bg-primary-active",
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
    "pointer-events-auto top-3 right-3 bottom-3 left-auto h-auto w-[min(520px,50vw)] max-w-[calc(100vw-24px)] rounded-2xl opacity-100 [animation:corbits-dock-in_280ms_var(--ease-out)_both]",
  fullpage: "pointer-events-auto inset-3 h-auto w-auto rounded-2xl opacity-100",
};

export type ChatDockProps = {
  readonly mode: ChatDockMode;
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * The dock's own persistent element: `closed`, `docked` and `fullpage` are
 * three sets of classes on this *one* fixed-position container, never three
 * components. `transition-[inset,top,right,bottom,left,width,height,border-radius]`
 * keyed off `--ease-out` is what makes `docked → fullpage` read as the panel
 * growing rather than one panel replacing another; `closed` is the one mode
 * whose content (the FAB) is a genuinely different child, but the container
 * itself never remounts.
 *
 * `prefers-reduced-motion` is handled once, globally, in `theme.css` — every
 * transition and animation on this element collapses to a single frame there,
 * so this piece carries no reduced-motion logic of its own.
 */
export function ChatDock({ mode, children, className }: ChatDockProps) {
  return (
    <div
      data-slot="chat-dock"
      data-mode={mode}
      role="dialog"
      aria-label="Chat"
      aria-hidden={mode === "closed"}
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden border border-border bg-popover text-popover-foreground shadow-xl transition-[inset,top,right,bottom,left,width,height,border-radius,opacity] duration-300 ease-[var(--ease-out)]",
        MODE_CLASS[mode],
        className,
      )}
    >
      {children}
    </div>
  );
}
