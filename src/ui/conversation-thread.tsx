import type { ComponentProps, ReactNode } from "react";

import type { ConversationMessage } from "../lib/conversation.js";
import { cn } from "../lib/utils.js";
import {
  Conversation,
  ConversationContent,
  ConversationItem,
  ConversationScrollButton,
  type ConversationScrollPolicy,
} from "./conversation.js";
import { ConversationDivider } from "./conversation-divider.js";

export type ConversationThreadLabels = {
  /** The log's accessible name when no `aria-labelledby` is given. */
  readonly log: string;
  /** The rule between the parent and the replies. */
  readonly replies: (count: number) => string;
};

const LABELS: ConversationThreadLabels = {
  log: "Thread",
  replies: (count) =>
    count === 0
      ? "No replies yet"
      : count === 1
        ? "1 reply"
        : `${count} replies`,
};

export type ConversationThreadProps = Omit<
  ComponentProps<"div">,
  "children"
> & {
  /** The message the thread hangs off, shown first. */
  readonly parent: ConversationMessage;
  /** The replies, oldest first. The rule counts these, not `parent.replies`. */
  readonly replies: readonly ConversationMessage[];
  /**
   * Renders one message, the parent or a reply, from the `Message` parts:
   * the same renderer the host uses for its main conversation.
   */
  readonly renderMessage: (message: ConversationMessage) => ReactNode;
  /**
   * The id of the reader's latest reply sent in this thread, as on
   * `Conversation`: each change is a send, and the value at mount is
   * history. Keep it per thread; an id from another conversation is not
   * among these replies and moves nothing.
   */
  readonly sentId?: string | undefined;
  /** Defaults to `settle`. */
  readonly scrollPolicy?: ConversationScrollPolicy | undefined;
  readonly labels?: Partial<ConversationThreadLabels> | undefined;
  /** The input under the replies: the thread's own `PromptInput`. */
  readonly children?: ReactNode;
};

/**
 * A reply conversation, a thread: the parent message, a rule counting the
 * replies, the replies, and the thread's own input under them. Unlike the
 * main `Conversation`, it is headed by the message it hangs off.
 *
 * It fills its container, a `PanelPane` in a `PanelContent` with
 * `keepMounted`: a hidden pane stays laid out, so the thread keeps its scroll
 * position, its settled reply and its draft while another tab is in front.
 * A thread that is unmounted or given no size while hidden starts over.
 *
 * Every message goes through `renderMessage`, so the thread is built from the
 * same parts as the main conversation. It opens at its latest reply; under
 * `settle`, a reply the reader sends glides to the top of the view and the
 * answer writes in below it.
 *
 * `aria-labelledby` or `aria-label` names the log (the tab that shows the
 * thread, say); every other prop goes to the root.
 */
export function ConversationThread({
  parent,
  replies,
  renderMessage,
  sentId,
  scrollPolicy = "settle",
  labels: labelOverrides,
  "aria-labelledby": labelledBy,
  "aria-label": label,
  className,
  children,
  ...props
}: ConversationThreadProps) {
  const labels = { ...LABELS, ...labelOverrides };
  return (
    <div
      data-slot="conversation-thread"
      className={cn("flex h-full min-h-0 flex-col", className)}
      {...props}
    >
      <Conversation scrollPolicy={scrollPolicy} sentId={sentId}>
        <ConversationContent
          {...(labelledBy === undefined
            ? { "aria-label": label ?? labels.log }
            : { "aria-labelledby": labelledBy })}
        >
          <ConversationItem itemId={parent.id} data-thread-parent="">
            {renderMessage(parent)}
          </ConversationItem>
          <ConversationDivider data-thread-divider="">
            {labels.replies(replies.length)}
          </ConversationDivider>
          {replies.map((reply) => (
            <ConversationItem key={reply.id} itemId={reply.id}>
              {renderMessage(reply)}
            </ConversationItem>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {children === undefined || children === null ? null : (
        <div data-slot="conversation-thread-input" className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
