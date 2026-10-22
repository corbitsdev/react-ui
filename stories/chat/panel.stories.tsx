import { useState } from "react";
import type { ReactNode } from "react";

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
import { Textarea } from "../../src/ui/textarea.js";

export default { title: "Chat / Panel" };

const MESSAGES = Array.from({ length: 24 }, (_, index) => ({
  id: `m-${index}`,
  text:
    index % 2 === 0
      ? `Step ${index + 1}: the agent read the next batch of rows and noted two that need a second look.`
      : `Reply ${index + 1}: keep going, and flag anything over the usual range.`,
}));

/** The main area beside the panel, with a button that reopens it. */
function Main({
  open,
  onOpen,
  children,
}: {
  readonly open: boolean;
  readonly onOpen: () => void;
  readonly children?: ReactNode;
}) {
  return (
    <main className="flex min-w-0 flex-1 flex-col gap-3 p-6">
      <h1 className="text-lg font-semibold">Conversation</h1>
      <p className="text-sm text-muted-foreground">
        The conversation keeps at least 440px however wide the panel is dragged.
      </p>
      {children}
      {open ? null : (
        <Button variant="outline" className="self-start" onClick={onOpen}>
          Open thread
        </Button>
      )}
    </main>
  );
}

function Thread() {
  return (
    <>
      <ol className="flex flex-col gap-3 p-4 text-sm">
        {MESSAGES.map((message) => (
          <li key={message.id} className="rounded-md bg-card p-3">
            {message.text}
          </li>
        ))}
      </ol>
      <div className="sticky bottom-0 border-t border-border bg-background p-3">
        <Textarea aria-label="Reply in thread" placeholder="Reply…" />
      </div>
    </>
  );
}

/** A wide screen: drag the edge, use the arrow keys, or double-click to reset. */
export const Wide = () => {
  const [open, setOpen] = useState(true);
  const [width, setWidth] = useState<number | null>(null);
  return (
    <div className="@container relative flex h-[560px] overflow-hidden rounded-lg border border-border">
      <Main open={open} onOpen={() => setOpen(true)}>
        <p className="text-sm">
          Chosen width:{" "}
          <output aria-label="Panel width">
            {width === null ? "default" : `${width}px`}
          </output>
        </p>
      </Main>
      {open ? (
        <Panel aria-label="Thread" width={width} onWidthChange={setWidth}>
          <PanelHandle label="Resize thread panel" />
          <PanelHeader>
            <h2 className="text-sm font-semibold">Thread</h2>
            <PanelActions>
              <PanelClose onClick={() => setOpen(false)} />
            </PanelActions>
          </PanelHeader>
          <PanelContent value="thread">
            <PanelPane value="thread">
              <Thread />
            </PanelPane>
          </PanelContent>
        </Panel>
      ) : null}
    </div>
  );
};

/** A row too narrow for both: the panel covers it and hides its handle. */
export const NarrowScreenOverlay = () => {
  const [open, setOpen] = useState(true);
  return (
    <div className="@container relative flex h-[560px] max-w-sm overflow-hidden rounded-lg border border-border">
      <Main open={open} onOpen={() => setOpen(true)} />
      {open ? (
        <Panel aria-label="Thread">
          <PanelHandle label="Resize thread panel" />
          <PanelHeader>
            <h2 className="text-sm font-semibold">Thread</h2>
            <PanelActions>
              <PanelClose onClick={() => setOpen(false)} />
            </PanelActions>
          </PanelHeader>
          <PanelContent value="thread">
            <PanelPane value="thread">
              <Thread />
            </PanelPane>
          </PanelContent>
        </Panel>
      ) : null}
    </div>
  );
};

const PANES = [
  { id: "thread", label: "Thread" },
  { id: "notes", label: "Notes" },
  { id: "file", label: "File" },
] as const;

type PaneId = (typeof PANES)[number]["id"];

/**
 * Several panes kept mounted: scroll one, type in another, switch away and
 * back, and both are where you left them.
 */
export const SeveralPanes = () => {
  const [open, setOpen] = useState(true);
  const [shown, setShown] = useState<PaneId>("thread");
  return (
    <div className="@container relative flex h-[560px] overflow-hidden rounded-lg border border-border">
      <Main open={open} onOpen={() => setOpen(true)} />
      {open ? (
        <Panel aria-label="Side panel">
          <PanelHandle />
          <PanelHeader>
            <div
              role="group"
              aria-label="Shown pane"
              className="flex items-center gap-1"
            >
              {PANES.map((pane) => (
                <Button
                  key={pane.id}
                  size="sm"
                  variant={pane.id === shown ? "secondary" : "ghost"}
                  aria-pressed={pane.id === shown}
                  onClick={() => setShown(pane.id)}
                >
                  {pane.label}
                </Button>
              ))}
            </div>
            <PanelActions>
              <PanelClose onClick={() => setOpen(false)} />
            </PanelActions>
          </PanelHeader>
          <PanelContent value={shown} keepMounted>
            <PanelPane value="thread" role="region" aria-label="Thread">
              <Thread />
            </PanelPane>
            <PanelPane
              value="notes"
              role="region"
              aria-label="Notes"
              className="p-4"
            >
              <Textarea aria-label="Notes" rows={8} placeholder="Notes…" />
            </PanelPane>
            <PanelPane
              value="file"
              role="region"
              aria-label="File"
              tabIndex={0}
              className="p-4"
            >
              <pre className="font-mono text-xs whitespace-pre-wrap">
                {MESSAGES.map((message) => message.text).join("\n")}
              </pre>
            </PanelPane>
          </PanelContent>
        </Panel>
      ) : null}
    </div>
  );
};
