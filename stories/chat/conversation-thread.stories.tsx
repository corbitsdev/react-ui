import { FileText, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { panelTabIds, useTabs } from "../../src/hooks/use-tabs.js";
import type { ConversationMessage } from "../../src/lib/conversation.js";
import {
  Conversation,
  ConversationContent,
  ConversationItem,
  type ConversationScrollPolicy,
} from "../../src/ui/conversation.js";
import { ConversationThread } from "../../src/ui/conversation-thread.js";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
  type MessageFrom,
} from "../../src/ui/message.js";
import { MessageReplies } from "../../src/ui/message-replies.js";
import {
  Panel,
  PanelActions,
  PanelClose,
  PanelContent,
  PanelHandle,
  PanelHeader,
  PanelPane,
} from "../../src/ui/panel.js";
import { PanelTab, PanelTabs } from "../../src/ui/panel-tabs.js";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputStatus,
} from "../../src/ui/prompt-input.js";
import {
  SAMPLE_NOW,
  assistant,
  shortChat,
  withThread,
  you,
} from "./samples/conversations.js";
import { playTurn } from "./samples/play-turn.js";

export default { title: "Chat / Conversation Thread" };

const NOW = Date.parse(SAMPLE_NOW);

function textOf(message: ConversationMessage): string {
  return message.parts
    .flatMap((part) => (part.kind === "text" ? [part.text] : []))
    .join("\n\n");
}

function fromOf(message: ConversationMessage): MessageFrom {
  if (message.author.id === you.id) return "own";
  return message.author.kind;
}

function find(
  messages: readonly ConversationMessage[],
  id: string,
): ConversationMessage {
  const message = messages.find((candidate) => candidate.id === id);
  if (message === undefined) throw new Error(`no sample message ${id}`);
  return message;
}

/** One message from the parts, the same in the main conversation and a thread. */
function SampleMessage({
  message,
  footer,
}: {
  readonly message: ConversationMessage;
  readonly footer?: ReactNode;
}) {
  const from = fromOf(message);
  const own = from === "own";
  return (
    <Message
      from={from}
      status={message.status}
      error={message.error}
      aria-label={own ? "You" : undefined}
    >
      {own ? null : <MessageAvatar name={message.author.name} />}
      {own ? null : (
        <MessageHeader
          name={message.author.name}
          role={message.author.role}
          at={message.at}
          now={NOW}
        />
      )}
      <MessageContent text={textOf(message)} />
      {footer === undefined ? null : <MessageFooter>{footer}</MessageFooter>}
    </Message>
  );
}

const renderMessage = (message: ConversationMessage) => (
  <SampleMessage message={message} />
);

const ANSWERS = [
  "Done. The follow-ups section now leads with the missing test, then the two slow steps.",
  "I added an owner and a due date to each follow-up, and linked the run each one came from.",
  "The report now shows which follow-ups carried over from last week, so nothing gets lost.",
];

type RepliesUpdate = (
  current: readonly ConversationMessage[],
) => readonly ConversationMessage[];

/**
 * A thread's tab: the replies and the thread's own input. Sending adds the
 * reader's reply, which settles at the top, and the answer writes in below.
 * Kept mounted while another tab is in front, so the draft stays. The
 * replies live with the chat, so the count under the parent keeps up.
 */
function ThreadTab({
  parent,
  replies,
  onRepliesChange,
  scrollPolicy,
  labelledBy,
  focusRequest,
}: {
  readonly parent: ConversationMessage;
  readonly replies: readonly ConversationMessage[];
  readonly onRepliesChange: (parentId: string, update: RepliesUpdate) => void;
  /** The tab that shows the thread, which names its log. */
  readonly labelledBy: string;
  readonly scrollPolicy?: ConversationScrollPolicy | undefined;
  /** Bumped each time the reader opens this thread, to move focus to its input. */
  readonly focusRequest: number;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusRequest > 0) input.current?.focus();
  }, [focusRequest]);
  const [draft, setDraft] = useState("");
  const [sentId, setSentId] = useState<string>();
  const [status, setStatus] = useState<PromptInputStatus>("ready");
  const stop = useRef<(() => void) | null>(null);
  const streamingId = useRef<string | null>(null);
  // Stops the answer where it stands, so the kept reply doesn't read as
  // still streaming once the tab is gone.
  const stopAnswer = useCallback(() => {
    stop.current?.();
    const id = streamingId.current;
    if (id === null) return;
    streamingId.current = null;
    onRepliesChange(parent.id, (current) =>
      current.map((reply) =>
        reply.id === id ? { ...reply, status: "sent" } : reply,
      ),
    );
  }, [onRepliesChange, parent.id]);
  useEffect(() => stopAnswer, [stopAnswer]);

  const send = () => {
    // The replies outlive the tab, so the count comes from them.
    const count =
      replies.filter((reply) => reply.id.startsWith(`${parent.id}-sent-`))
        .length + 1;
    const sent: ConversationMessage = {
      id: `${parent.id}-sent-${count}`,
      author: you,
      at: SAMPLE_NOW,
      status: "sent",
      parts: [{ kind: "text", text: draft.trim() }],
    };
    const answer: ConversationMessage = {
      id: `${parent.id}-answer-${count}`,
      author: assistant,
      at: SAMPLE_NOW,
      status: "sent",
      parts: [
        { kind: "text", text: ANSWERS[(count - 1) % ANSWERS.length] ?? "" },
      ],
    };
    onRepliesChange(parent.id, (current) => [...current, sent]);
    setSentId(sent.id);
    setDraft("");
    setStatus("streaming");
    streamingId.current = answer.id;
    stop.current = playTurn(
      answer,
      (frame) => {
        onRepliesChange(parent.id, (current) => [
          ...current.filter((reply) => reply.id !== frame.id),
          frame,
        ]);
        if (frame === answer) {
          streamingId.current = null;
          setStatus("ready");
        }
      },
      { stepMs: 120 },
    );
  };

  return (
    <ConversationThread
      parent={parent}
      replies={replies}
      renderMessage={renderMessage}
      sentId={sentId}
      scrollPolicy={scrollPolicy}
      aria-labelledby={labelledBy}
    >
      <PromptInput
        value={draft}
        onValueChange={setDraft}
        onSubmit={send}
        status={status}
      >
        <PromptInputTextarea
          ref={input}
          aria-label="Reply"
          placeholder="Reply…"
        />
        <PromptInputSubmit
          onStop={() => {
            stopAnswer();
            setStatus("ready");
          }}
        />
      </PromptInput>
    </ConversationThread>
  );
}

type Tab = {
  readonly value: string;
  readonly title: string;
  readonly kind: "thread" | "notes";
};

const NOTES: Tab = { value: "notes", title: "Run notes", kind: "notes" };

function threadTab(parent: ConversationMessage): Tab {
  return {
    value: `thread:${parent.id}`,
    title: `Thread: ${textOf(parent).slice(0, 40)}`,
    kind: "thread",
  };
}

function Notes() {
  return (
    <div className="flex flex-col gap-3 p-4 text-sm">
      <h2 className="font-semibold">Run notes</h2>
      <p className="text-muted-foreground">
        Fourteen runs this week. The export step paged through every result
        before filtering, so it finished a little later than usual.
      </p>
    </div>
  );
}

/**
 * The main conversation beside a panel of tabs. A message's replies open its
 * thread as a tab; each thread has its own input, and a reply sent there
 * updates the count under its parent.
 */
function ChatWithThreads({
  messages,
  threads,
  openThread,
  scrollPolicy,
}: {
  readonly messages: readonly ConversationMessage[];
  /** Each thread's replies at first, by parent id. */
  readonly threads: Readonly<Record<string, readonly ConversationMessage[]>>;
  /** A thread open at first, beside the notes tab. */
  readonly openThread?: string;
  readonly scrollPolicy?: ConversationScrollPolicy | undefined;
}) {
  const opened =
    openThread === undefined ? undefined : find(messages, openThread);
  const { tabs, value, open, tabsProps, paneProps } = useTabs<Tab>({
    defaultTabs: opened === undefined ? [] : [NOTES, threadTab(opened)],
    defaultValue: opened === undefined ? null : threadTab(opened).value,
  });
  const [threadReplies, setThreadReplies] = useState(threads);
  const updateReplies = useCallback(
    (parentId: string, update: RepliesUpdate) =>
      setThreadReplies((current) => ({
        ...current,
        [parentId]: update(current[parentId] ?? []),
      })),
    [],
  );
  const [closed, setClosed] = useState(false);
  const [focusRequests, setFocusRequests] = useState<
    Readonly<Record<string, number>>
  >({});
  const shown = closed ? null : value;
  const byValue = new Map(
    messages.map((message) => [threadTab(message).value, message]),
  );
  return (
    <div className="@container relative flex h-[640px] overflow-hidden rounded-lg border border-border bg-background text-foreground">
      <main className="flex min-w-0 flex-1 flex-col">
        <Conversation>
          <ConversationContent aria-label="Conversation">
            {messages.map((message) => {
              const replies = threadReplies[message.id];
              const tab = threadTab(message);
              return (
                <ConversationItem key={message.id} itemId={message.id}>
                  <SampleMessage
                    message={message}
                    footer={
                      message.replies === undefined ||
                      replies === undefined ? undefined : (
                        <MessageReplies
                          replies={{
                            count: replies.length,
                            lastAt:
                              replies.at(-1)?.at ?? message.replies.lastAt,
                          }}
                          now={NOW}
                          aria-expanded={shown === tab.value}
                          onClick={() => {
                            setClosed(false);
                            open(tab);
                            setFocusRequests((current) => ({
                              ...current,
                              [tab.value]: (current[tab.value] ?? 0) + 1,
                            }));
                          }}
                        />
                      )
                    }
                  />
                </ConversationItem>
              );
            })}
          </ConversationContent>
        </Conversation>
      </main>
      {shown === null ? null : (
        <Panel aria-label="Side panel">
          <PanelHandle />
          <PanelHeader className="items-end bg-muted pt-1.5 pb-0">
            <PanelTabs label="Open items" {...tabsProps}>
              {tabs.map((tab) => (
                <PanelTab
                  key={tab.value}
                  value={tab.value}
                  icon={
                    tab.kind === "thread" ? <MessageSquare /> : <FileText />
                  }
                  title={tab.title}
                >
                  {tab.title}
                </PanelTab>
              ))}
            </PanelTabs>
            <PanelActions className="mb-0.5 self-end">
              <PanelClose onClick={() => setClosed(true)} />
            </PanelActions>
          </PanelHeader>
          <PanelContent value={shown} keepMounted>
            {tabs.map((tab) => {
              const parent = byValue.get(tab.value);
              return (
                <PanelPane
                  key={tab.value}
                  value={tab.value}
                  {...paneProps(tab.value)}
                >
                  {parent === undefined ? (
                    <Notes />
                  ) : (
                    <ThreadTab
                      parent={parent}
                      replies={threadReplies[parent.id] ?? []}
                      onRepliesChange={updateReplies}
                      scrollPolicy={scrollPolicy}
                      labelledBy={
                        panelTabIds(tabsProps.idPrefix, tab.value).tab
                      }
                      focusRequest={focusRequests[tab.value] ?? 0}
                    />
                  )}
                </PanelPane>
              );
            })}
          </PanelContent>
        </Panel>
      )}
    </div>
  );
}

const THREADS = withThread.thread
  ? { [withThread.thread.parentId]: withThread.thread.replies }
  : {};

/** A thread open in a tab beside another: send a reply to see it settle. */
export const InPanelTab = () => (
  <ChatWithThreads
    messages={withThread.messages}
    threads={THREADS}
    openThread="thread-2"
  />
);

/** The panel starts closed; the replies under a message open its thread. */
export const OpenFromReplies = () => (
  <ChatWithThreads messages={withThread.messages} threads={THREADS} />
);

/** A thread just started: the parent and no replies yet. */
export const NoReplies = () => (
  <ChatWithThreads
    messages={shortChat.messages}
    threads={{ "short-2": [] }}
    openThread="short-2"
  />
);

/** The thread follows its end as answers arrive instead of settling. */
export const StickPolicy = () => (
  <ChatWithThreads
    messages={withThread.messages}
    threads={THREADS}
    openThread="thread-2"
    scrollPolicy="stick"
  />
);
