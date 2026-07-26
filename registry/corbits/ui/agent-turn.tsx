import type { ReactNode } from "react";

import {
  agentInitials,
  isTurnWorking,
  messageText,
  reasoningText,
  toolParts,
  type AgentIdentity,
  type ChatMessage,
} from "@/registry/corbits/lib/chat-message";
import { cn } from "@/registry/corbits/lib/utils";
import { ActivityBlock } from "@/registry/corbits/ui/activity-block";
import { MessageBubble } from "@/registry/corbits/ui/message-bubble";
import { ToolNarrative } from "@/registry/corbits/ui/tool-narrative";

export type AgentTurnProps = {
  readonly message: ChatMessage;
  readonly identity: AgentIdentity;
  /** Rich body for the answer — a markdown renderer. */
  readonly children?: ReactNode;
  readonly now?: number;
  readonly className?: string;
};

/**
 * One agent reply, in the order it happened: what it thought, what it did, what
 * it said.
 *
 * Parts are rendered in the order the model produced them rather than grouped
 * by kind — a turn that thinks, calls a tool, thinks again and then answers
 * reads as a sequence, and sorting it into "all thinking / all tools / answer"
 * describes a turn that never happened.
 *
 * The avatar is `aria-hidden` and the turn is a labelled region instead: a
 * screen reader should hear "Ada said …" once, not two initials followed by the
 * name.
 */
export function AgentTurn({ message, identity, children, now, className }: AgentTurnProps) {
  const working = isTurnWorking(message);
  const answer = messageText(message);
  const thinking = reasoningText(message);
  const tools = toolParts(message);
  const hasWork = thinking.length > 0 || tools.length > 0;

  return (
    <article
      data-slot="agent-turn"
      aria-label={`${identity.name} replied`}
      className={cn("flex gap-3", className)}
    >
      <span
        aria-hidden
        className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground"
      >
        {agentInitials(identity)}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {hasWork ? (
          <div className="flex flex-col">
            <ActivityBlock text={thinking} working={working} />
            {tools.map((part) => (
              <ToolNarrative key={part.toolCallId} part={part} />
            ))}
          </div>
        ) : null}

        {answer.length > 0 || children !== undefined ? (
          <MessageBubble message={message} now={now}>
            {children}
          </MessageBubble>
        ) : null}
      </div>
    </article>
  );
}
