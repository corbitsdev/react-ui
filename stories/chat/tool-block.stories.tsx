import { ToolBlock } from "../../src/ui/tool-block.js";

export default { title: "Chat / Tool block" };

/** Every lifecycle state, stacked in the order a call actually moves through them. */
export const LifecycleStates = () => (
  <div className="flex max-w-md flex-col gap-1 rounded-lg border border-border bg-card p-3">
    <ToolBlock name="search__query" state={{ status: "pending" }} />
    <ToolBlock name="search__query" state={{ status: "running" }} />
    <ToolBlock
      name="search__query"
      input={{ query: "invoices from last week" }}
      state={{ status: "output-available", output: "Found 12 invoices totalling $8,420." }}
    />
    <ToolBlock
      name="mail__send"
      input={{ to: "finance@example.com" }}
      state={{ status: "error", message: "SMTP timeout after 30s." }}
    />
    <ToolBlock
      name="deploy__promote"
      state={{ status: "approval-requested", reason: "Promotes to production — needs a human sign-off." }}
    />
    <ToolBlock
      name="deploy__promote"
      state={{ status: "output-denied", reason: "Rejected by on-call: change freeze in effect." }}
    />
  </div>
);

/** No `label` given — the raw `provider__action` id is humanised for display. */
export const HumanisedName = () => (
  <div className="max-w-md rounded-lg border border-border bg-card p-3">
    <ToolBlock name="slack__post_message" state={{ status: "output-available", output: "Posted to #general." }} />
  </div>
);

/** A caller-supplied `label` wins over the humanised tool id. */
export const ExplicitLabel = () => (
  <div className="max-w-md rounded-lg border border-border bg-card p-3">
    <ToolBlock
      name="slack__post_message"
      label="Posted a summary to #general"
      state={{ status: "output-available", output: "ok" }}
    />
  </div>
);

/** No input, no output — nothing to expand, so the chevron and toggle disappear entirely. */
export const NoDetailToExpand = () => (
  <div className="max-w-md rounded-lg border border-border bg-card p-3">
    <ToolBlock name="ping__health_check" state={{ status: "output-available", output: "" }} />
  </div>
);

/** Long tool output scrolls inside its own box instead of stretching the card or the page. */
export const LongOutputScrollsInPlace = () => (
  <div className="max-w-md rounded-lg border border-border bg-card p-3">
    <ToolBlock
      name="reports__export"
      input={{ range: "2025-01-01..2025-12-31", format: "csv" }}
      state={{
        status: "output-available",
        output: Array.from({ length: 60 }, (_, i) => `row ${i + 1}: order-${1000 + i}, $${(i * 37) % 500}.00`).join(
          "\n",
        ),
      }}
      defaultOpen
    />
  </div>
);
