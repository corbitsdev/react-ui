import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import type { AgentIdentity, ChatMessage } from "../lib/chat-message.js";
import { cn } from "../lib/utils.js";
import { AgentTurn } from "./agent-turn.js";
import { MessageBubble } from "./message-bubble.js";

export type ChatThreadProps = {
  readonly messages: readonly ChatMessage[];
  readonly identity: AgentIdentity;
  /** Rich body for one message — a markdown renderer, if the host has one. */
  readonly renderBody?: (message: ChatMessage) => ReactNode;
  readonly onRetry?: (message: ChatMessage) => void;
  /** Shown when there are no messages: a greeting, suggestions, anything. */
  readonly empty?: ReactNode;
  readonly now?: number;
  readonly className?: string;
};

/**
 * The transcript.
 *
 * Messages are a prop, not a `DataPort` collection, and that is the one place
 * this registry departs from its own rule. A transcript is live, host-owned,
 * append-and-mutate state — the last message changes on every token — whereas a
 * `DataPort` collection is a cached, paginated, refetchable thing. The *thread
 * list* is a real collection and does use the port; a streaming conversation is
 * not one. The ticket asks for message data as props for the same reason.
 *
 * It pins to the bottom only when the user is already there. Yanking someone
 * back down while they are reading earlier context is the single most common
 * way chat scrolling goes wrong.
 */
export function ChatThread({
  messages,
  identity,
  renderBody,
  onRetry,
  empty,
  now,
  className,
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  useEffect(() => {
    const node = scrollRef.current;
    if (node === null || !pinnedRef.current) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  if (messages.length === 0 && empty !== undefined) {
    return <div className={cn("flex min-h-0 flex-1 items-center justify-center p-6", className)}>{empty}</div>;
  }

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => {
        const node = event.currentTarget;
        // A few pixels of slack: sub-pixel layout means an exact comparison is
        // false on plenty of screens that are, visually, at the bottom.
        pinnedRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 32;
      }}
      // `log` + polite: new turns are announced without interrupting, which is
      // what an arriving reply is.
      role="log"
      aria-live="polite"
      aria-label="Conversation"
      className={cn("flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4", className)}
    >
      {messages.map((message) =>
        message.role === "agent" ? (
          <AgentTurn key={message.id} message={message} identity={identity} now={now}>
            {renderBody?.(message)}
          </AgentTurn>
        ) : (
          <MessageBubble
            key={message.id}
            message={message}
            now={now}
            onRetry={onRetry === undefined ? undefined : () => onRetry(message)}
          >
            {renderBody?.(message)}
          </MessageBubble>
        ),
      )}
    </div>
  );
}
