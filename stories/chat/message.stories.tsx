import {
  Check,
  Copy,
  Link,
  Pin,
  Reply,
  RotateCw,
  SmilePlus,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Fragment, useState } from "react";
import type { ReactNode } from "react";

import { useCopy } from "../../src/hooks/use-copy.js";
import type {
  ConversationMessage,
  ConversationReaction,
} from "../../src/lib/conversation.js";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
  MessageSendStatus,
  type MessageFrom,
} from "../../src/ui/message.js";
import {
  MessageAction,
  MessageActionMenu,
  MessageActions,
} from "../../src/ui/message-actions.js";
import { MessageFold } from "../../src/ui/message-fold.js";
import { MessageReactions } from "../../src/ui/message-reactions.js";
import { MessageReplies } from "../../src/ui/message-replies.js";
import {
  SAMPLE_NOW,
  failedSend,
  shortChat,
  withThread,
  you,
} from "./samples/conversations.js";

export default { title: "Chat / Message" };

const NOW = Date.parse(SAMPLE_NOW);

/**
 * A stand-in markdown renderer: paragraphs, `- ` lists and `**bold**`. A
 * real host passes its own renderer and sanitiser through `render`.
 */
function markdown(text: string): ReactNode {
  const inline = (line: string) =>
    line
      .split(/(\*\*[^*]+\*\*)/)
      .map((piece, index) =>
        piece.startsWith("**") && piece.endsWith("**") ? (
          <strong key={index}>{piece.slice(2, -2)}</strong>
        ) : (
          <Fragment key={index}>{piece}</Fragment>
        ),
      );
  return (
    <div className="flex flex-col gap-3">
      {text.split(/\n{2,}/).map((block, index) => {
        const lines = block.split("\n");
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={index} className="list-disc ps-5">
              {lines.map((line, item) => (
                <li key={item}>{inline(line.slice(2))}</li>
              ))}
            </ul>
          );
        }
        return <p key={index}>{inline(block)}</p>;
      })}
    </div>
  );
}

function textOf(message: ConversationMessage): string {
  return message.parts
    .flatMap((part) => (part.kind === "text" ? [part.text] : []))
    .join("\n\n");
}

function find(
  messages: readonly ConversationMessage[],
  id: string,
): ConversationMessage {
  const message = messages.find((candidate) => candidate.id === id);
  if (message === undefined) throw new Error(`no sample message ${id}`);
  return message;
}

function fromOf(message: ConversationMessage): MessageFrom {
  if (message.author.id === you.id) return "own";
  return message.author.kind;
}

function Column({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex max-w-2xl flex-col gap-6 bg-background p-6 text-foreground">
      {children}
    </div>
  );
}

/** A sample message with the usual parts; each can be left out. */
function SampleMessage({
  message,
  avatar = true,
  header = true,
  footer,
  onRetry,
}: {
  readonly message: ConversationMessage;
  readonly avatar?: boolean;
  readonly header?: boolean;
  readonly footer?: ReactNode;
  readonly onRetry?: () => void;
}) {
  const from = fromOf(message);
  const own = from === "own";
  return (
    <Message
      from={from}
      status={message.status}
      error={message.error}
      onRetry={onRetry}
      // Own messages drop the header, so they are named here; others are
      // named by their MessageHeader when it is shown.
      aria-label={own ? "You" : header ? undefined : message.author.name}
    >
      {avatar && !own ? <MessageAvatar name={message.author.name} /> : null}
      {header && !own ? (
        <MessageHeader
          name={message.author.name}
          role={message.author.role}
          at={message.at}
          now={NOW}
        />
      ) : null}
      <MessageContent
        text={textOf(message)}
        render={own ? undefined : markdown}
      />
      <MessageSendStatus />
      {footer === undefined ? null : <MessageFooter>{footer}</MessageFooter>}
    </Message>
  );
}

export function Agent() {
  return (
    <Column>
      <SampleMessage message={find(shortChat.messages, "short-2")} />
    </Column>
  );
}

export function Person() {
  return (
    <Column>
      <SampleMessage message={find(withThread.messages, "thread-3")} />
    </Column>
  );
}

export function Own() {
  return (
    <Column>
      <SampleMessage message={find(shortChat.messages, "short-1")} />
      <SampleMessage message={find(shortChat.messages, "short-3")} />
    </Column>
  );
}

/** One person and one agent: no avatars or names, the answer is just text. */
export function NoAvatars() {
  return (
    <Column>
      {shortChat.messages.map((message) => (
        <SampleMessage
          key={message.id}
          message={message}
          avatar={false}
          header={false}
        />
      ))}
    </Column>
  );
}

function ActionRow({ text }: { readonly text: string }) {
  const { copied, copy } = useCopy();
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const [pinned, setPinned] = useState(false);
  const [log, setLog] = useState("");
  return (
    <>
      <MessageActions>
        <MessageAction
          label={copied ? "Copied" : "Copy"}
          onClick={() => void copy(text)}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        </MessageAction>
        <MessageAction
          label="Good response"
          aria-pressed={vote === "up"}
          onClick={() => setVote(vote === "up" ? null : "up")}
        >
          <ThumbsUp aria-hidden />
        </MessageAction>
        <MessageAction
          label="Bad response"
          aria-pressed={vote === "down"}
          onClick={() => setVote(vote === "down" ? null : "down")}
        >
          <ThumbsDown aria-hidden />
        </MessageAction>
        <MessageAction label="Regenerate" onClick={() => setLog("Regenerate")}>
          <RotateCw aria-hidden />
        </MessageAction>
        <MessageActionMenu>
          <MessageAction
            label="Pin"
            aria-pressed={pinned}
            onClick={() => setPinned(!pinned)}
          >
            <Pin aria-hidden />
          </MessageAction>
          <MessageAction label="Copy link" onClick={() => setLog("Copy link")}>
            <Link aria-hidden />
          </MessageAction>
          <MessageAction
            label="Reply in thread"
            onClick={() => setLog("Reply in thread")}
          >
            <Reply aria-hidden />
          </MessageAction>
        </MessageActionMenu>
      </MessageActions>
      <output className="text-xs text-muted-foreground">{log}</output>
    </>
  );
}

export function Actions() {
  const message = find(shortChat.messages, "short-4");
  return (
    <Column>
      <SampleMessage
        message={message}
        footer={<ActionRow text={textOf(message)} />}
      />
    </Column>
  );
}

const PICKER = ["👍", "🎉", "👀", "✅"];

function toggleReaction(
  reactions: readonly ConversationReaction[],
  emoji: string,
): readonly ConversationReaction[] {
  const existing = reactions.find((reaction) => reaction.emoji === emoji);
  if (existing === undefined) {
    return [...reactions, { emoji, count: 1, mine: true }];
  }
  return reactions.flatMap((reaction) => {
    if (reaction.emoji !== emoji) return [reaction];
    const count = reaction.count + (reaction.mine ? -1 : 1);
    return count === 0 ? [] : [{ emoji, count, mine: !reaction.mine }];
  });
}

export function Reactions() {
  const message = find(withThread.messages, "thread-2");
  const [reactions, setReactions] = useState(message.reactions ?? []);
  const react = (emoji: string) =>
    setReactions((current) => toggleReaction(current, emoji));
  return (
    <Column>
      <SampleMessage
        message={message}
        footer={
          <>
            <MessageReactions reactions={reactions} onReact={react} />
            <MessageActions>
              <MessageActionMenu
                label="Add reaction"
                icon={<SmilePlus aria-hidden />}
              >
                {PICKER.map((emoji) => (
                  <MessageAction
                    key={emoji}
                    label={emoji}
                    onClick={() => react(emoji)}
                  />
                ))}
              </MessageActionMenu>
            </MessageActions>
          </>
        }
      />
      <SampleMessage
        message={find(shortChat.messages, "short-4")}
        footer={
          <MessageReactions
            reactions={find(shortChat.messages, "short-4").reactions ?? []}
          />
        }
      />
    </Column>
  );
}

export function Replies() {
  const message = find(withThread.messages, "thread-2");
  const [opened, setOpened] = useState(false);
  return (
    <Column>
      <SampleMessage
        message={message}
        footer={
          message.replies === undefined ? null : (
            <MessageReplies
              replies={message.replies}
              now={NOW}
              aria-expanded={opened}
              onClick={() => setOpened(!opened)}
            />
          )
        }
      />
    </Column>
  );
}

export function Failed() {
  const [retries, setRetries] = useState(0);
  return (
    <Column>
      {failedSend.messages.map((message) => (
        <SampleMessage
          key={message.id}
          message={message}
          onRetry={() => setRetries(retries + 1)}
        />
      ))}
      <output className="text-xs text-muted-foreground">
        Retries: {retries}
      </output>
    </Column>
  );
}

const SECTION =
  "The workflow ran its steps in order and wrote each result to the shared folder before moving on. Two steps waited on an approval, one call was retried after a slow response, and the export finished a little later than usual because it paged through every result before filtering. Nothing failed, and the totals match the previous run within a percent.";

const LONG_ANSWER = Array.from(
  { length: 24 },
  (_, index) => `**Part ${index + 1}.** ${SECTION}`,
).join("\n\n");

export function VeryLongAnswer() {
  return (
    <div className="h-128 max-w-2xl overflow-y-auto rounded-lg border border-border">
      <Column>
        <Message from="agent">
          <MessageAvatar name="Ada" />
          <MessageHeader
            name="Ada"
            role="Assistant"
            at="2026-03-04T11:40:00.000Z"
            now={NOW}
          />
          <MessageFold length={LONG_ANSWER.length}>
            <MessageContent text={LONG_ANSWER} render={markdown} />
          </MessageFold>
        </Message>
        <SampleMessage message={find(shortChat.messages, "short-3")} />
      </Column>
    </div>
  );
}
