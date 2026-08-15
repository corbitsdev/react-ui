import { useEffect, type ReactNode } from "react";

import { isEscapeConsumedByNestedUI } from "../../hooks/use-chat-dock.js";
import type { CanvasHostContent } from "../../lib/canvas-host-state.js";
import type { Part } from "../../lib/chat-parts.js";
import { cn } from "../../lib/utils.js";
import { ChatPanel, ChatPanelFooter } from "../../ui/chat-panel.js";
import { EmptyState } from "../../ui/empty-state.js";
import { MessageList } from "../../ui/message-list.js";
import { PartsRenderer } from "../../ui/parts-renderer.js";
import { CanvasHostHeader, ChatRailIndicator } from "./canvas-host-chrome.js";

export type { CanvasHostContent } from "../../lib/canvas-host-state.js";

export type CanvasHostMessage = {
  readonly id: string;
  readonly parts: readonly Part[];
};

export type CanvasHostProps<TData = unknown> = {
  readonly messages: readonly CanvasHostMessage[];
  /** `null` means nothing is open — the canvas column renders its empty state and collapses. */
  readonly content: CanvasHostContent<TData> | null;
  /** The host's own renderer for `content` — this package knows nothing about what a `kind` means. */
  readonly renderCanvas: (content: CanvasHostContent<TData>) => ReactNode;
  readonly focus: boolean;
  readonly onFocusChange: (focus: boolean) => void;
  readonly onClose: () => void;
  readonly chatHeader?: ReactNode;
  readonly composer?: ReactNode | null;
  /** Shown in place of the transcript while `messages` is empty. */
  readonly emptyChat?: ReactNode;
  readonly className?: string;
};

/**
 * Three ways the two columns can occupy the frame. `chat` and `split` differ
 * only in whether the canvas track has anything to show; `focus` is the one
 * mode a reader chooses deliberately, via the header's focus-toggle.
 */
type CanvasHostLayoutMode = "chat" | "split" | "focus";

function resolveLayoutMode<TData>(content: CanvasHostContent<TData> | null, focus: boolean): CanvasHostLayoutMode {
  if (content === null) return "chat";
  return focus ? "focus" : "split";
}

/**
 * Grid tracks for the chat/canvas pair, keyed by mode. Every entry keeps
 * exactly two tracks so the browser can interpolate `grid-template-columns`
 * between modes instead of snapping (a transition across a differing track
 * count cannot animate) — see the class on the root element below.
 *
 * Below `lg` (1024px) there is never room for both columns, so `split` and
 * `focus` diverge deliberately instead of collapsing to the same thing:
 *
 *              | below `lg`                | `lg`+
 *   -----------|----------------------------|------------------------------
 *   chat       | chat full, canvas 0px      | chat full, canvas 0px
 *   split      | chat full, canvas 0px      | chat + canvas share the row
 *   focus      | canvas full, chat 0px      | canvas full, chat rail (4rem)
 *
 * `split` below `lg` keeps the chat column full-width with the canvas
 * merely off-screen (not torn down) — a reader who opens a canvas on a
 * phone still has their conversation, and the header's focus toggle is what
 * swaps to `focus` (canvas full-width) and back, exactly the affordance the
 * toggle already provides at `lg`+. Without this split, any open canvas
 * below `lg` would trap the reader away from the composer with no way back
 * short of closing the canvas outright.
 */
export const GRID_CLASS: Record<CanvasHostLayoutMode, string> = {
  chat: "grid-cols-[minmax(0,1fr)_0px]",
  split: "grid-cols-[minmax(0,1fr)_0px] lg:grid-cols-[minmax(0,1fr)_min(28rem,40%)]",
  focus: "grid-cols-[0px_minmax(0,1fr)] lg:grid-cols-[4rem_minmax(0,1fr)]",
};

/**
 * Visibility for the chat column's *interactive* content, keyed by mode.
 * `invisible` (not `hidden`, not `inert`) is what removes it from both
 * hit-testing and the tab order without any JS knowledge of the current
 * breakpoint. `chat` and `split` both keep the chat content visible at every
 * breakpoint now — in `split`, `GRID_CLASS` alone is what takes the canvas
 * column out of view below `lg` (a `0px` track), so no separate visibility
 * toggle is needed here. `focus` hides the chat content at every
 * breakpoint: below `lg` the canvas owns the whole row, and at `lg`+ the
 * chat column is a decorative rail (`ChatRailIndicator`), never real content.
 */
export const CHAT_CONTENT_VISIBILITY_CLASS: Record<CanvasHostLayoutMode, string> = {
  chat: "",
  split: "",
  focus: "invisible pointer-events-none",
};

/**
 * The dual-column generative-UI chat host: chat on the left, a
 * consumer-rendered canvas on the right. Fully controlled — `content` and
 * `focus` are props, `onFocusChange`/`onClose` are callbacks, and this
 * component owns no state of its own beyond the derived `mode` above. A
 * host wanting a state container to drive these props can reach for
 * `lib/canvas-host-state.ts`'s pure transition functions, but nothing here
 * requires it.
 *
 * Escape steps down exactly like `useChatDock`: focused → split first, then
 * split/chat → closed on a second press. A reader who filled the screen
 * with the canvas and hits Escape expects to land back at the split view,
 * not to lose the canvas outright.
 */
export function CanvasHost<TData = unknown>({
  messages,
  content,
  renderCanvas,
  focus,
  onFocusChange,
  onClose,
  chatHeader,
  composer,
  emptyChat,
  className,
}: CanvasHostProps<TData>) {
  const mode = resolveLayoutMode(content, focus);

  useEffect(() => {
    if (content === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isEscapeConsumedByNestedUI(event, "canvas-host")) return;
      if (focus) {
        onFocusChange(false);
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [content, focus, onFocusChange, onClose]);

  return (
    <div
      data-slot="canvas-host"
      data-layout={mode}
      className={cn(
        // Animates `grid-template-columns` — a layout property, not
        // `transform` — an accepted tradeoff shared with `now-cards.tsx`'s
        // and `live-status-line.tsx`'s own `grid-template-rows` transitions.
        // A family-wide transform-based (FLIP) rewrite is a candidate for a
        // future pass, not this one. A morph (growing/shrinking in place,
        // not entering/exiting) uses the in-out curve, not the decelerate
        // one `ease-out` is tuned for.
        "grid h-full min-h-0 transition-[grid-template-columns] duration-300 ease-[var(--ease-in-out)]",
        GRID_CLASS[mode],
        className,
      )}
    >
      <div data-slot="canvas-host-chat" className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        {mode === "focus" ? <ChatRailIndicator /> : null}
        <div className={cn("flex min-h-0 flex-1 flex-col", CHAT_CONTENT_VISIBILITY_CLASS[mode])}>
          <ChatPanel className="min-h-0 flex-1">
            {chatHeader}
            <MessageList itemCount={messages.length} className="flex-1 px-4 py-3">
              {messages.length === 0
                ? emptyChat
                : messages.map((message) => (
                    <div key={message.id} data-slot="canvas-host-message">
                      <PartsRenderer parts={message.parts} />
                    </div>
                  ))}
            </MessageList>
            {/* `null` and omitted must behave identically — no empty bordered footer either way. */}
            {composer === undefined || composer === null ? null : <ChatPanelFooter>{composer}</ChatPanelFooter>}
          </ChatPanel>
        </div>
      </div>

      <div
        data-slot="canvas-host-canvas"
        className={cn(
          "flex min-h-0 min-w-0 flex-col overflow-hidden bg-background",
          content !== null && "border-l border-border",
        )}
      >
        {content === null ? (
          <EmptyState
            title="Nothing open"
            description="Content opens here when something needs a closer look."
          />
        ) : (
          <>
            <CanvasHostHeader
              title={content.title}
              kind={content.kind}
              focus={focus}
              onFocusChange={onFocusChange}
              onClose={onClose}
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-4 py-4">{renderCanvas(content)}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
