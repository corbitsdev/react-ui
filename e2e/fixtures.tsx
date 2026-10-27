import { useEffect, useLayoutEffect, useState, Profiler } from "react";
import type { ReactNode } from "react";

import {
  ApprovalCard,
  AuthLayout,
  Button,
  ChatThread,
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationItem,
  ConversationScrollButton,
  DictationStatusLine,
  FilterChip,
  Select,
  ShimmerText,
  ThemeProvider,
  ThemeToggle,
  ThinkingMark,
  type ApprovalRequest,
  type ChatMessage,
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
  panelTabsHeaderClassName,
  useTabs,
} from "@corbits/react-ui";
import {
  CommandPalette,
  type CommandPaletteGroup,
} from "@corbits/react-ui/ui/command-palette";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@corbits/react-ui/ui/dialog";

const REQUEST: ApprovalRequest = {
  id: "req-1",
  headline: "Post to #sales (Slack)",
  requestedBy: "Scout",
  details: [{ label: "Message", value: "Q3 numbers are in." }],
};

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

function Approval({ state }: { state: "idle" | "approving" }) {
  const { log, record } = useEventLog();
  return (
    <>
      <ApprovalCard
        request={REQUEST}
        state={state}
        onApprove={() => record("approve")}
        onReject={() => record("reject")}
      />
      {log}
    </>
  );
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

const CHAT: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    createdAt: "2026-01-01T09:00:00Z",
    parts: [{ type: "text", text: "What changed today?" }],
  },
  {
    id: "m2",
    role: "agent",
    createdAt: "2026-01-01T09:00:04Z",
    parts: [
      { type: "reasoning", text: "Check the commit log first." },
      {
        type: "tool",
        toolCallId: "t1",
        toolName: "git__log",
        label: "Read today's commits",
        state: "done",
        output: "3 commits",
      },
      { type: "text", text: "Three commits landed today." },
    ],
  },
];

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
  onUnsend,
  onRemount,
}: {
  onSend: () => void;
  onWrite: () => void;
  onEarlier: () => void;
  onTrim: () => void;
  onUnsend: () => void;
  onRemount: () => void;
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
      <Button onClick={onUnsend}>Delete sent</Button>
      <Button onClick={onRemount}>Remount</Button>
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
  const [mounts, setMounts] = useState(0);
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
        <ConversationContent key={mounts}>
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
          onUnsend={() =>
            setRows((previous) => previous.filter((row) => row.id !== sentId))
          }
          onRemount={() => setMounts(mounts + 1)}
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

/** A conversation with nothing in it yet. */
function ConversationEmptyScenario() {
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
          <ConversationEmptyState description="Send a message to start." />
        </ConversationContent>
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

/** The prompt inside an open Radix dialog, which records when it closes. */
function PromptInDialog() {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(true);
  const { log, record } = useEventLog();
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) record("dialog-closed");
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Ask</DialogTitle>
          <PromptInput
            value={value}
            onValueChange={setValue}
            onSubmit={() => record(`submit:${value}`)}
            tokens={PROMPT_TOKENS}
          >
            <PromptInputSuggestions />
            <PromptInputTextarea />
          </PromptInput>
        </DialogContent>
      </Dialog>
      {log}
    </>
  );
}

/** The usual chat host: a submit clears the draft and starts a reply, which
 * "Finish reply" ends. That button keeps focus where it is, as a reply
 * arriving would. Without `stoppable` there is no `onStop`, so Send stays
 * Send while the reply runs. */
function PromptChat({ stoppable }: { readonly stoppable: boolean }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<PromptInputStatus>("ready");
  const { log, record } = useEventLog();
  return (
    <div style={{ width: 480 }}>
      <PromptInput
        value={value}
        onValueChange={setValue}
        onSubmit={() => {
          record(`submit:${value}`);
          setValue("");
          setStatus("submitted");
        }}
        status={status}
      >
        <PromptInputTextarea />
        <PromptInputSubmit
          {...(stoppable
            ? {
                onStop: () => {
                  record("stop");
                  setStatus("ready");
                },
              }
            : {})}
        />
      </PromptInput>
      <Button
        tabIndex={-1}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setStatus("ready")}
      >
        Finish reply
      </Button>
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
 * chip removes it and "Reply to Ada" brings it back. "Open models" opens the
 * model list the way a host would, without focusing it. */
function PromptToolbarScenario() {
  const [value, setValue] = useState("");
  const [model, setModel] = useState("deep");
  const [modelOpen, setModelOpen] = useState(false);
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
              open={modelOpen}
              onOpenChange={setModelOpen}
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
      <Button onClick={() => setModelOpen(true)}>Open models</Button>
      {log}
    </div>
  );
}

/** The toolbar inside an open Radix dialog, which records when it closes.
 * "Open models" opens the model list the way a host would. */
function PromptToolbarInDialog() {
  const [value, setValue] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [open, setOpen] = useState(true);
  const { log, record } = useEventLog();
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) record("dialog-closed");
        }}
      >
        <DialogContent aria-describedby={undefined}>
          <DialogTitle>Ask</DialogTitle>
          <PromptInput
            value={value}
            onValueChange={setValue}
            onSubmit={() => record(`submit:${value}`)}
            tokens={PROMPT_TOKENS}
          >
            <PromptInputSuggestions />
            <PromptInputTextarea />
            <PromptInputToolbar>
              <PromptInputAddMenu
                items={[
                  {
                    id: "files",
                    label: "Add files",
                    onSelect: () => record("add:files"),
                  },
                ]}
              />
              <PromptInputModelSelect
                className="ms-auto"
                models={[
                  { id: "swift", name: "Swift 2", short: "Swift" },
                  { id: "deep", name: "Deep 4", short: "Deep" },
                ]}
                open={modelOpen}
                onOpenChange={setModelOpen}
              />
            </PromptInputToolbar>
          </PromptInput>
          <Button onClick={() => setModelOpen(true)}>Open models</Button>
        </DialogContent>
      </Dialog>
      {log}
    </>
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
  const { tabs, value, open, close, tabsProps, paneProps } =
    useTabs<TabScenarioItem>({
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
          <PanelHeader className={panelTabsHeaderClassName}>
            <PanelTabs label="Open items" {...tabsProps}>
              {tabs.map((tab) => (
                <PanelTab key={tab.value} value={tab.value}>
                  {tab.title}
                </PanelTab>
              ))}
            </PanelTabs>
            <PanelTabAdd onClick={() => openMore(1)} />
            <PanelActions>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close tab"
                onClick={() => close(value)}
              >
                ×
              </Button>
            </PanelActions>
          </PanelHeader>
          <PanelContent value={value} keepMounted>
            {tabs.map((tab) => (
              <PanelPane
                key={tab.value}
                value={tab.value}
                tabIndex={0}
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

export const scenarios: Record<string, () => ReactNode> = {
  smoke: () => <Button>Ready</Button>,
  "approval-card": () => <Approval state="idle" />,
  "approval-card-busy": () => <Approval state="approving" />,
  "command-palette": () => <Palette />,
  "chat-thread": () => (
    <div style={{ display: "flex", flexDirection: "column", height: 480 }}>
      <ChatThread messages={CHAT} identity={{ name: "Scout" }} />
    </div>
  ),
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
  "conversation-empty": () => <ConversationEmptyScenario />,
  "prompt-input": () => <Prompt />,
  "prompt-input-attachment": () => <PromptWithAttachment />,
  "prompt-input-dialog": () => <PromptInDialog />,
  "prompt-input-chat": () => <PromptChat stoppable />,
  "prompt-input-chat-no-stop": () => <PromptChat stoppable={false} />,
  panel: () => <PanelScenario />,
  "prompt-input-toolbar": () => <PromptToolbarScenario />,
  "prompt-input-toolbar-dialog": () => <PromptToolbarInDialog />,
  "panel-tabs": () => <PanelTabsScenario />,
};
