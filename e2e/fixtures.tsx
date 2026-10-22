import { useEffect, useLayoutEffect, useRef, useState, Profiler } from "react";
import type { ReactNode } from "react";

import {
  AuthLayout,
  Button,
  Conversation,
  ConversationContent,
  ConversationItem,
  ConversationScrollButton,
  DictationStatusLine,
  FilterChip,
  Select,
  ShimmerText,
  ThemeProvider,
  ThemeToggle,
  ThinkingMark,
  type ConversationScrollPolicy,
  useConversation,
  PromptInput,
  PromptInputSubmit,
  PromptInputSuggestions,
  PromptInputTextarea,
  type PromptInputStatus,
  type PromptToken,
  Panel,
  PanelActions,
  PanelClose,
  PanelContent,
  PanelHandle,
  PanelHeader,
  PanelPane,
  PromptInputToolbar,
  PromptInputAddMenu,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModeSelect,
  PromptInputFloat,
  PromptInputContext,
  PromptInputNote,
  PanelTab,
  PanelTabAdd,
  PanelTabs,
  useTabs,
  MessageParts,
  type ConversationPart,
  type PartTool,
  type ToolApprovalRecord,
  Message,
  MessageAction,
  MessageActionMenu,
  MessageActions,
  MessageContent,
  MessageFold,
  MessageFooter,
  ConversationEarlier,
  useHistoryWindow,
  ConversationMap,
  type ConversationMapTurn,
  Attachment,
  AttachmentDropZone,
  AttachmentInfo,
  AttachmentMore,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
  type AttachmentItem,
  type AttachmentRejection,
  useAttachments,
  GeneratedImages,
  generatedImageViewerItems,
  MediaViewer,
  useMediaViewer,
  type ConversationImage,
  type PartImage,
  ConversationThread,
  MessageReplies,
  type ConversationMessage,
  type ConversationParticipant,
} from "@corbits/react-ui";
import {
  CommandPalette,
  type CommandPaletteGroup,
} from "@corbits/react-ui/ui/command-palette";

const GROUPS: CommandPaletteGroup[] = [
  {
    id: "pages",
    heading: "Pages",
    items: [
      { id: "settings", title: "Settings" },
      { id: "billing", title: "Billing" },
      { id: "usage", title: "Usage" },
    ],
  },
];

function useEventLog() {
  const [events, setEvents] = useState<string[]>([]);
  const log = <output aria-label="Events">{events.join(",")}</output>;
  return {
    log,
    record: (event: string) => setEvents((previous) => [...previous, event]),
  };
}

function Palette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { log, record } = useEventLog();
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open palette</Button>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        query={query}
        onQueryChange={setQuery}
        groups={GROUPS}
        onSelect={(id) => {
          record(id);
          setOpen(false);
        }}
      />
      {log}
    </>
  );
}

function SelectField() {
  const [value, setValue] = useState("a");
  const { log, record } = useEventLog();
  return (
    <>
      <Select
        aria-label="Letter"
        aria-invalid
        aria-describedby="letter-error"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          record(event.target.value);
        }}
      >
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>
      <Select aria-label="Locked" value="a" disabled onChange={() => {}}>
        <option value="a">A</option>
      </Select>
      {log}
    </>
  );
}

function Chip() {
  const [selected, setSelected] = useState(false);
  return (
    <FilterChip selected={selected} onClick={() => setSelected(!selected)}>
      Live
    </FilterChip>
  );
}

const SWATCH_TOKENS = [
  "background",
  "foreground",
  "card",
  "primary",
  "muted",
  "border",
  "destructive",
];

/** Solid token fills with no text, so screenshots match across platforms. */
function Swatches() {
  return (
    <div data-testid="swatches" style={{ display: "flex", width: 280 }}>
      {SWATCH_TOKENS.map((token) => (
        <div
          key={token}
          style={{ width: 40, height: 40, background: `var(--${token})` }}
        />
      ))}
    </div>
  );
}

type ScenarioRow = {
  readonly id: string;
  readonly from: "reader" | "agent";
  /** Height in 24px lines, so positions are exact on every platform. */
  readonly lines: number;
};

function historyRows(prefix: string, count: number): ScenarioRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}${index}`,
    from: index % 2 === 0 ? "reader" : "agent",
    lines: 1 + (index % 3),
  }));
}

function ConversationControls({
  onSend,
  onWrite,
  onEarlier,
  onTrim,
}: {
  onSend: () => void;
  onWrite: () => void;
  onEarlier: () => void;
  onTrim: () => void;
}) {
  const { captureAnchor, restoreAnchor } = useConversation();
  const [loads, setLoads] = useState(0);
  useLayoutEffect(() => {
    if (loads > 0) restoreAnchor();
  }, [loads, restoreAnchor]);
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Button onClick={onSend}>Send</Button>
      <Button onClick={onWrite}>Write</Button>
      <Button
        onClick={() => {
          captureAnchor();
          onEarlier();
          setLoads((count) => count + 1);
        }}
      >
        Load earlier
      </Button>
      <Button onClick={onTrim}>Trim</Button>
    </div>
  );
}

/** History arrives after mount, as it does from a server. */
function ConversationScenario({
  policy,
}: {
  policy: ConversationScrollPolicy;
}) {
  const [rows, setRows] = useState<readonly ScenarioRow[]>([]);
  const [sentId, setSentId] = useState<string>();
  const [sends, setSends] = useState(0);
  const [pages, setPages] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setRows(historyRows("h", 30)), 50);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 400,
        width: 600,
      }}
    >
      <Conversation scrollPolicy={policy} sentId={sentId}>
        <ConversationContent>
          {rows.map((row) => (
            <ConversationItem key={row.id} itemId={row.id} data-testid={row.id}>
              <p style={{ height: row.lines * 24, margin: 0 }}>
                {row.from === "reader" ? "Reader" : "Agent"} {row.id}
              </p>
            </ConversationItem>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
        <ConversationControls
          onSend={() => {
            const id = `s${sends}`;
            setSends(sends + 1);
            setRows((previous) => [
              ...previous,
              { id, from: "reader", lines: 1 },
              { id: `a${sends}`, from: "agent", lines: 1 },
            ]);
            setSentId(id);
          }}
          onWrite={() =>
            setRows((previous) =>
              previous.map((row, index) =>
                index === previous.length - 1
                  ? { ...row, lines: row.lines + 3 }
                  : row,
              ),
            )
          }
          onEarlier={() => {
            setPages(pages + 1);
            setRows((previous) => [
              ...historyRows(`p${pages}-`, 10),
              ...previous,
            ]);
          }}
          onTrim={() => setRows((previous) => previous.slice(5))}
        />
      </Conversation>
    </div>
  );
}

/** One frame of a recorded glide: where the tracked item's top sits below
 * the top of the view, after the glide has written that frame. */
type GlideFrame = { readonly t: number; readonly offset: number };

type GlideLog = {
  readonly frames: GlideFrame[];
  /** When the content above changed, on the frames' clock. */
  changedAt: number | null;
  done: boolean;
};

/** Records `item`'s offset every frame until the view has been still for ten
 * frames. Started after the glide, so each frame runs after the glide's. */
function recordGlide(scroller: HTMLElement, item: HTMLElement): GlideLog {
  const log: GlideLog = { frames: [], changedAt: null, done: false };
  let still = 0;
  let last = Number.NaN;
  const tick = (t: number) => {
    log.frames.push({
      t,
      offset:
        item.getBoundingClientRect().top - scroller.getBoundingClientRect().top,
    });
    still = scroller.scrollTop === last ? still + 1 : 0;
    last = scroller.scrollTop;
    if (still < 10 && log.frames.length < 300) requestAnimationFrame(tick);
    else log.done = true;
  };
  requestAnimationFrame(tick);
  Object.assign(window, { glideLog: log });
  return log;
}

function GlideControls({
  onLoad,
  onTrim,
}: {
  onLoad: () => void;
  onTrim: () => void;
}) {
  const {
    items,
    scrollContainer,
    scrollToItem,
    scrollToEnd,
    captureAnchor,
    restoreAnchor,
  } = useConversation();
  const [loads, setLoads] = useState(0);
  useLayoutEffect(() => {
    if (loads > 0) restoreAnchor();
  }, [loads, restoreAnchor]);
  /** Glides, then changes the content above while the glide is in flight. */
  const glideThen = (glide: () => void, id: string, change: () => void) => {
    const scroller = scrollContainer();
    const item = items.get(id);
    if (scroller === null || item === undefined) return;
    glide();
    const log = recordGlide(scroller, item);
    setTimeout(() => {
      log.changedAt = performance.now();
      change();
    }, 120);
  };
  const topmostInView = () => {
    const top = scrollContainer()?.getBoundingClientRect().top ?? 0;
    return (
      items
        .ids()
        .find(
          (id) =>
            (items.get(id)?.getBoundingClientRect().bottom ?? 0) > top + 1,
        ) ?? ""
    );
  };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Button
        onClick={() =>
          glideThen(
            () => scrollToItem("h3"),
            "h3",
            () => {
              captureAnchor();
              onLoad();
              setLoads((count) => count + 1);
            },
          )
        }
      >
        Glide up and load
      </Button>
      <Button onClick={() => glideThen(scrollToEnd, topmostInView(), onTrim)}>
        Glide down and trim
      </Button>
    </div>
  );
}

/** Content changing above the view while a glide is in flight. */
function ConversationGlideScenario() {
  const [rows, setRows] = useState(() => historyRows("h", 30));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 400,
        width: 600,
      }}
    >
      <Conversation>
        <ConversationContent>
          {rows.map((row) => (
            <ConversationItem key={row.id} itemId={row.id} data-testid={row.id}>
              <p style={{ height: row.lines * 24, margin: 0 }}>
                {row.from === "reader" ? "Reader" : "Agent"} {row.id}
              </p>
            </ConversationItem>
          ))}
        </ConversationContent>
        <GlideControls
          onLoad={() =>
            setRows((previous) => [...historyRows("p", 10), ...previous])
          }
          onTrim={() => setRows((previous) => previous.slice(12))}
        />
      </Conversation>
    </div>
  );
}

const PROMPT_TOKENS: PromptToken[] = [
  { id: "ada", kind: "mention", token: "@Ada", detail: "Research agent" },
  { id: "adam", kind: "mention", token: "@Adam", detail: "Review agent" },
  { id: "brief", kind: "command", token: "/brief", detail: "Summarize" },
];

/** Records every submit with its text, and every stop. "Reply" puts the
 * prompt into the streaming state a host is in while an agent answers. */
function Prompt() {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<PromptInputStatus>("ready");
  const { log, record } = useEventLog();
  return (
    <div style={{ width: 480, paddingTop: 160 }}>
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={() => record(`submit:${value}`)}
        tokens={PROMPT_TOKENS}
        status={status}
      >
        <PromptInputSuggestions />
        <PromptInputTextarea />
        <PromptInputSubmit
          onStop={() => {
            record("stop");
            setStatus("ready");
          }}
        />
      </PromptInput>
      <Button onClick={() => setStatus("streaming")}>Reply</Button>
      {log}
    </div>
  );
}

/** A host that sends attachments with the text: "Attach file" toggles one,
 * and with it attached there is something to send even with no text. */
function PromptWithAttachment() {
  const [value, setValue] = useState("");
  const [attached, setAttached] = useState(false);
  const { log, record } = useEventLog();
  return (
    <div style={{ width: 480 }}>
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={() =>
          record(`submit:${value}${attached ? "+attachment" : ""}`)
        }
        canSubmit={value.trim() !== "" || attached}
      >
        <PromptInputTextarea />
        <PromptInputSubmit />
      </PromptInput>
      <Button aria-pressed={attached} onClick={() => setAttached(!attached)}>
        Attach file
      </Button>
      {log}
    </div>
  );
}

/** Counts React commits on `<body data-commits>` without rendering anything. */
function countCommit() {
  const body = document.body;
  body.dataset["commits"] = String(Number(body.dataset["commits"] ?? 0) + 1);
}

/** A tall filler, so each pane scrolls. */
function Filler({ label }: { label: string }) {
  return (
    <ol>
      {Array.from({ length: 60 }, (_, index) => (
        <li key={index} style={{ padding: 8 }}>
          {label} line {index + 1}
        </li>
      ))}
    </ol>
  );
}

function PanelScenario() {
  const [open, setOpen] = useState(true);
  const [shown, setShown] = useState("notes");
  const [width, setWidth] = useState<number | null>(null);
  return (
    <Profiler id="panel" onRender={countCommit}>
      <div
        data-testid="row"
        style={{
          position: "relative",
          display: "flex",
          height: 600,
          containerType: "inline-size",
        }}
      >
        <main data-testid="main" style={{ flex: 1, minWidth: 0 }}>
          <Button onClick={() => setOpen(true)}>Open panel</Button>
          <Button onClick={() => setShown("notes")}>Show notes</Button>
          <Button onClick={() => setShown("draft")}>Show draft</Button>
          <output aria-label="Width">
            {width === null ? "default" : String(width)}
          </output>
        </main>
        {open ? (
          <Panel aria-label="Side panel" width={width} onWidthChange={setWidth}>
            <PanelHandle />
            <PanelHeader>
              <PanelActions>
                <PanelClose onClick={() => setOpen(false)} />
              </PanelActions>
            </PanelHeader>
            <PanelContent value={shown} keepMounted>
              <PanelPane value="notes" data-testid="notes-pane">
                <input aria-label="Notes field" />
                <Filler label="Notes" />
              </PanelPane>
              <PanelPane value="draft" data-testid="draft-pane">
                <textarea aria-label="Draft field" />
                <Filler label="Draft" />
              </PanelPane>
            </PanelContent>
          </Panel>
        ) : null}
      </div>
    </Profiler>
  );
}

/** Every toolbar part, with each choice and action recorded. "Toggle
 * toolbar" takes the toolbar out, to compare layouts; clearing the reply
 * chip removes it and "Reply to Ada" brings it back. */
function PromptToolbarScenario() {
  const [value, setValue] = useState("");
  const [model, setModel] = useState("deep");
  const [mode, setMode] = useState("ask");
  const [toolbar, setToolbar] = useState(true);
  const [replying, setReplying] = useState(true);
  const { log, record } = useEventLog();
  return (
    <div style={{ width: 520, paddingTop: 280 }}>
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={() => record(`submit:${value}`)}
        tokens={PROMPT_TOKENS}
      >
        {replying ? (
          <PromptInputFloat>
            <PromptInputContext
              label="Replying to"
              detail="Ada"
              onClear={() => setReplying(false)}
            />
          </PromptInputFloat>
        ) : null}
        <PromptInputSuggestions />
        <PromptInputTextarea />
        {toolbar ? (
          <PromptInputToolbar>
            <PromptInputAddMenu
              items={[
                {
                  id: "files",
                  label: "Add files",
                  onSelect: () => record("add:files"),
                },
                {
                  id: "link",
                  label: "Add a link",
                  disabled: true,
                  onSelect: () => record("add:link"),
                },
                {
                  id: "mention",
                  label: "Mention an agent",
                  onSelect: () => record("add:mention"),
                },
              ]}
            />
            <PromptInputModeSelect
              modes={[
                { id: "ask", label: "Ask", detail: "Answers only" },
                { id: "plan", label: "Plan", detail: "Drafts steps" },
                { id: "agent", label: "Agent", detail: "Takes action" },
              ]}
              value={mode}
              onValueChange={(id) => {
                record(`mode:${id}`);
                setMode(id);
              }}
            />
            <PromptInputModelSelect
              className="ms-auto"
              models={[
                { id: "swift", name: "Swift 2", short: "Swift", group: "Fast" },
                { id: "lite", name: "Lite 1", short: "Lite", group: "Fast" },
                {
                  id: "deep",
                  name: "Deep 4",
                  short: "Deep",
                  group: "Thorough",
                },
              ]}
              value={model}
              onValueChange={(id) => {
                record(`model:${id}`);
                setModel(id);
              }}
            />
            <PromptInputButton
              aria-label="Voice"
              onClick={() => record("voice")}
            >
              V
            </PromptInputButton>
            <PromptInputSubmit />
          </PromptInputToolbar>
        ) : (
          <PromptInputSubmit />
        )}
      </PromptInput>
      <PromptInputNote>Agents can make mistakes.</PromptInputNote>
      <Button onClick={() => setToolbar((shown) => !shown)}>
        Toggle toolbar
      </Button>
      <Button onClick={() => setReplying(true)}>Reply to Ada</Button>
      {log}
    </div>
  );
}

type TabScenarioItem = { readonly value: string; readonly title: string };

const TAB_ITEMS: readonly TabScenarioItem[] = [
  { value: "alpha", title: "Alpha" },
  { value: "beta", title: "Beta" },
  { value: "gamma", title: "Gamma" },
  { value: "delta", title: "Delta" },
];

function PanelTabsScenario() {
  const { tabs, value, open, tabsProps, paneProps } = useTabs<TabScenarioItem>({
    defaultTabs: TAB_ITEMS,
  });
  const [added, setAdded] = useState(0);
  const openMore = (count: number) => {
    for (let index = 1; index <= count; index += 1) {
      open({
        value: `extra-${added + index}`,
        title: `Extra ${added + index}`,
      });
    }
    setAdded(added + count);
  };
  return (
    <div
      data-testid="row"
      style={{
        position: "relative",
        display: "flex",
        height: 600,
        containerType: "inline-size",
      }}
    >
      <main data-testid="main" style={{ flex: 1, minWidth: 0 }}>
        <Button onClick={() => openMore(12)}>Open twelve more</Button>
        <output aria-label="Order">
          {tabs.map((tab) => tab.value).join(",")}
        </output>
        <output aria-label="Selected">{value ?? "none"}</output>
      </main>
      {value === null ? null : (
        <Panel aria-label="Side panel">
          <PanelHeader className="items-end bg-muted pt-1.5 pb-0">
            <PanelTabs label="Open items" {...tabsProps}>
              {tabs.map((tab) => (
                <PanelTab key={tab.value} value={tab.value}>
                  {tab.title}
                </PanelTab>
              ))}
            </PanelTabs>
            <PanelTabAdd onClick={() => openMore(1)} />
          </PanelHeader>
          <PanelContent value={value} keepMounted>
            {tabs.map((tab) => (
              <PanelPane
                key={tab.value}
                value={tab.value}
                {...paneProps(tab.value)}
              >
                {tab.title} pane
              </PanelPane>
            ))}
          </PanelContent>
        </Panel>
      )}
    </div>
  );
}

/** A call's execution status once a decision is recorded on it. */
function decidedStatus(approval: ToolApprovalRecord): PartTool["status"] {
  if (approval.status === "pending") return "approval-requested";
  return approval.status === "approved" ? "output-available" : "output-denied";
}

function pendingApproval(id: string): ToolApprovalRecord {
  return { id, status: "pending", scope: null, timeoutAt: null };
}

// A host's view of one agent turn: a finished draft, then a send waiting on a
// person. Deciding records the outcome on the call, which `MessageParts` then
// folds into the run before it.
function ToolApprovalScenario() {
  const { log, record } = useEventLog();
  const [approval, setApproval] = useState(pendingApproval("approval-1"));
  const parts: PartTool[] = [
    {
      kind: "tool-trace",
      toolCallId: "draft",
      name: "mail__draft",
      status: "output-available",
      output: "Draft ready",
    },
    {
      kind: "tool-trace",
      toolCallId: "send",
      name: "mail__send",
      status: decidedStatus(approval),
      input: { to: "team" },
      approval,
    },
  ];
  return (
    <>
      <Message from="agent" aria-label="Agent">
        <MessageParts
          parts={parts}
          onDecide={(_, decision) => {
            record(`${decision.outcome}:${decision.scope}`);
            setApproval((current) => ({
              ...current,
              status: decision.outcome,
              scope: decision.scope,
            }));
          }}
        />
      </Message>
      {log}
    </>
  );
}

const BATCH_CALLS = ["notice", "totals", "calendar"] as const;

// Three calls that ran at once after a finished read, two of them waiting on
// a person. Each decision is recorded on its call; the batch folds into the
// run once none is left waiting.
function ToolBatchApprovalScenario() {
  const [approvals, setApprovals] = useState<
    Record<string, ToolApprovalRecord>
  >({
    notice: pendingApproval("approval-notice"),
    calendar: pendingApproval("approval-calendar"),
  });
  const parts: ConversationPart[] = [
    {
      kind: "tool-trace",
      toolCallId: "read",
      name: "files__read",
      status: "output-available",
      output: "Read 3 files",
    },
    {
      kind: "tool-batch",
      id: "batch",
      tools: BATCH_CALLS.map((name): PartTool => {
        const approval = approvals[name];
        return approval === undefined
          ? {
              kind: "tool-trace",
              toolCallId: name,
              name: `send__${name}`,
              status: "output-available",
              output: "Sent",
            }
          : {
              kind: "tool-trace",
              toolCallId: name,
              name: `send__${name}`,
              status: decidedStatus(approval),
              input: { to: "team" },
              approval,
            };
      }),
    },
  ];
  return (
    <Message from="agent" aria-label="Agent">
      <MessageParts
        parts={parts}
        onDecide={(tool, decision) =>
          setApprovals((current) => {
            const approval = current[tool.toolCallId];
            if (approval === undefined) return current;
            return {
              ...current,
              [tool.toolCallId]: {
                ...approval,
                status: decision.outcome,
                scope: decision.scope,
              },
            };
          })
        }
      />
    </Message>
  );
}

/** A long answer: 40 paragraphs of fixed-height lines, past the fold. */
const FOLD_PARAGRAPHS = Array.from(
  { length: 40 },
  (_, index) => `Paragraph ${index + 1} of a long answer.`,
);
const FOLD_LENGTH = 10_000;

function FoldedAnswer() {
  return (
    <Message from="agent" data-testid="long-answer">
      <MessageFold length={FOLD_LENGTH}>
        <MessageContent>
          {FOLD_PARAGRAPHS.map((text) => (
            <p key={text} style={{ height: 48, margin: 0 }}>
              {text}
            </p>
          ))}
        </MessageContent>
      </MessageFold>
    </Message>
  );
}

/** A long answer between other rows, in a plain scroll container. */
function MessageFoldScenario() {
  return (
    <div
      data-testid="scroller"
      style={{ height: 400, width: 600, overflowY: "auto" }}
    >
      <p style={{ height: 600, margin: 0 }}>Before</p>
      <FoldedAnswer />
      <p style={{ height: 600, margin: 0 }}>After</p>
    </div>
  );
}

/** The same answer inside a conversation, which anchors its own scrolling. */
function MessageFoldConversationScenario({
  policy,
}: {
  policy: ConversationScrollPolicy;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 400,
        width: 600,
      }}
    >
      <Conversation scrollPolicy={policy}>
        <ConversationContent data-testid="scroller">
          {historyRows("h", 10).map((row) => (
            <ConversationItem key={row.id} itemId={row.id}>
              <p style={{ height: row.lines * 24, margin: 0 }}>Row {row.id}</p>
            </ConversationItem>
          ))}
          <ConversationItem itemId="long">
            <FoldedAnswer />
          </ConversationItem>
          {historyRows("t", 10).map((row) => (
            <ConversationItem key={row.id} itemId={row.id}>
              <p style={{ height: row.lines * 24, margin: 0 }}>Row {row.id}</p>
            </ConversationItem>
          ))}
        </ConversationContent>
      </Conversation>
    </div>
  );
}

function ActionRow({ record }: { record: (event: string) => void }) {
  return (
    <MessageActions>
      <MessageAction label="Copy" onClick={() => record("copy")} />
      <MessageActionMenu>
        <MessageAction label="Pin" onClick={() => record("pin")} />
        <MessageAction label="Copy link" onClick={() => record("link")} />
        <MessageAction label="Report" onClick={() => record("report")} />
      </MessageActionMenu>
    </MessageActions>
  );
}

/** An action row at the top of the page, and one at the foot of a short
 * scroll container where a menu opening downwards would be clipped. */
function MessageActionsScenario() {
  const { log, record } = useEventLog();
  return (
    <div style={{ width: 480 }}>
      <Message from="agent" data-testid="top">
        <MessageContent text="An answer with actions." />
        <MessageFooter>
          <ActionRow record={record} />
        </MessageFooter>
      </Message>
      <button type="button">After</button>
      <div
        data-testid="clipped"
        style={{ height: 240, overflowY: "auto", marginTop: 24 }}
      >
        <div style={{ height: 200 }} />
        <Message from="agent" data-testid="bottom">
          <MessageFooter>
            <ActionRow record={record} />
          </MessageFooter>
        </Message>
      </div>
      {log}
    </div>
  );
}

type HistoryRow = { readonly id: string; readonly lines: number };

/** Rows of fractional heights, so rounding shows up in the positions. */
function historyWindowRows(from: number, to: number): HistoryRow[] {
  return Array.from({ length: to - from }, (_, index) => ({
    id: `r${from + index}`,
    lines: 1 + ((from + index) % 3),
  }));
}

const HISTORY_PAGE = 10;

/** Renders the window; must sit inside the Conversation it follows. */
function HistoryRows({
  rows,
  hasEarlier,
  onLoadEarlier,
  distance,
}: {
  rows: readonly HistoryRow[];
  hasEarlier: boolean;
  onLoadEarlier: () => Promise<void>;
  distance: number | undefined;
}) {
  const history = useHistoryWindow({
    items: rows,
    windowSize: 30,
    step: HISTORY_PAGE,
    hasEarlier,
    onLoadEarlier,
  });
  return (
    <>
      <ConversationContent>
        <ConversationEarlier
          hasEarlier={history.hasEarlier}
          loading={history.loading}
          stalled={history.stalled}
          onReachStart={history.reachStart}
          distance={distance}
        />
        {history.items.map((row) => (
          <ConversationItem key={row.id} itemId={row.id} data-testid={row.id}>
            <p style={{ height: row.lines * 23.5, margin: 0 }}>Row {row.id}</p>
          </ConversationItem>
        ))}
      </ConversationContent>
      <ConversationScrollButton />
      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={history.reachStart}>Load earlier</Button>
        <output aria-label="Shown">{history.items.length}</output>
      </div>
    </>
  );
}

/**
 * `local` rows are loaded; `remote` older ones come from a pretend server a
 * page at a time, when "Deliver" is pressed. "Deliver nothing" ends a load
 * with no rows.
 */
function HistoryWindowScenario({
  local,
  remote,
  distance,
}: {
  local: number;
  remote: number;
  distance?: number;
}) {
  const [from, setFrom] = useState(remote);
  const [to, setTo] = useState(remote + local);
  const [requests, setRequests] = useState(0);
  const [pending, setPending] = useState<(() => void) | null>(null);
  const settle = (rows: number) => {
    if (pending === null) return;
    setFrom((current) => Math.max(0, current - rows));
    setPending(null);
    pending();
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 400,
        width: 600,
      }}
    >
      <Conversation>
        <HistoryRows
          rows={historyWindowRows(from, to)}
          hasEarlier={from > 0}
          onLoadEarlier={() => {
            setRequests((count) => count + 1);
            return new Promise((resolve) => setPending(() => resolve));
          }}
          distance={distance}
        />
      </Conversation>
      <div style={{ display: "flex", gap: 8 }}>
        <Button onClick={() => setTo((current) => current + 1)}>Append</Button>
        <Button onClick={() => settle(HISTORY_PAGE)}>Deliver</Button>
        <Button onClick={() => settle(0)}>Deliver nothing</Button>
        <output aria-label="Requests">{requests}</output>
      </div>
    </div>
  );
}

const mapTurns = (length: number): ConversationMapTurn[] =>
  Array.from({ length }, (_, index) => ({
    id: `t${index}`,
    label: `Question ${index}`,
    preview: `Answer ${index}`,
  }));

const MAP_TURNS = mapTurns(20);

/** Turns of fixed height: a 24px question, then a 72px answer. Twenty by
 * default. */
function ConversationMapScenario({
  turns = MAP_TURNS,
}: {
  turns?: ConversationMapTurn[];
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: 400,
        width: 600,
      }}
    >
      <Conversation>
        <ConversationMap turns={turns} />
        <ConversationContent>
          {turns.flatMap((turn) => [
            <ConversationItem
              key={turn.id}
              itemId={turn.id}
              data-testid={turn.id}
            >
              <p style={{ height: 24, margin: "0 0 0 48px" }}>{turn.label}</p>
            </ConversationItem>,
            <ConversationItem
              key={`${turn.id}a`}
              itemId={`${turn.id}a`}
              data-testid={`${turn.id}a`}
            >
              <p style={{ height: 72, margin: "0 0 0 48px" }}>{turn.preview}</p>
            </ConversationItem>,
          ])}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </div>
  );
}

/** How many of each reason, e.g. "too-many 20". */
function refusals(rejected: readonly AttachmentRejection<File>[]): string {
  const counts = new Map<string, number>();
  for (const { reason } of rejected) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return [...counts].map(([reason, count]) => `${reason} ${count}`).join(", ");
}

/** A message box taking dropped files into a folded stack, as a chat would. */
function AttachmentsScenario() {
  const [attachments, setAttachments] = useState<readonly AttachmentItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [refused, setRefused] = useState("");
  const [folders, setFolders] = useState("");
  const message = useRef<HTMLTextAreaElement>(null);
  const { add } = useAttachments({
    attachments,
    maxFiles: 100,
    maxFileBytes: 1024 * 1024,
  });
  const folded = !expanded && attachments.length > 5;
  const shown = folded ? attachments.slice(0, 4) : attachments;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div data-testid="outside" style={{ height: 80 }}>
        Outside the drop zone
      </div>
      <AttachmentDropZone
        data-testid="zone"
        onFiles={(files, details) => {
          const { accepted, rejected } = add(files);
          setAttachments((previous) => [...previous, ...accepted]);
          setRefused(refusals(rejected));
          setFolders(details.folders.join(","));
        }}
        style={{ padding: "96px 16px 16px", width: 640 }}
      >
        {attachments.length === 0 ? null : (
          <Attachments
            variant="stack"
            total={attachments.length}
            expanded={expanded}
            onExpandedChange={setExpanded}
            returnFocusTo={message}
          >
            {shown.map((item) => (
              <Attachment key={item.id} data={item}>
                <AttachmentPreview />
                <AttachmentInfo />
                <AttachmentRemove
                  onClick={() =>
                    setAttachments((previous) =>
                      previous.filter((held) => held.id !== item.id),
                    )
                  }
                />
              </Attachment>
            ))}
            {folded ? (
              <AttachmentMore count={attachments.length - shown.length} />
            ) : null}
          </Attachments>
        )}
        {expanded ? (
          <Button
            onClick={() => {
              message.current?.focus();
              setExpanded(false);
              setAttachments([]);
            }}
          >
            Remove all
          </Button>
        ) : null}
        <textarea ref={message} aria-label="Message" />
      </AttachmentDropZone>
      <output aria-label="Count">{attachments.length}</output>
      <output aria-label="Refused">{refused}</output>
      <output aria-label="Folders">{folders}</output>
    </div>
  );
}

/** A flat swatch as an inline SVG, so nothing is fetched. */
function swatch(index: number): ConversationImage {
  const shade = 40 + index * 20;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="hsl(${shade} 70% 60%)"/></svg>`;
  return {
    id: `swatch-${index}`,
    mediaType: "image/svg+xml",
    width: 300,
    height: 200,
    alt: `Swatch ${index}`,
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
  };
}

const SWATCHES: PartImage = {
  kind: "image",
  id: "swatches",
  prompt: "Three swatches",
  state: "done",
  images: [swatch(1), swatch(2), swatch(3)],
};

/** Starts generating, so landing the images is watched and reveals them. */
function MediaViewerScenario() {
  const [landed, setLanded] = useState(false);
  const part: PartImage = landed
    ? SWATCHES
    : {
        ...SWATCHES,
        state: "generating",
        images: [],
        expected: { count: 3, width: 300, height: 200 },
      };
  const viewer = useMediaViewer({ items: generatedImageViewerItems(part) });
  return (
    <div style={{ width: 600 }}>
      <Button onClick={() => setLanded(true)}>Land images</Button>
      <GeneratedImages part={part} onOpen={viewer.open} />
      <MediaViewer viewer={viewer} />
    </div>
  );
}

const REMOTE: PartImage = {
  kind: "image",
  id: "remote",
  prompt: "Remote swatches",
  state: "done",
  images: [1, 2].map((index) => ({
    id: `remote-${index}`,
    mediaType: "image/svg+xml",
    width: 300,
    height: 200,
    alt: `Remote ${index}`,
    url: `https://images.example.test/remote-${index}.svg`,
  })),
};

/** Images from another origin inside a scrolling log, on a page that scrolls. */
function MediaViewerChatScenario() {
  const viewer = useMediaViewer({ items: generatedImageViewerItems(REMOTE) });
  return (
    <div style={{ width: 600, paddingBottom: 3000 }}>
      <div data-testid="log" style={{ height: 320, overflow: "auto" }}>
        <div style={{ height: 600 }} />
        <GeneratedImages part={REMOTE} onOpen={viewer.open} />
        <div style={{ height: 600 }} />
      </div>
      <MediaViewer viewer={viewer} />
    </div>
  );
}

const THREAD_AGENT: ConversationParticipant = {
  id: "agent",
  kind: "agent",
  name: "Agent",
};

const THREAD_READER: ConversationParticipant = {
  id: "reader",
  kind: "person",
  name: "Reader",
};

function threadMessage(
  id: string,
  author: ConversationParticipant,
  text: string,
): ConversationMessage {
  return {
    id,
    author,
    at: "2026-03-04T11:00:00.000Z",
    status: "sent",
    parts: [{ kind: "text", text }],
  };
}

const THREAD_PARENT: ConversationMessage = {
  ...threadMessage("parent", THREAD_AGENT, "The weekly report is ready."),
  replies: { count: 12, lastAt: "2026-03-04T11:30:00.000Z" },
};

const THREAD_REPLIES = Array.from({ length: 12 }, (_, index) =>
  threadMessage(
    `reply-${index + 1}`,
    index % 2 === 0 ? THREAD_READER : THREAD_AGENT,
    `Reply ${index + 1}: a note on the report, long enough to wrap onto a second line in the panel.`,
  ),
);

function ThreadMessage({ message }: { message: ConversationMessage }) {
  const own = message.author.id === THREAD_READER.id;
  return (
    <Message
      from={own ? "own" : "agent"}
      aria-label={`${message.author.name} ${message.id}`}
    >
      <MessageParts parts={message.parts} />
    </Message>
  );
}

const renderThreadMessage = (message: ConversationMessage) => (
  <ThreadMessage message={message} />
);

// A thread's tab keeps its draft and replies in its own state, so they last
// exactly as long as the pane stays mounted.
function ThreadPaneScenario() {
  const [replies, setReplies] = useState(THREAD_REPLIES);
  const [draft, setDraft] = useState("");
  const [sentId, setSentId] = useState<string>();
  const [sends, setSends] = useState(0);
  return (
    <ConversationThread
      parent={THREAD_PARENT}
      replies={replies}
      renderMessage={renderThreadMessage}
      sentId={sentId}
    >
      <PromptInput
        value={draft}
        onValueChange={setDraft}
        onSubmit={() => {
          const count = sends + 1;
          setSends(count);
          setReplies((current) => [
            ...current,
            threadMessage(`sent-${count}`, THREAD_READER, draft),
            threadMessage(`answer-${count}`, THREAD_AGENT, "Noted."),
          ]);
          setSentId(`sent-${count}`);
          setDraft("");
        }}
      >
        <PromptInputTextarea aria-label="Reply" />
        <PromptInputSubmit />
      </PromptInput>
    </ConversationThread>
  );
}

type ThreadScenarioTab = { value: string; title: string };

function ConversationThreadScenario() {
  const { tabs, value, open, tabsProps, paneProps } =
    useTabs<ThreadScenarioTab>({
      defaultTabs: [{ value: "notes", title: "Notes" }],
    });
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        height: 600,
        width: 1200,
        containerType: "inline-size",
      }}
    >
      <main style={{ flex: 1, minWidth: 0 }}>
        <ThreadMessage message={THREAD_PARENT} />
        {THREAD_PARENT.replies === undefined ? null : (
          <MessageReplies
            replies={THREAD_PARENT.replies}
            now={Date.parse("2026-03-04T12:00:00.000Z")}
            onClick={() => open({ value: "thread", title: "Thread" })}
          />
        )}
      </main>
      {value === null ? null : (
        <Panel aria-label="Side panel">
          <PanelHeader className="items-end bg-muted pt-1.5 pb-0">
            <PanelTabs label="Open items" {...tabsProps}>
              {tabs.map((tab) => (
                <PanelTab key={tab.value} value={tab.value}>
                  {tab.title}
                </PanelTab>
              ))}
            </PanelTabs>
          </PanelHeader>
          <PanelContent value={value} keepMounted>
            {tabs.map((tab) => (
              <PanelPane
                key={tab.value}
                value={tab.value}
                {...paneProps(tab.value)}
              >
                {tab.value === "thread" ? <ThreadPaneScenario /> : "Notes pane"}
              </PanelPane>
            ))}
          </PanelContent>
        </Panel>
      )}
    </div>
  );
}

export const scenarios: Record<string, () => ReactNode> = {
  smoke: () => <Button>Ready</Button>,
  "command-palette": () => <Palette />,
  select: () => <SelectField />,
  "filter-chip": () => <Chip />,
  "dictation-denied": () => <DictationStatusLine state="denied" />,
  "auth-layout": () => <AuthLayout>Form</AuthLayout>,
  "auth-layout-panel": () => (
    <AuthLayout panel={<div data-testid="custom-panel">custom</div>}>
      Form
    </AuthLayout>
  ),
  shimmer: () => <ShimmerText>Thinking</ShimmerText>,
  "thinking-mark": () => <ThinkingMark variant="echo" />,
  "thinking-mark-paused": () => <ThinkingMark variant="echo" paused />,
  theme: () => <Swatches />,
  "theme-toggle": () => (
    <ThemeProvider storageKey="e2e-theme" defaultMode="light">
      <ThemeToggle />
      <Swatches />
    </ThemeProvider>
  ),
  "conversation-settle": () => <ConversationScenario policy="settle" />,
  "conversation-stick": () => <ConversationScenario policy="stick" />,
  "conversation-glide": () => <ConversationGlideScenario />,
  "prompt-input": () => <Prompt />,
  "prompt-input-attachment": () => <PromptWithAttachment />,
  panel: () => <PanelScenario />,
  "prompt-input-toolbar": () => <PromptToolbarScenario />,
  "panel-tabs": () => <PanelTabsScenario />,
  "tool-approval": () => <ToolApprovalScenario />,
  "tool-batch-approval": () => <ToolBatchApprovalScenario />,
  "message-fold": () => <MessageFoldScenario />,
  "message-fold-settle": () => (
    <MessageFoldConversationScenario policy="settle" />
  ),
  "message-fold-stick": () => (
    <MessageFoldConversationScenario policy="stick" />
  ),
  "message-actions": () => <MessageActionsScenario />,
  "history-window": () => (
    <HistoryWindowScenario local={100} remote={0} distance={0} />
  ),
  "history-window-paged": () => (
    <HistoryWindowScenario local={20} remote={30} distance={0} />
  ),
  "history-window-reach": () => (
    <HistoryWindowScenario local={200} remote={0} />
  ),
  "conversation-map": () => <ConversationMapScenario />,
  // Below the fold of a tall page, with more turns than the rail can fit.
  "conversation-map-tall-page": () => (
    <>
      <div style={{ height: 1600 }} />
      <ConversationMapScenario turns={mapTurns(80)} />
    </>
  ),
  attachments: () => <AttachmentsScenario />,
  "media-viewer": () => <MediaViewerScenario />,
  "media-viewer-chat": () => <MediaViewerChatScenario />,
  "conversation-thread": () => <ConversationThreadScenario />,
};
