"use client";

import type { ComponentProps } from "react";

import type { ConversationReaction } from "../lib/conversation.js";
import { cn } from "../lib/utils.js";

export type MessageReactionsProps = Omit<ComponentProps<"div">, "children"> & {
  readonly reactions: readonly ConversationReaction[];
  /**
   * Toggles the viewer's reaction. Without it the reactions are shown, not
   * offered.
   */
  readonly onReact?: ((emoji: string) => void) | undefined;
};

function reactionLabel({ emoji, count, mine }: ConversationReaction): string {
  const people = count === 1 ? "1 reaction" : `${count} reactions`;
  return mine ? `${emoji}, ${people}, including yours` : `${emoji}, ${people}`;
}

/**
 * The reactions on a message, one chip per emoji with its count. The
 * viewer's own are outlined and bold, and pressed for assistive tech. Renders
 * nothing when there are none.
 */
export function MessageReactions({
  reactions,
  onReact,
  "aria-label": label = "Reactions",
  className,
  ...props
}: MessageReactionsProps) {
  if (reactions.length === 0) return null;
  const chip =
    "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-sm leading-none";
  const tone = (mine: boolean) =>
    mine
      ? "border-border-strong bg-muted text-foreground"
      : "border-transparent bg-muted text-muted-foreground";
  return (
    <div
      role="group"
      aria-label={label}
      data-slot="message-reactions"
      className={cn("flex flex-wrap items-center gap-1", className)}
      {...props}
    >
      {reactions.map((reaction) => {
        const content = (
          <>
            <span aria-hidden>{reaction.emoji}</span>
            <span
              aria-hidden
              className={cn(
                "text-xs tabular-nums",
                reaction.mine && "font-semibold",
              )}
            >
              {reaction.count}
            </span>
          </>
        );
        return onReact === undefined ? (
          <span
            key={reaction.emoji}
            role="img"
            aria-label={reactionLabel(reaction)}
            data-slot="message-reaction"
            className={cn(chip, tone(reaction.mine))}
          >
            {content}
          </span>
        ) : (
          <button
            key={reaction.emoji}
            type="button"
            aria-pressed={reaction.mine}
            aria-label={reactionLabel(reaction)}
            data-slot="message-reaction"
            className={cn(
              chip,
              tone(reaction.mine),
              "transition-colors hover:border-border-strong hover:text-foreground",
            )}
            onClick={() => onReact(reaction.emoji)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
