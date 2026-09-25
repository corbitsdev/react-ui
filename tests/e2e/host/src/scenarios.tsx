import { useState } from "react";
import type { ReactNode } from "react";

import {
  ApprovalCard,
  AuthLayout,
  Button,
  ChatThread,
  DictationStatusLine,
  FilterChip,
  Select,
  ThemeProvider,
  ThemeToggle,
  type ApprovalRequest,
  type ChatMessage,
} from "@corbits/react-ui";
import { CommandPalette, type CommandPaletteGroup } from "@corbits/react-ui/ui/command-palette";

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
  return { log, record: (event: string) => setEvents((previous) => [...previous, event]) };
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

const SWATCH_TOKENS = ["background", "foreground", "card", "primary", "muted", "border", "destructive"];

/** Solid token fills with no text, so screenshots match across platforms. */
function Swatches() {
  return (
    <div data-testid="swatches" style={{ display: "flex", width: 280 }}>
      {SWATCH_TOKENS.map((token) => (
        <div key={token} style={{ width: 40, height: 40, background: `var(--${token})` }} />
      ))}
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
  "auth-layout-panel": () => <AuthLayout panel={<div data-testid="custom-panel">custom</div>}>Form</AuthLayout>,
  theme: () => <Swatches />,
  "theme-toggle": () => (
    <ThemeProvider storageKey="e2e-theme" defaultMode="light">
      <ThemeToggle />
      <Swatches />
    </ThemeProvider>
  ),
};
