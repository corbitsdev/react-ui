import type { ReactNode } from "react";

import type { ChatMessage } from "../lib/chat-message.js";
import { messageText } from "../lib/chat-message.js";
import { formatRelativeTime } from "../lib/relative-time.js";
import { cn } from "../lib/utils.js";

export type MessageBubbleProps = {
  readonly message: ChatMessage;
  /** Retry affordance for a failed send. Omit and a failure is only reported. */
  readonly onRetry?: () => void;
  readonly now?: number;
  /** Rich body — a markdown renderer. Defaults to the message's plain text. */
  readonly children?: ReactNode;
  readonly className?: string;
};

/**
 * One message, as said by whoever said it.
 *
 * Only the user's messages get a filled bubble. An agent reply is set on the
 * page ground with no container: agent turns are long, and a 600-word tinted
 * block is harder to read than plain text, while the alternating alignment that
 * makes chat apps legible comes from the user side alone.
 *
 * Text is rendered as text. Passing agent output through a markdown or HTML
 * renderer is the host's decision to make, with the host's sanitiser — pass one
 * as `children`.
 */
export function MessageBubble({ message, onRetry, now, children, className }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const failed = message.status === "failed";

  if (isSystem) {
    return (
      <p
        data-slot="message-bubble"
        className={cn("px-2 py-1 text-center text-xs text-muted-foreground", className)}
      >
        {children ?? messageText(message)}
      </p>
    );
  }

  return (
    <div
      data-slot="message-bubble"
      className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start", className)}
    >
      <div
        className={cn(
          "max-w-[46rem] text-sm leading-relaxed break-words whitespace-pre-wrap",
          isUser && "rounded-lg bg-muted px-3 py-2",
          failed && "opacity-60",
        )}
      >
        {children ?? messageText(message)}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <time dateTime={message.createdAt}>{formatRelativeTime(message.createdAt, now)}</time>
        {message.status === "sending" ? <span>Sending…</span> : null}
        {failed ? (
          <>
            {/* role=alert, not a quiet grey note: a message the user believes
                they sent and did not is worth interrupting for. */}
            <span role="alert" className="text-destructive">
              Not sent
            </span>
            {onRetry === undefined ? null : (
              <button type="button" onClick={onRetry} className="text-primary-emphasis hover:underline">
                Retry
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
