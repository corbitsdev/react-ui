/**
 * The structural shape of a message's content: an ordered list of `Part`s
 * rather than a string, because a single turn genuinely interleaves kinds —
 * think, call a tool, emit a generative block, answer.
 *
 * This mirrors the wire shape a host's own parsed/validated part type would
 * take (text, reasoning, tool-trace, block, file, event) but carries no
 * validation of its own — parsing untrusted data into this shape is the
 * host's job, at its own trust boundary, with whatever schema library it
 * already uses. This package only renders a `Part[]` it is handed.
 *
 * Members are named `Part*` rather than the bare `TextPart` / `FilePart` a
 * host might reach for on its own, because `lib/chat-message.ts` already
 * publishes those names for its own, simpler message model — the two are
 * deliberately separate types.
 */

export type PartText = {
  readonly kind: "text";
  readonly text: string;
};

/** Thinking text, plus how long the agent spent producing it. */
export type PartReasoning = {
  readonly kind: "reasoning";
  readonly text: string;
  /** Wall-clock milliseconds spent on this reasoning segment, once known. */
  readonly durationMs?: number;
};

/**
 * A tool call's lifecycle. Six states, not three: a tool call is not only
 * running-or-finished, it can wait on human approval and that approval can be
 * refused — a state distinct from an execution error. See `ToolBlockState`
 * (`ui/tool-block.tsx`) for the matching render-side union.
 */
export type ToolTraceStatus =
  | "pending"
  | "running"
  | "output-available"
  | "error"
  | "approval-requested"
  | "output-denied";

export type PartToolTrace = {
  readonly kind: "tool-trace";
  readonly toolCallId: string;
  readonly name: string;
  readonly status: ToolTraceStatus;
  readonly input?: unknown;
  readonly output?: unknown;
};

/** A generative-UI block. `data` is opaque here — a host-specific registry parses it. */
export type PartBlock = {
  readonly kind: "block";
  readonly block: {
    readonly type: string;
    readonly data: unknown;
  };
};

export type PartFile = {
  readonly kind: "file";
  readonly name: string;
  readonly mediaType: string;
  /** Resolved by the host — this model never fetches bytes. */
  readonly url?: string;
};

/** A system/lifecycle line, e.g. "agent joined". `data` carries whatever the event needs. */
export type PartEvent = {
  readonly kind: "event";
  readonly event: string;
  readonly data?: unknown;
};

export type Part = PartText | PartReasoning | PartToolTrace | PartBlock | PartFile | PartEvent;
