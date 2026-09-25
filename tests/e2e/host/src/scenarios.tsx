import { useState } from "react";
import type { ReactNode } from "react";

import { ApprovalCard, Button, ThemeProvider, ThemeToggle, type ApprovalRequest } from "@corbits/react-ui";
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
  theme: () => <Swatches />,
  "theme-toggle": () => (
    <ThemeProvider storageKey="e2e-theme" defaultMode="light">
      <ThemeToggle />
      <Swatches />
    </ThemeProvider>
  ),
};
