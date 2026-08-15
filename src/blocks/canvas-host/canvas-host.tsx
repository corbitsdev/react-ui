import { useEffect, type ReactNode } from "react";

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
  readonly composer?: ReactNode;
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
 * Below `lg` (1024px) there is never room for both columns: `split` and
 * `focus` both collapse the chat track to `0px` and hand the canvas the
 * full row, exactly like the deliberate `focus` behavior at `lg`+, per the
 * "canvas takes over below the breakpoint" requirement. This is plain
 * responsive Tailwind on the container, not a JS media query, so it degrades
 * with the viewport for free.
 */
const GRID_CLASS: Record<CanvasHostLayoutMode, string> = {
  chat: "grid-cols-[minmax(0,1fr)_0px]",
  split: "grid-cols-[0px_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_min(28rem,40%)]",
  focus: "grid-cols-[0px_minmax(0,1fr)] lg:grid-cols-[4rem_minmax(0,1fr)]",
};

/**
 * Visibility for the chat column's *interactive* content, keyed by mode.
 * `invisible` (not `hidden`, not `inert`) is what removes a collapsed
 * chat column from both hit-testing and the tab order in every browser
 * without any JS knowledge of the current breakpoint: `split` only hides it
 * below `lg` (where the grid track above has already gone to `0px`) and
 * un-hides it at `lg`+ where the track is real again; `focus` hides it at
 * every breakpoint, since focus mode never gives the chat column real width
 * to work with even at `lg`+ — `ChatRailIndicator` fills that space instead,
 * purely as a decorative "still here" marker.
 */
const CHAT_CONTENT_VISIBILITY_CLASS: Record<CanvasHostLayoutMode, string> = {
  chat: "",
  split: "invisible pointer-events-none lg:visible lg:pointer-events-auto",
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
      if (event.key !== "Escape" || event.defaultPrevented) return;
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
        "grid h-full min-h-0 transition-[grid-template-columns] duration-300 ease-[var(--ease-out)]",
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
            {composer === undefined ? null : <ChatPanelFooter>{composer}</ChatPanelFooter>}
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
