import {
  AtSign,
  Check,
  Copy,
  MessageSquare,
  Paperclip,
  SquareSlash,
} from "lucide-react";
import {
  Fragment,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";

import {
  useAttachments,
  type AttachmentItem,
} from "../../src/hooks/use-attachments.js";
import { useCopy } from "../../src/hooks/use-copy.js";
import { useHistoryWindow } from "../../src/hooks/use-history-window.js";
import { useMediaViewer } from "../../src/hooks/use-media-viewer.js";
import { panelTabIds, useTabs } from "../../src/hooks/use-tabs.js";
import type { AttachmentRejection } from "../../src/lib/attachment-limits.js";
import type { PartBlock, PartFile } from "../../src/lib/conversation.js";
import type {
  ConversationMessage,
  ConversationPart,
  ConversationReaction,
  PartImage,
  PartTool,
} from "../../src/lib/conversation.js";
import type { PromptToken } from "../../src/lib/prompt-tokens.js";
import { AttachmentDropZone } from "../../src/ui/attachment-drop-zone.js";
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "../../src/ui/attachments.js";
import {
  Conversation,
  ConversationContent,
  ConversationItem,
  ConversationScrollButton,
  type ConversationScrollPolicy,
} from "../../src/ui/conversation.js";
import { ConversationEarlier } from "../../src/ui/conversation-earlier.js";
import {
  ConversationMap,
  type ConversationMapTurn,
} from "../../src/ui/conversation-map.js";
import { ConversationThread } from "../../src/ui/conversation-thread.js";
import { generatedImageViewerItems } from "../../src/ui/generated-images.js";
import { MediaViewer } from "../../src/ui/media-viewer.js";
import {
  Message,
  MessageAvatar,
  MessageFooter,
  MessageHeader,
  type MessageFrom,
} from "../../src/ui/message.js";
import { MessageAction, MessageActions } from "../../src/ui/message-actions.js";
import { MessageFold } from "../../src/ui/message-fold.js";
import { MessageParts } from "../../src/ui/message-parts.js";
import { MessageReactions } from "../../src/ui/message-reactions.js";
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
  PromptInputSuggestions,
  PromptInputTextarea,
  type PromptInputStatus,
} from "../../src/ui/prompt-input.js";
import {
  PromptInputAddMenu,
  PromptInputModeSelect,
  PromptInputModelSelect,
  PromptInputNote,
  PromptInputToolbar,
  type PromptInputModelOption,
  type PromptInputModeOption,
} from "../../src/ui/prompt-input-toolbar.js";
import type { ToolApprovalDecision } from "../../src/ui/tool-approval.js";
import {
  SAMPLE_NOW,
  assistant,
  generatedImages,
  longChat,
  shortChat,
  toolStorm,
  withThread,
  you,
  type ConversationSample,
} from "./samples/conversations.js";
import { playTurn } from "./samples/play-turn.js";

export default { title: "Chat / Full chat" };

const NOW = Date.parse(SAMPLE_NOW);

function stampedAt(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * The samples each keep their own clock, so laid end to end their times
 * would jump back. Respaced evenly between `startMs` and `NOW`, they read in
 * order after the long history, and none reads as later than now.
 */
function restamp(
  messages: readonly ConversationMessage[],
  startMs: number,
): readonly ConversationMessage[] {
  const step = Math.floor((NOW - startMs) / (messages.length + 1));
  return messages.map((message, index) => ({
    ...message,
    at: stampedAt(startMs + (index + 1) * step),
  }));
}

function threadOf(sample: ConversationSample) {
  if (sample.thread === undefined)
    throw new Error(`the ${sample.title} sample has no thread`);
  return sample.thread;
}

const sampleThread = threadOf(withThread);

/**
 * The long history, then a short exchange that cites its sources, a thread,
 * generated images and a tool storm that ends on a call waiting for
 * approval. The images sample's last turn is still generating, so it is
 * left out and the chat opens at rest.
 */
const RECENT = restamp(
  [
    ...shortChat.messages,
    ...withThread.messages,
    ...generatedImages.messages.slice(0, 6),
    ...toolStorm.messages,
  ],
  Date.parse(longChat.messages.at(-1)?.at ?? SAMPLE_NOW),
);

function findMessage(
  messages: readonly ConversationMessage[],
  id: string,
): ConversationMessage {
  const message = messages.find((candidate) => candidate.id === id);
  if (message === undefined) throw new Error(`no sample message ${id}`);
  return message;
}

const threadParentAt = Date.parse(
  findMessage(RECENT, sampleThread.parentId).at,
);

/** The thread's replies, a few seconds after their parent. */
const THREAD_REPLIES = sampleThread.replies.map((reply, index) => ({
  ...reply,
  at: stampedAt(threadParentAt + (index + 1) * 10_000),
}));

/** The parent's reply summary is derived from the thread's replies as they change. */
const MESSAGES: readonly ConversationMessage[] = [
  ...longChat.messages,
  ...RECENT,
];

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

function fromOf(message: ConversationMessage): MessageFrom {
  if (message.author.id === you.id) return "own";
  return message.author.kind;
}

/** The first line of a message's text, without markdown punctuation. */
function firstLine(message: ConversationMessage): string {
  const line = textOf(message)
    .split("\n")
    .find((candidate) => candidate.trim() !== "");
  return (line ?? "")
    .replace(/[*_`#>]/g, "")
    .replace(/^\s*(?:[-*]|\d+\.)\s+/, "")
    .trim();
}

/** A person's message starts a turn; the first reply with text previews it. */
function turnsOf(
  messages: readonly ConversationMessage[],
): ConversationMapTurn[] {
  const turns: ConversationMapTurn[] = [];
  for (const message of messages) {
    const said = firstLine(message);
    const last = turns.at(-1);
    if (message.author.kind === "person") {
      turns.push({
        id: message.id,
        label: said === "" ? "Shared a file" : said,
      });
    } else if (
      last !== undefined &&
      last.preview === undefined &&
      said !== ""
    ) {
      turns[turns.length - 1] = { ...last, preview: said };
    }
  }
  return turns;
}

/** The person's answer recorded on the call; an approved call has then run. */
function settle(tool: PartTool, decision: ToolApprovalDecision): PartTool {
  const approval = {
    id: tool.approval?.id ?? `approval-${tool.toolCallId}`,
    timeoutAt: tool.approval?.timeoutAt ?? null,
    status: decision.outcome,
    scope: decision.scope,
  };
  const { output: _output, ...rest } = tool;
  return decision.outcome === "approved"
    ? {
        ...rest,
        status: "output-available",
        output: `Ran ${tool.name}`,
        approval,
      }
    : { ...rest, status: "output-denied", approval };
}

function decideCall(
  part: ConversationPart,
  toolCallId: string,
  decision: ToolApprovalDecision,
): ConversationPart {
  if (part.kind === "tool-trace" && part.toolCallId === toolCallId)
    return settle(part, decision);
  if (part.kind === "tool-batch")
    return {
      ...part,
      tools: part.tools.map((tool) =>
        tool.toolCallId === toolCallId ? settle(tool, decision) : tool,
      ),
    };
  return part;
}

function toggleReaction(
  reactions: readonly ConversationReaction[],
  emoji: string,
): readonly ConversationReaction[] {
  return reactions.flatMap((reaction) => {
    if (reaction.emoji !== emoji) return [reaction];
    const count = reaction.count + (reaction.mine ? -1 : 1);
    return count === 0 ? [] : [{ emoji, count, mine: !reaction.mine }];
  });
}

function blockTitle(block: PartBlock["block"]): string {
  const { data } = block;
  if (
    typeof data === "object" &&
    data !== null &&
    "title" in data &&
    typeof data.title === "string"
  )
    return data.title;
  return block.type;
}

type ChatActions = {
  readonly decide: (
    messageId: string,
    toolCallId: string,
    decision: ToolApprovalDecision,
  ) => void;
  readonly openImage: (
    partId: string,
    index: number,
    opener: HTMLElement,
  ) => void;
  readonly react: (messageId: string, emoji: string) => void;
  readonly openThread: (parentId: string) => void;
  /** The thread shown in the panel, by parent id. */
  readonly shownThread: string | null;
};

const ChatActionsContext = createContext<ChatActions | null>(null);

function useChatActions(): ChatActions {
  const actions = useContext(ChatActionsContext);
  if (actions === null) throw new Error("outside the full chat");
  return actions;
}

/**
 * A message's parts as they render. Blocks are the host's to draw; this one
 * shows each as a small card with its title.
 */
function ChatParts({ message }: { readonly message: ConversationMessage }) {
  const { decide, openImage } = useChatActions();
  const own = message.author.id === you.id;
  return (
    <MessageParts
      parts={message.parts}
      renderMarkdown={own ? undefined : markdown}
      onDecide={(tool, decision) =>
        decide(message.id, tool.toolCallId, decision)
      }
      onOpenImage={(part, index, opener) => openImage(part.id, index, opener)}
      renderBlock={(part) => (
        <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-card p-3 text-sm text-card-foreground">
          <p className="font-medium">{blockTitle(part.block)}</p>
          <p className="text-muted-foreground">{part.block.type}</p>
        </div>
      )}
    />
  );
}

function CopyAction({ text }: { readonly text: string }) {
  const { copied, copy } = useCopy();
  return (
    <MessageAction
      label={copied ? "Copied" : "Copy"}
      onClick={() => void copy(text)}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
    </MessageAction>
  );
}

/** One message, the same in the main conversation and in a thread. */
function ChatEntry({
  message,
  newest = false,
  inThread = false,
}: {
  readonly message: ConversationMessage;
  /** The newest answer, which opens unfolded. */
  readonly newest?: boolean;
  readonly inThread?: boolean;
}) {
  const { react, openThread, shownThread } = useChatActions();
  const from = fromOf(message);
  const own = from === "own";
  const text = textOf(message);
  const replies = inThread ? undefined : message.replies;
  const settled = message.status !== "streaming";
  const footer =
    own || inThread ? null : (
      <>
        {message.reactions === undefined ? null : (
          <MessageReactions
            reactions={message.reactions}
            onReact={(emoji) => react(message.id, emoji)}
          />
        )}
        {replies === undefined ? null : (
          <MessageReplies
            replies={replies}
            now={NOW}
            aria-expanded={shownThread === message.id}
            onClick={() => openThread(message.id)}
          />
        )}
        {text === "" || !settled ? null : (
          <MessageActions>
            <CopyAction text={text} />
          </MessageActions>
        )}
      </>
    );
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
      {own ? (
        <ChatParts message={message} />
      ) : (
        <MessageFold length={text.length} defaultOpen={newest}>
          <ChatParts message={message} />
        </MessageFold>
      )}
      {footer === null ? null : <MessageFooter>{footer}</MessageFooter>}
    </Message>
  );
}

/**
 * The log: the latest stretch of history mounted, more as the reader
 * scrolls up, and a map of the mounted turns beside it. Sits inside
 * `Conversation`, which the history window and the map both follow.
 */
function ChatLog({
  messages,
}: {
  readonly messages: readonly ConversationMessage[];
}) {
  const history = useHistoryWindow({
    items: messages,
    windowSize: 60,
    step: 30,
  });
  const newestAnswer = messages.findLast(
    (message) => message.author.kind === "agent",
  )?.id;
  return (
    <>
      <ConversationMap turns={turnsOf(history.items)} />
      <ConversationContent className="[&>[data-slot=conversation-column]]:pl-12">
        <ConversationEarlier
          hasEarlier={history.hasEarlier}
          loading={history.loading}
          stalled={history.stalled}
          onReachStart={history.reachStart}
        />
        {history.items.map((message) => (
          <ConversationItem key={message.id} itemId={message.id}>
            <ChatEntry message={message} newest={message.id === newestAnswer} />
          </ConversationItem>
        ))}
      </ConversationContent>
      <ConversationScrollButton />
    </>
  );
}

const TOKENS: readonly PromptToken[] = [
  {
    id: "reviewer",
    kind: "mention",
    token: "@Reviewer",
    detail: "Checks work before it ships",
  },
  {
    id: "planner",
    kind: "mention",
    token: "@Planner",
    detail: "Breaks a goal into steps",
  },
  {
    id: "summarize",
    kind: "command",
    token: "/summarize",
    detail: "Summarize the thread",
  },
];

const MODELS: readonly PromptInputModelOption[] = [
  { id: "swift", name: "Swift 2", short: "Swift", detail: "Quick answers" },
  {
    id: "deep",
    name: "Deep 4",
    short: "Deep",
    detail: "Careful, slower reasoning",
  },
];

const MODES: readonly PromptInputModeOption[] = [
  { id: "ask", label: "Ask", detail: "Answers without taking action" },
  { id: "agent", label: "Agent", detail: "Acts on your behalf" },
];

const MAX_FILES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function refusal({ file, reason }: AttachmentRejection<File>): string {
  switch (reason) {
    case "too-large":
      return `${file.name} is over 5 MB`;
    case "duplicate":
      return `${file.name} is already attached`;
    case "too-many":
      return `${file.name} is past the limit of ${MAX_FILES}`;
  }
}

/**
 * The message box: files dropped anywhere on it or added from the `+` menu
 * wait above it, and go with the next message.
 */
function Composer({
  status,
  onSend,
  onStop,
}: {
  readonly status: PromptInputStatus;
  readonly onSend: (text: string, files: readonly AttachmentItem[]) => void;
  readonly onStop: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<readonly AttachmentItem[]>([]);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState("agent");
  const [model, setModel] = useState("deep");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const { add, release } = useAttachments({
    attachments,
    maxFiles: MAX_FILES,
    maxFileBytes: MAX_FILE_BYTES,
  });

  const take = (files: Iterable<File> | ArrayLike<File>) => {
    const { accepted, rejected } = add(files);
    setAttachments((current) => [...current, ...accepted]);
    setNotice(rejected.map(refusal).join("; "));
  };
  const startToken = (prefix: "@" | "/") => {
    // A mention starts a word and a command a line, or the prompt would not
    // take it for one and offer its suggestions.
    const [fresh, gap] = prefix === "/" ? [/(^|\n)$/, "\n"] : [/(^|\s)$/, " "];
    setDraft(
      (current) =>
        (fresh.test(current) ? current : `${current}${gap}`) + prefix,
    );
    textarea.current?.focus();
  };
  const send = () => {
    // The sent message shows these previews now, so the hook must not
    // revoke them when they leave the box.
    release(attachments.map((item) => item.id));
    onSend(draft.trim(), attachments);
    setDraft("");
    setAttachments([]);
    setNotice("");
  };

  return (
    <AttachmentDropZone
      onFiles={(files, { folders }) => {
        if (files.length === 0 && folders.length > 0)
          setNotice(`${folders.join(", ")} has no files to add`);
        else take(files);
      }}
      className="flex flex-col gap-2 px-4 pb-4"
    >
      {attachments.length === 0 ? null : (
        <Attachments
          variant="stack"
          total={attachments.length}
          returnFocusTo={textarea}
          className="pt-4"
        >
          {attachments.map((item) => (
            <Attachment key={item.id} data={item}>
              <AttachmentPreview />
              <AttachmentInfo />
              <AttachmentRemove
                onClick={() =>
                  setAttachments((current) =>
                    current.filter((held) => held.id !== item.id),
                  )
                }
              />
            </Attachment>
          ))}
        </Attachments>
      )}
      <input
        ref={picker}
        type="file"
        multiple
        hidden
        aria-label="Add files"
        onChange={(event) => {
          const { files } = event.currentTarget;
          if (files !== null) take(files);
          event.currentTarget.value = "";
        }}
      />
      <PromptInput
        value={draft}
        onValueChange={setDraft}
        onSubmit={send}
        canSubmit={draft.trim() !== "" || attachments.length > 0}
        tokens={TOKENS}
        status={status}
      >
        <PromptInputSuggestions />
        <PromptInputTextarea
          ref={textarea}
          aria-label="Message"
          placeholder="Ask an agent… (@ to mention, / for commands)"
        />
        <PromptInputToolbar>
          <PromptInputAddMenu
            items={[
              {
                id: "files",
                label: "Add files or photos",
                icon: <Paperclip />,
                onSelect: () => picker.current?.click(),
              },
              {
                id: "mention",
                label: "Mention an agent",
                icon: <AtSign />,
                onSelect: () => startToken("@"),
              },
              {
                id: "command",
                label: "Use a command",
                icon: <SquareSlash />,
                onSelect: () => startToken("/"),
              },
            ]}
          />
          <PromptInputModeSelect
            modes={MODES}
            value={mode}
            onValueChange={setMode}
          />
          <div className="ms-auto flex items-center gap-1">
            <PromptInputModelSelect
              models={MODELS}
              value={model}
              onValueChange={setModel}
            />
            <PromptInputSubmit onStop={onStop} />
          </div>
        </PromptInputToolbar>
      </PromptInput>
      <p role="status" className="min-h-4 text-xs text-muted-foreground">
        {notice}
      </p>
      <PromptInputNote>
        Agents can make mistakes. Check important work.
      </PromptInputNote>
    </AttachmentDropZone>
  );
}

const ANSWERS = [
  "Done. I read what you sent and updated the summary on the workflow.",
  "I checked the latest runs against it. Nothing else needs your sign-off.",
  "Noted. I'll fold this into next week's report and flag anything that changes.",
];

/** The answer to the reader's `count`th message, replayed as it arrives. */
function answerFor(count: number, files: number): ConversationMessage {
  const id = `answer-${count}`;
  return {
    id,
    author: assistant,
    at: SAMPLE_NOW,
    status: "sent",
    parts: [
      {
        kind: "reasoning",
        text: "Read what came with the message, then check the latest runs before answering.",
        durationMs: 2_400,
      },
      {
        kind: "tool-trace",
        toolCallId: `${id}-read`,
        name: files > 0 ? "files__read" : "runs__list",
        status: "output-available",
        input: files > 0 ? { files } : { limit: 20 },
        output: files > 0 ? `Read ${files} files` : "20 runs",
      },
      {
        kind: "text",
        text: ANSWERS[(count - 1) % ANSWERS.length] ?? "",
      },
    ],
  };
}

/** A call cut off by Stop: it never finished, so it reads as failed. */
function stopTool(tool: PartTool): PartTool {
  return tool.status === "running" || tool.status === "pending"
    ? { ...tool, status: "error", output: "Stopped" }
    : tool;
}

/** An answer as it stood when the reader pressed Stop, no longer arriving. */
function stopped(message: ConversationMessage): ConversationMessage {
  return {
    ...message,
    status: "sent",
    parts: message.parts.map((part) =>
      part.kind === "tool-trace"
        ? stopTool(part)
        : part.kind === "tool-batch"
          ? { ...part, tools: part.tools.map(stopTool) }
          : part,
    ),
  };
}

function upsert(
  messages: readonly ConversationMessage[],
  frame: ConversationMessage,
): readonly ConversationMessage[] {
  return messages.some((message) => message.id === frame.id)
    ? messages.map((message) => (message.id === frame.id ? frame : message))
    : [...messages, frame];
}

const THREAD_ANSWER =
  "Added it to the follow-ups, with an owner and a due date.";

/**
 * A thread's tab: the parent, its replies and the thread's own input. Kept
 * mounted while the panel shows something else, so the draft stays. The
 * replies live with the chat, so the count under the parent keeps up.
 */
function ThreadTab({
  parent,
  replies,
  onRepliesChange,
  labelledBy,
  focusRequest,
  scrollPolicy,
}: {
  readonly parent: ConversationMessage;
  readonly replies: readonly ConversationMessage[];
  readonly onRepliesChange: Dispatch<
    SetStateAction<readonly ConversationMessage[]>
  >;
  /** The tab that shows the thread, which names its log. */
  readonly labelledBy: string;
  /** Bumped each time the reader opens this thread, to focus its input. */
  readonly focusRequest: number;
  readonly scrollPolicy: ConversationScrollPolicy;
}) {
  const [draft, setDraft] = useState("");
  const [sentId, setSentId] = useState<string>();
  const [status, setStatus] = useState<PromptInputStatus>("ready");
  const input = useRef<HTMLTextAreaElement>(null);
  const stop = useRef<(() => void) | null>(null);
  const streamingId = useRef<string | null>(null);
  const stopAnswer = useCallback(() => {
    stop.current?.();
    const id = streamingId.current;
    streamingId.current = null;
    onRepliesChange((current) =>
      current.map((reply) =>
        reply.id === id && reply.status === "streaming"
          ? stopped(reply)
          : reply,
      ),
    );
  }, [onRepliesChange]);
  // Closing the tab mid-answer stops it where it stands.
  useEffect(() => stopAnswer, [stopAnswer]);
  useEffect(() => {
    if (focusRequest > 0) input.current?.focus();
  }, [focusRequest]);

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
      parts: [{ kind: "text", text: THREAD_ANSWER }],
    };
    onRepliesChange((current) => [...current, sent]);
    setSentId(sent.id);
    setDraft("");
    setStatus("streaming");
    streamingId.current = answer.id;
    stop.current = playTurn(
      answer,
      (frame) => {
        onRepliesChange((current) => upsert(current, frame));
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
      renderMessage={(message) => <ChatEntry message={message} inThread />}
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

type Tab = { readonly value: string; readonly title: string };

function threadTab(parent: ConversationMessage): Tab {
  return {
    value: `thread:${parent.id}`,
    title: `Thread: ${firstLine(parent).slice(0, 40)}`,
  };
}

/** The image parts' viewer items in chat order, and where each part starts. */
function viewerItemsOf(messages: readonly ConversationMessage[]) {
  const offsets = new Map<string, number>();
  const parts = messages
    .flatMap((message) => message.parts)
    .filter((part): part is PartImage => part.kind === "image");
  const items = parts.flatMap((part, index) => {
    const start = parts
      .slice(0, index)
      .reduce((total, earlier) => total + earlier.images.length, 0);
    offsets.set(part.id, start);
    return generatedImageViewerItems(part);
  });
  return { items, offsets };
}

/**
 * The whole chat from the samples: the conversation with its history
 * window and map, messages with their agent steps, images and sources, the
 * message box with its toolbar and attachments, and a panel holding a
 * thread in a tab. Nothing moves until the reader acts: sending streams an
 * answer, and deciding the waiting call folds it into the run before it.
 */
function FullChat({
  scrollPolicy,
}: {
  readonly scrollPolicy: ConversationScrollPolicy;
}) {
  const [messages, setMessages] = useState(MESSAGES);
  const [sentId, setSentId] = useState<string>();
  const [status, setStatus] = useState<PromptInputStatus>("ready");
  const [sends, setSends] = useState(0);
  const stop = useRef<(() => void) | null>(null);
  const streamingId = useRef<string | null>(null);
  // Previews handed over from the message box; the sent messages show them
  // until the chat goes away.
  const released = useRef<string[]>([]);
  useEffect(
    () => () => {
      stop.current?.();
      for (const url of released.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const parent = findMessage(MESSAGES, sampleThread.parentId);
  const { tabs, value, open, tabsProps, paneProps } = useTabs<Tab>({
    defaultTabs: [threadTab(parent)],
  });
  const [closed, setClosed] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [threadReplies, setThreadReplies] =
    useState<readonly ConversationMessage[]>(THREAD_REPLIES);
  // The parent's reply summary follows the thread as replies arrive.
  const shownMessages = useMemo(
    () =>
      messages.map((message) =>
        message.id === parent.id
          ? {
              ...message,
              replies: {
                count: threadReplies.length,
                lastAt: threadReplies.at(-1)?.at ?? message.at,
              },
            }
          : message,
      ),
    [messages, parent.id, threadReplies],
  );
  const shown = closed ? null : value;

  const { items, offsets } = useMemo(() => viewerItemsOf(messages), [messages]);
  const viewer = useMediaViewer({ items });

  const actions: ChatActions = {
    decide: (messageId, toolCallId, decision) =>
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                parts: message.parts.map((part) =>
                  decideCall(part, toolCallId, decision),
                ),
              }
            : message,
        ),
      ),
    react: (messageId, emoji) =>
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? {
                ...message,
                reactions: toggleReaction(message.reactions ?? [], emoji),
              }
            : message,
        ),
      ),
    openImage: (partId, index, opener) =>
      viewer.open((offsets.get(partId) ?? 0) + index, opener),
    openThread: (parentId) => {
      setClosed(false);
      open(threadTab(findMessage(MESSAGES, parentId)));
      setFocusRequest((count) => count + 1);
    },
    shownThread: shown === threadTab(parent).value ? parent.id : null,
  };

  const send = (text: string, files: readonly AttachmentItem[]) => {
    const count = sends + 1;
    setSends(count);
    released.current.push(
      ...files.flatMap((file) => (file.url === undefined ? [] : [file.url])),
    );
    const sent: ConversationMessage = {
      id: `sent-${count}`,
      author: you,
      at: SAMPLE_NOW,
      status: "sent",
      parts: [
        ...(text === "" ? [] : [{ kind: "text" as const, text }]),
        ...files.map((file): PartFile => ({
          kind: "file",
          name: file.name,
          mediaType: file.mediaType,
          ...(file.url === undefined ? {} : { url: file.url }),
        })),
      ],
    };
    const answer = answerFor(count, files.length);
    setMessages((current) => [...current, sent]);
    setSentId(sent.id);
    setStatus("streaming");
    streamingId.current = answer.id;
    stop.current = playTurn(
      answer,
      (frame) => {
        setMessages((current) => upsert(current, frame));
        if (frame === answer) {
          streamingId.current = null;
          setStatus("ready");
        }
      },
      { stepMs: 120 },
    );
  };

  const stopAnswer = () => {
    stop.current?.();
    const id = streamingId.current;
    streamingId.current = null;
    setMessages((current) =>
      current.map((message) =>
        message.id === id && message.status === "streaming"
          ? stopped(message)
          : message,
      ),
    );
    setStatus("ready");
  };

  return (
    <ChatActionsContext.Provider value={actions}>
      <div className="@container relative flex h-[640px] overflow-hidden rounded-lg border border-border bg-background text-foreground">
        <main className="flex min-w-0 flex-1 flex-col">
          <Conversation scrollPolicy={scrollPolicy} sentId={sentId}>
            <ChatLog messages={shownMessages} />
          </Conversation>
          <Composer status={status} onSend={send} onStop={stopAnswer} />
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
                    icon={<MessageSquare />}
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
              {tabs.map((tab) => (
                <PanelPane
                  key={tab.value}
                  value={tab.value}
                  {...paneProps(tab.value)}
                >
                  <ThreadTab
                    parent={parent}
                    replies={threadReplies}
                    onRepliesChange={setThreadReplies}
                    labelledBy={panelTabIds(tabsProps.idPrefix, tab.value).tab}
                    focusRequest={focusRequest}
                    scrollPolicy={scrollPolicy}
                  />
                </PanelPane>
              ))}
            </PanelContent>
          </Panel>
        )}
      </div>
      <MediaViewer viewer={viewer} />
    </ChatActionsContext.Provider>
  );
}

/** The sent message glides to the top and the answer writes in below it. */
export const Settle = () => <FullChat scrollPolicy="settle" />;

/** The view follows the end as the answer arrives, until the reader scrolls away. */
export const Stick = () => <FullChat scrollPolicy="stick" />;
