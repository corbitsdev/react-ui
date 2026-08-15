import { ChevronsUpDown, MessagesSquare } from "lucide-react";
import { useId } from "react";

import { useDismissablePopover } from "../hooks/use-dismissable-popover.js";
import type { ChatThreadSummary } from "../lib/chat-message.js";
import type { CollectionRequest } from "../lib/data-port.js";
import { cn } from "../lib/utils.js";
import { ThreadList } from "./thread-list.js";

export type ThreadSwitcherProps = {
  /** The same threads collection `ThreadList` takes. */
  readonly request: CollectionRequest<ChatThreadSummary>;
  /** The open conversation. Its title is what the trigger reads. */
  readonly active?: ChatThreadSummary | null;
  readonly onSelect: (thread: ChatThreadSummary) => void;
  readonly onNewThread?: () => void;
  /** Shown on the trigger before a thread exists. */
  readonly placeholder?: string;
  readonly now?: number;
  /** Controlled open state. Pair with `onOpenChange` to lift it to a parent. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly className?: string;
};

/**
 * Which conversation you are in, and the way out of it — for layouts with no
 * room for a list.
 *
 * A sidebar list and a switcher are not the same surface. The list is furniture:
 * always visible, always showing the neighbours. The switcher is a control that
 * spends one line saying *which thread this is* — the thing a docked bar, a
 * floating panel or a mobile header has no other way to state — and reveals the
 * rest only when asked. Chat shells that have no sidebar still need the answer
 * to "which conversation am I typing into", and a list cannot give it in the
 * space available.
 *
 * The list inside the popover is `ThreadList`, unmodified. Loading, empty,
 * error, paging and the active marker are already solved there and a second
 * copy would be a second thing to fix. What lives here is the part a list has
 * no notion of: a collapsed trigger that names the current thread, `aria-expanded`
 * and `aria-controls` tying it to the panel, Escape and outside-click to close,
 * focus returning to the trigger when it does, and closing on selection —
 * because a switcher that stays open after you switch is a list.
 *
 * Uncontrolled by default. Pass `open`/`onOpenChange` to drive it from a parent.
 */
export function ThreadSwitcher({
  request,
  active = null,
  onSelect,
  onNewThread,
  placeholder = "No conversation",
  now,
  open: openProp,
  onOpenChange,
  className,
}: ThreadSwitcherProps) {
  const panelId = useId();
  const { open, setOpen, rootRef, triggerRef, close } = useDismissablePopover<HTMLDivElement, HTMLButtonElement>({
    open: openProp,
    onOpenChange,
  });

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Conversation: ${active?.title ?? placeholder}. Switch conversation`}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-md border border-input px-2 py-2 text-sm text-foreground transition-colors hover:bg-muted"
      >
        <MessagesSquare className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left">{active?.title ?? placeholder}</span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Switch conversation"
          className="absolute top-full left-0 z-50 mt-1 flex max-h-80 w-full min-w-64 flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <ThreadList
            request={request}
            activeId={active?.id ?? null}
            onSelect={(thread) => {
              onSelect(thread);
              close();
            }}
            {...(onNewThread === undefined
              ? {}
              : {
                  onNewThread: () => {
                    onNewThread();
                    close();
                  },
                })}
            {...(now === undefined ? {} : { now })}
          />
        </div>
      ) : null}
    </div>
  );
}
