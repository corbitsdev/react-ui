import { FileText, MessageSquare, Table2, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { useTabs } from "../../src/hooks/use-tabs.js";
import { Button } from "../../src/ui/button.js";
import {
  Panel,
  PanelActions,
  PanelClose,
  PanelContent,
  PanelHandle,
  PanelHeader,
  PanelPane,
} from "../../src/ui/panel.js";
import {
  PanelTab,
  PanelTabAdd,
  PanelTabs,
  panelTabsHeaderClassName,
} from "../../src/ui/panel-tabs.js";

export default { title: "Chat / Panel Tabs" };

type Kind = "thread" | "artifact" | "table";

type Item = {
  readonly value: string;
  readonly title: string;
  readonly kind: Kind;
};

const ICONS: Record<Kind, ReactNode> = {
  thread: <MessageSquare />,
  artifact: <FileText />,
  table: <Table2 />,
};

const ITEMS: readonly Item[] = [
  { value: "thread:intro", title: "Thread: weekly summary", kind: "thread" },
  { value: "artifact:report", title: "Quarterly report", kind: "artifact" },
  { value: "table:accounts", title: "Accounts", kind: "table" },
  { value: "artifact:plan", title: "Launch plan", kind: "artifact" },
  { value: "thread:review", title: "Thread: review notes", kind: "thread" },
  { value: "table:usage", title: "Usage by region", kind: "table" },
  { value: "artifact:brief", title: "Design brief", kind: "artifact" },
  { value: "thread:budget", title: "Thread: budget questions", kind: "thread" },
  { value: "artifact:memo", title: "Hiring memo", kind: "artifact" },
  { value: "table:invoices", title: "Open invoices", kind: "table" },
  { value: "artifact:roadmap", title: "Roadmap draft", kind: "artifact" },
  {
    value: "thread:support",
    title: "Thread: support escalation",
    kind: "thread",
  },
];

/** What another press of + opens. */
function nextItem(count: number): Item {
  return {
    value: `artifact:new-${count}`,
    title: `Untitled ${count}`,
    kind: "artifact",
  };
}

function Pane({ item }: { readonly item: Item }) {
  return (
    <div className="flex flex-col gap-3 p-4 text-sm">
      <h2 className="font-semibold">{item.title}</h2>
      {Array.from({ length: 12 }, (_, index) => (
        <p key={index} className="text-muted-foreground">
          Line {index + 1} of {item.title.toLowerCase()}: the agent noted what
          changed since the last version and what still needs a look.
        </p>
      ))}
    </div>
  );
}

/**
 * A panel of tabs beside a main area. Click, drag or use the keyboard:
 * arrows, Home and End move; Delete or Backspace closes; Ctrl/Cmd+Shift+Arrow moves the
 * tab. Closing the last tab closes the panel.
 *
 * The tab's × is hidden from assistive technology, so the header also has a
 * named "Close tab" button for the selected tab: the close a touch
 * screen-reader user can reach.
 */
function TabbedPanel({
  initial,
  defaultValue,
}: {
  readonly initial: readonly Item[];
  readonly defaultValue?: string;
}) {
  const { tabs, value, open, close, tabsProps, paneProps } = useTabs<Item>({
    defaultTabs: initial,
    defaultValue,
  });
  const [added, setAdded] = useState(0);
  const [closed, setClosed] = useState(false);
  const shown = closed ? null : value;
  return (
    <div className="@container relative flex h-[520px] overflow-hidden rounded-lg border border-border">
      <main className="flex min-w-0 flex-1 flex-col gap-3 p-6">
        <h1 className="text-lg font-semibold">Conversation</h1>
        <p className="text-sm text-muted-foreground">
          {tabs.length} open {tabs.length === 1 ? "tab" : "tabs"}.
        </p>
        {shown !== null ? null : (
          <Button
            variant="outline"
            className="self-start"
            onClick={() => {
              setClosed(false);
              if (tabs.length === 0 && initial[0] !== undefined)
                open(initial[0]);
            }}
          >
            Open panel
          </Button>
        )}
      </main>
      {shown !== null ? (
        <Panel aria-label="Side panel">
          <PanelHandle />
          <PanelHeader className={panelTabsHeaderClassName}>
            <PanelTabs label="Open items" {...tabsProps}>
              {tabs.map((tab) => (
                <PanelTab
                  key={tab.value}
                  value={tab.value}
                  icon={ICONS[tab.kind]}
                  title={tab.title}
                >
                  {tab.title}
                </PanelTab>
              ))}
            </PanelTabs>
            <PanelTabAdd
              onClick={() => {
                const count = added + 1;
                setAdded(count);
                open(nextItem(count));
              }}
            />
            <PanelActions className="mb-0.5 self-end">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close tab"
                title="Close tab"
                className="size-8"
                onClick={() => close(shown)}
              >
                <X aria-hidden />
              </Button>
              <PanelClose onClick={() => setClosed(true)} />
            </PanelActions>
          </PanelHeader>
          <PanelContent value={shown} keepMounted>
            {tabs.map((tab) => (
              <PanelPane
                key={tab.value}
                value={tab.value}
                tabIndex={0}
                {...paneProps(tab.value)}
              >
                <Pane item={tab} />
              </PanelPane>
            ))}
          </PanelContent>
        </Panel>
      ) : null}
    </div>
  );
}

/** A single open item: its × closes the panel. */
export const OneTab = () => <TabbedPanel initial={ITEMS.slice(0, 1)} />;

/** A few items, with the second in front. */
export const SeveralTabs = () => (
  <TabbedPanel initial={ITEMS.slice(0, 4)} defaultValue="artifact:report" />
);

/**
 * More tabs than fit: the row scrolls sideways and keeps the selected tab in
 * view, here one near the end.
 */
export const TooManyTabs = () => (
  <TabbedPanel initial={ITEMS} defaultValue="table:invoices" />
);
