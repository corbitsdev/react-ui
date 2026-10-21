import { useState } from "react";
import type { ReactNode } from "react";

import { useHistoryWindow } from "../../src/hooks/use-history-window.js";
import type { ConversationMessage } from "../../src/lib/conversation.js";
import {
  Conversation,
  ConversationContent,
  ConversationItem,
  ConversationScrollButton,
} from "../../src/ui/conversation.js";
import { ConversationEarlier } from "../../src/ui/conversation-earlier.js";
import { longChat, you } from "./samples/conversations.js";

export default { title: "Chat / History window" };

const PAGE = 40;
const LOAD_DELAY_MS = 900;

/** A placeholder row: the window renders whatever the host gives it. */
function Row({ message }: { readonly message: ConversationMessage }) {
  const text = message.parts
    .flatMap((part) => (part.kind === "text" ? [part.text] : []))
    .join("\n\n");
  const mine = message.author.id === you.id;
  return (
    <div
      className={
        mine
          ? "ml-auto max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm"
          : "max-w-prose text-sm leading-relaxed"
      }
    >
      {mine ? null : (
        <p className="text-xs font-medium text-muted-foreground">
          {message.author.name}
        </p>
      )}
      <p className="whitespace-pre-line">{text}</p>
    </div>
  );
}

function Frame({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex h-[30rem] max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-background">
      {children}
    </div>
  );
}

/** Must sit inside `<Conversation>`: the window follows the reader. */
function Window({
  messages,
  total,
  hasEarlier,
  onLoadEarlier,
}: {
  readonly messages: readonly ConversationMessage[];
  readonly total: number;
  readonly hasEarlier?: boolean;
  readonly onLoadEarlier?: () => Promise<void>;
}) {
  const history = useHistoryWindow({
    items: messages,
    hasEarlier,
    onLoadEarlier,
  });
  return (
    <>
      <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
        {`Rendering ${history.items.length} of ${messages.length} loaded messages (${total} in all)`}
      </p>
      <ConversationContent>
        <ConversationEarlier
          hasEarlier={history.hasEarlier}
          loading={history.loading}
          stalled={history.stalled}
          onReachStart={history.reachStart}
        />
        {history.items.map((message) => (
          <ConversationItem key={message.id} itemId={message.id}>
            <Row message={message} />
          </ConversationItem>
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </>
  );
}

/** The 300-message sample held in memory: the latest 120 render, and 60
 * more load as you scroll up without moving what you are reading. Scroll
 * back to the latest and the window trims to 120 again. */
export const LongChat = () => (
  <Frame>
    <Conversation>
      <Window messages={longChat.messages} total={longChat.messages.length} />
    </Conversation>
  </Frame>
);

/** History paged from a server: 40 messages load at first, and each page
 * of 40 more arrives after a delay, with the marker showing the load. */
export const Paged = () => {
  const all = longChat.messages;
  const [from, setFrom] = useState(all.length - PAGE);
  // The hook asks once until this settles, so one timer is ever pending.
  const loadEarlier = () =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        setFrom((current) => Math.max(0, current - PAGE));
        resolve();
      }, LOAD_DELAY_MS);
    });
  return (
    <Frame>
      <Conversation>
        <Window
          messages={all.slice(from)}
          total={all.length}
          hasEarlier={from > 0}
          onLoadEarlier={loadEarlier}
        />
      </Conversation>
    </Frame>
  );
};

/** A load that comes back empty: the marker stops asking on scroll and
 * offers a button instead. */
export const Stalled = () => (
  <Frame>
    <Conversation>
      <Window
        messages={longChat.messages.slice(-6)}
        total={longChat.messages.length}
        hasEarlier
        onLoadEarlier={() => Promise.resolve()}
      />
    </Conversation>
  </Frame>
);
