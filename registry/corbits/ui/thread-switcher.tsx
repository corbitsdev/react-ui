"use client";

import { ChevronsUpDown, MessagesSquare } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { ChatThreadSummary } from "@/registry/corbits/lib/chat-message";
import type { CollectionRequest } from "@/registry/corbits/lib/data-port";
import { cn } from "@/registry/corbits/lib/utils";
import { ThreadList } from "@/registry/corbits/ui/thread-list";

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
 */
export function ThreadSwitcher({
  request,
  active = null,
  onSelect,
  onNewThread,
  placeholder = "No conversation",
  now,
  className,
}: ThreadSwitcherProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    // `pointerdown` rather than `click`: closing on the press means the panel is
    // gone before whatever was clicked behind it reacts.
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (rootRef.current?.contains(event.target) === false) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`Conversation: ${active?.title ?? placeholder}. Switch conversation`}
        onClick={() => setOpen((value) => !value)}
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
