import { ChevronRight } from "lucide-react";
import type { ComponentProps } from "react";

import type { ConversationRepliesSummary } from "../lib/conversation.js";
import { formatRelativeTime } from "../lib/relative-time.js";
import { cn } from "../lib/utils.js";

export type MessageRepliesProps = Omit<ComponentProps<"button">, "children"> & {
  readonly replies: ConversationRepliesSummary;
  /** Reference time for "Last reply …", in ms. Defaults to now. */
  readonly now?: number | undefined;
};

/**
 * The replies to a message: how many and when the last one came, as a
 * button that opens the thread (the host's `onClick`). Renders nothing when
 * there are no replies.
 */
export function MessageReplies({
  replies,
  now,
  className,
  ...props
}: MessageRepliesProps) {
  if (replies.count <= 0) return null;
  const count = replies.count === 1 ? "1 reply" : `${replies.count} replies`;
  return (
    <button
      type="button"
      data-slot="message-replies"
      className={cn(
        "group inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    >
      <span className="font-semibold text-primary-emphasis">{count}</span>
      <span>
        Last reply{" "}
        <time dateTime={replies.lastAt}>
          {formatRelativeTime(replies.lastAt, now)}
        </time>
      </span>
      <ChevronRight aria-hidden className="size-3.5 shrink-0" />
    </button>
  );
}
