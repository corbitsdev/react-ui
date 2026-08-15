import type { Part } from "../../src/lib/chat-parts.js";
import { PartsRenderer } from "../../src/ui/parts-renderer.js";

export default { title: "Chat / Parts renderer" };

/** A turn that thinks, calls a tool, and answers — rendered in the order it happened. */
export const FullTurn = () => {
  const parts: Part[] = [
    { kind: "reasoning", text: "The customer wants last week's shipped orders. I'll query the orders table.", durationMs: 4200 },
    {
      kind: "tool-trace",
      toolCallId: "call-1",
      name: "orders__query",
      input: { range: "last_week", status: "shipped" },
      status: "output-available",
      output: "412 orders",
    },
    { kind: "text", text: "412 orders shipped this week, up 8% over last week." },
  ];
  return (
    <div className="max-w-lg rounded-lg border border-border bg-card p-4">
      <PartsRenderer parts={parts} />
    </div>
  );
};

/** Only a text part — the common case for a plain reply. */
export const TextOnly = () => (
  <div className="max-w-lg rounded-lg border border-border bg-card p-4">
    <PartsRenderer parts={[{ kind: "text", text: "Done — the report is attached below." }]} />
  </div>
);

/** No parts at all: renders nothing, no placeholder chrome. */
export const Empty = () => (
  <div className="max-w-lg rounded-lg border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
    <PartsRenderer parts={[]} />
    (nothing rendered above — this box is only here to show the empty state has no chrome)
  </div>
);

/** A tool call waiting on human approval, shown open by default. */
export const ToolAwaitingApproval = () => {
  const parts: Part[] = [
    { kind: "text", text: "This will cancel the customer's order and issue a refund." },
    {
      kind: "tool-trace",
      toolCallId: "call-2",
      name: "orders__cancel",
      input: { orderId: "ord_4821" },
      status: "approval-requested",
      output: "Cancels order #4821 and refunds $128.40 — irreversible.",
    },
  ];
  return (
    <div className="max-w-lg rounded-lg border border-border bg-card p-4">
      <PartsRenderer parts={parts} />
    </div>
  );
};

/** A file attachment, with and without a resolved url. */
export const FileAttachments = () => {
  const parts: Part[] = [
    { kind: "text", text: "Here's the export." },
    { kind: "file", name: "orders-2026-08.csv", mediaType: "text/csv", url: "https://example.com/f/1" },
    { kind: "file", name: "processing.csv", mediaType: "text/csv" },
  ];
  return (
    <div className="max-w-lg rounded-lg border border-border bg-card p-4">
      <PartsRenderer parts={parts} />
    </div>
  );
};

/** A membership event rendered as an inline system line. */
export const EventLine = () => (
  <div className="max-w-lg rounded-lg border border-border bg-card p-4">
    <PartsRenderer parts={[{ kind: "event", event: "channel.agent-joined" }]} />
  </div>
);

/** A block part with no host registry falls back to a labeled card with its raw payload. */
export const UnregisteredBlockFallsBack = () => {
  const parts: Part[] = [
    {
      kind: "block",
      block: { type: "poll", data: { title: "Ship Friday?", choices: ["Yes", "No"] } },
    },
  ];
  return (
    <div className="max-w-lg rounded-lg border border-border bg-card p-4">
      <PartsRenderer parts={parts} />
    </div>
  );
};

/** Long reasoning and tool output each scroll or wrap in place rather than stretching the card. */
export const LongContent = () => {
  const longThought = Array.from(
    { length: 12 },
    (_, i) => `Step ${i + 1}: checked the ${["orders", "returns", "inventory", "shipping"][i % 4]} table.`,
  ).join(" ");
  const parts: Part[] = [
    { kind: "reasoning", text: longThought, durationMs: 61_500 },
    {
      kind: "tool-trace",
      toolCallId: "call-3",
      name: "reports__export",
      status: "output-available",
      output: Array.from({ length: 40 }, (_, i) => `row ${i + 1}`).join("\n"),
    },
    {
      kind: "text",
      text: "Here's the full breakdown, line by line, so nothing about last month's numbers is left ambiguous or unexplained in the summary above.",
    },
  ];
  return (
    <div className="max-w-lg rounded-lg border border-border bg-card p-4">
      <PartsRenderer parts={parts} />
    </div>
  );
};
