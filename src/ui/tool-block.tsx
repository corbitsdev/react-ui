import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "../lib/utils.js";
import { StatusDot } from "./status-dot.js";

/**
 * A tool call's lifecycle, as a discriminated union rather than a status
 * string plus optional fields — each state carries exactly the data that
 * exists at that point and nothing a caller could set inconsistently (an
 * `error` with an `output`, a `pending` with a `deniedReason`).
 *
 * `approval-requested` and `output-denied` are distinct from `error`: a
 * refused approval is an outcome the human chose, not a failure the tool
 * suffered, and the two read very differently in a transcript.
 */
export type ToolBlockState =
  | { readonly status: "pending" }
  | { readonly status: "running" }
  | { readonly status: "output-available"; readonly output: string }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "approval-requested"; readonly reason?: string }
  | { readonly status: "output-denied"; readonly reason?: string };

export type ToolBlockProps = {
  /** Raw tool identifier, e.g. `slack__post_message`. */
  readonly name: string;
  /** Human phrasing for what the tool did. Falls back to `name` when absent. */
  readonly label?: string;
  readonly state: ToolBlockState;
  /** Call arguments, shown in the expanded detail when present. */
  readonly input?: unknown;
  readonly defaultOpen?: boolean;
  /** Controlled open state. Pair with `onOpenChange` to lift it to a parent. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly className?: string;
};

const STATE_TEXT: Record<ToolBlockState["status"], string> = {
  pending: "Queued",
  running: "Working",
  "output-available": "Done",
  error: "Failed",
  "approval-requested": "Needs approval",
  "output-denied": "Denied",
};

/**
 * Orange (`emphasis`) is reserved for `approval-requested` alone: it is the
 * one state that needs a human to act, so it is the one state that earns the
 * brand's single emphasis color. `running` already signals "in progress"
 * through the dot's own pulse animation (`StatusDot`'s `live` prop) — giving
 * it orange too would stack two "look here" signals on a state that isn't
 * actually asking for anything.
 */
const STATE_TONE: Record<ToolBlockState["status"], "neutral" | "emphasis" | "danger"> = {
  pending: "neutral",
  running: "neutral",
  "output-available": "neutral",
  error: "danger",
  "approval-requested": "emphasis",
  "output-denied": "danger",
};

/** True when the state carries no `error`/`running` weight in a warning sense but still opens by default. */
const OPENS_BY_DEFAULT: Record<ToolBlockState["status"], boolean> = {
  pending: false,
  running: false,
  "output-available": false,
  error: true,
  "approval-requested": true,
  "output-denied": true,
};

function humaniseToolName(name: string): string {
  const [provider, ...rest] = name.split("__");
  const humanise = (value: string) => {
    const words = value.replace(/[_-]+/g, " ").trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
  };
  if (rest.length > 0 && provider !== undefined) {
    return `${humanise(rest.join("__"))} (${humanise(provider)})`;
  }
  return humanise(name);
}

function stateDetailText(state: ToolBlockState): string | undefined {
  switch (state.status) {
    case "output-available":
      return state.output;
    case "error":
      return state.message;
    case "approval-requested":
    case "output-denied":
      return state.reason;
    case "pending":
    case "running":
      return undefined;
  }
}

function stateDetailTitle(state: ToolBlockState): string {
  switch (state.status) {
    case "error":
      return "Error";
    case "approval-requested":
      return "Reason";
    case "output-denied":
      return "Denied because";
    case "output-available":
    case "pending":
    case "running":
      return "Output";
  }
}

/**
 * What a tool call did, as one line the transcript can open.
 *
 * Collapsed by default and collapsed even while running: a transcript where
 * every tool call expands itself pushes the answer off screen, and the
 * answer is what the user is waiting for. A failed call, a denied approval
 * and a pending approval request all open by default — those are the three
 * states where the detail is the point, not an afterthought.
 *
 * Uncontrolled by default, seeded from `defaultOpen` (or the state's own
 * default). Pass `open`/`onOpenChange` to drive it from a parent.
 */
export function ToolBlock({
  name,
  label,
  state,
  input,
  defaultOpen,
  open: openProp,
  onOpenChange,
  className,
}: ToolBlockProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? OPENS_BY_DEFAULT[state.status]);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = (value: boolean) => {
    if (openProp === undefined) setUncontrolledOpen(value);
    onOpenChange?.(value);
  };
  const detailText = stateDetailText(state);
  const hasDetail = input !== undefined || detailText !== undefined;
  const displayLabel = label !== undefined && label.length > 0 ? label : humaniseToolName(name);

  return (
    <div data-slot="tool-block" data-status={state.status} className={cn("text-xs", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        disabled={!hasDetail}
        // `relative` plus the `::after` pseudo-element below extends the
        // button's effective (vertical) hit area to 40px without inflating
        // its own padding/density — see design-engineering.md's hit-area
        // pattern. The row is already full-width, so only height needs
        // extending.
        className="relative flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-muted-foreground transition-colors after:absolute after:inset-x-0 after:top-1/2 after:h-10 after:-translate-y-1/2 hover:bg-muted hover:text-foreground disabled:hover:bg-transparent"
      >
        <span
          data-slot="tool-block-status"
          // A pending approval is human-blocking: it needs to reach assistive
          // tech the instant it appears, not only when a reader happens to
          // tab onto this button. Scoped to this span alone (not the whole
          // block) so every other state change in a busy transcript stays
          // silent — announcing every "Working" -> "Done" tick here would be
          // spam.
          role={state.status === "approval-requested" ? "status" : undefined}
          aria-live={state.status === "approval-requested" ? "polite" : undefined}
        >
          <StatusDot
            label={STATE_TEXT[state.status]}
            live={state.status === "running"}
            tone={STATE_TONE[state.status]}
          />
        </span>
        <span className="min-w-0 flex-1 truncate">{displayLabel}</span>
        {hasDetail ? (
          <ChevronRight
            className={cn("size-3.5 shrink-0 transition-transform duration-200 ease-out", open && "rotate-90")}
            aria-hidden
          />
        ) : null}
      </button>

      {open && hasDetail ? (
        <div className="mt-1 ml-4 flex flex-col gap-2 border-l border-border pl-3 [animation:corbits-rail-block-in_200ms_var(--ease-out)_both]">
          {input === undefined ? null : <Detail title="Input">{JSON.stringify(input, null, 2)}</Detail>}
          {detailText === undefined ? null : <Detail title={stateDetailTitle(state)}>{detailText}</Detail>}
        </div>
      ) : null}
    </div>
  );
}

function Detail({ title, children }: { title: string; children: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{title}</p>
      {/* Scrolls in its own box: a long tool result must never make the page
          scroll sideways. */}
      <pre className="max-h-48 overflow-auto rounded-md bg-muted p-2 font-mono text-[11px] whitespace-pre-wrap">
        {children}
      </pre>
    </div>
  );
}
