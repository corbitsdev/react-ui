import { MessageSquare, Pin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Button } from "../../src/ui/button.js";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationItem,
  ConversationScrollButton,
  type ConversationScrollPolicy,
} from "../../src/ui/conversation.js";
import {
  ConversationDivider,
  ConversationNotice,
} from "../../src/ui/conversation-divider.js";

export default { title: "Chat / Conversation" };

type Row = {
  readonly id: string;
  readonly from: "reader" | "agent";
  readonly text: string;
};

const QUESTIONS = [
  "What changed in the last run?",
  "Can you summarise the open items?",
  "Which step took the longest?",
  "Draft a note for the team about it.",
];

const ANSWERS = [
  "Two steps were added and one was retried after a timeout. The rest ran as before.",
  "Three items are open: the export review, a failing check on the staging workflow, and a question about access.",
  "The fetch step took most of the time, about forty seconds, because it paged through every result before filtering.",
  "Here is a short note you can send. It covers what changed, why, and what to watch for on the next run.",
];

const REPLY =
  "Here is what I found. The workflow ran four steps; the second waited on an approval for most of its time, and the last wrote its output to the shared folder. Nothing failed, though one call was retried once after a slow response. If you want, I can schedule the next run earlier so the approval lands before the end of the day, or split the long step into two so the wait is easier to see.";

function history(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => {
    const turn = Math.floor(index / 2);
    const from = index % 2 === 0 ? "reader" : "agent";
    const pool = from === "reader" ? QUESTIONS : ANSWERS;
    return {
      id: `m${index}`,
      from,
      text: pool[turn % pool.length] ?? "",
    };
  });
}

/** A placeholder row: the conversation renders whatever the host gives it. */
function Bubble({ row }: { readonly row: Row }) {
  return row.from === "reader" ? (
    <p className="ml-auto max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm">
      {row.text}
    </p>
  ) : (
    <p className="max-w-prose text-sm leading-relaxed">{row.text}</p>
  );
}

function Frame({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex h-[30rem] max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-background">
      {children}
    </div>
  );
}

/** A conversation that sends and streams placeholder replies. */
function Live({
  policy,
  initial,
  streamOnMount = false,
}: {
  readonly policy: ConversationScrollPolicy;
  readonly initial: number;
  readonly streamOnMount?: boolean;
}) {
  const [rows, setRows] = useState<readonly Row[]>(() => history(initial));
  const [sentId, setSentId] = useState<string>();
  const sends = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const send = () => {
    clearInterval(timer.current);
    sends.current += 1;
    const asked = `sent-${sends.current}`;
    const reply = `reply-${sends.current}`;
    const words = REPLY.split(" ");
    setRows((previous) => [
      ...previous,
      {
        id: asked,
        from: "reader",
        text: QUESTIONS[sends.current % QUESTIONS.length] ?? "",
      },
      { id: reply, from: "agent", text: "" },
    ]);
    setSentId(asked);
    let written = 0;
    timer.current = setInterval(() => {
      written += 3;
      setRows((previous) =>
        previous.map((row) =>
          row.id === reply
            ? { ...row, text: words.slice(0, written).join(" ") }
            : row,
        ),
      );
      if (written >= words.length) clearInterval(timer.current);
    }, 120);
  };

  useEffect(() => {
    // A send after mount, so the first reply streams as the story opens.
    const start = streamOnMount ? setTimeout(send, 300) : undefined;
    return () => {
      clearTimeout(start);
      clearInterval(timer.current);
    };
    // `send` only touches state setters and refs, so the first render's is current.
  }, [streamOnMount]);

  return (
    <Frame>
      <Conversation scrollPolicy={policy} sentId={sentId}>
        <ConversationContent>
          {rows.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquare />}
              description="Send a message to start."
            />
          ) : (
            rows.map((row) => (
              <ConversationItem key={row.id} itemId={row.id}>
                <Bubble row={row} />
              </ConversationItem>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="flex justify-end border-t border-border p-3">
        <Button size="sm" onClick={send}>
          Send
        </Button>
      </div>
    </Frame>
  );
}

/** A few turns, shorter than the view. */
export const Short = () => <Live policy="settle" initial={4} />;

/** A long history, opened at the latest; scroll up for the jump button. */
export const Long = () => <Live policy="settle" initial={40} />;

/** `settle`: the sent message glides to the top and the reply writes in below
 * it; the view never moves while it streams. */
export const StreamingSettle = () => (
  <Live policy="settle" initial={12} streamOnMount />
);

/** `stick`: the view follows the reply while you are at the end; scroll up
 * and it stays put. */
export const StreamingStick = () => (
  <Live policy="stick" initial={12} streamOnMount />
);

/** No messages yet. */
export const Empty = () => <Live policy="settle" initial={0} />;

/** Day dividers and one-line system notices between messages. */
export const DividersAndNotices = () => {
  const rows = history(6);
  return (
    <Frame>
      <Conversation>
        <ConversationContent>
          <ConversationDivider>Yesterday</ConversationDivider>
          {rows.slice(0, 2).map((row) => (
            <ConversationItem key={row.id} itemId={row.id}>
              <Bubble row={row} />
            </ConversationItem>
          ))}
          <ConversationNotice>A scheduled run started</ConversationNotice>
          {rows.slice(2, 4).map((row) => (
            <ConversationItem key={row.id} itemId={row.id}>
              <Bubble row={row} />
            </ConversationItem>
          ))}
          <ConversationDivider>Today</ConversationDivider>
          <ConversationNotice icon={<Pin />}>
            The agent pinned a message
          </ConversationNotice>
          {rows.slice(4).map((row) => (
            <ConversationItem key={row.id} itemId={row.id}>
              <Bubble row={row} />
            </ConversationItem>
          ))}
          <ConversationDivider />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </Frame>
  );
};
