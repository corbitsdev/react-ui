/**
 * The conversation model every chat component reads: who is talking, what a
 * message holds, and how a tool call that waited on a person records that
 * wait.
 *
 * A message is an ordered list of parts rather than a string, because a
 * single turn genuinely interleaves kinds: think, call a tool, emit a
 * generative block, answer. Beyond text, reasoning, tool calls, blocks, files
 * and events, a conversation part can be a tool call carrying its approval
 * record, a batch of calls that ran at the same time, generated images or
 * sources.
 *
 * Types only. Parsing untrusted data into this shape is the host's job, at its
 * own trust boundary, with whatever schema library it already uses.
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
 * refused — a state distinct from an execution error.
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

export type Part =
  | PartText
  | PartReasoning
  | PartToolTrace
  | PartBlock
  | PartFile
  | PartEvent;

/** A person or an agent taking part in a conversation. */
export type ConversationParticipant = {
  readonly id: string;
  readonly kind: "person" | "agent";
  readonly name: string;
  /** One line under an agent's name, e.g. "Research". */
  readonly role?: string;
};

/**
 * `sending` and `failed` describe your own sends; `streaming` is an agent turn
 * still arriving; everything delivered is `sent`.
 */
export type ConversationMessageStatus =
  | "sending"
  | "sent"
  | "failed"
  | "streaming";

export type ToolApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "timeout"
  | "expired";

/** How far a decision reaches: this call only, or every later call of the tool. */
export type ToolApprovalScope = "once" | "always";

/**
 * A person's decision on a tool call, kept beside the call rather than folded
 * into its status: `ToolTraceStatus` describes the call's execution, this
 * record describes the wait for a person. When both are present this record
 * is authoritative for anything about approval.
 */
export type ToolApprovalRecord = {
  readonly id: string;
  readonly status: ToolApprovalStatus;
  /** `null` until a decision records one. */
  readonly scope: ToolApprovalScope | null;
  /** ISO deadline. `null` waits indefinitely. */
  readonly timeoutAt: string | null;
};

/**
 * A tool call, with its approval record when it waited on a person.
 *
 * `status` describes only the call's execution. When `approval` is present it
 * alone answers every approval question: a call whose record is `pending` is
 * waiting on a person whatever `status` says, and one whose record is settled
 * is not, even if `status` still reads `approval-requested`. Without a record,
 * `status === "approval-requested"` is the only sign of a wait.
 */
export type PartTool = PartToolTrace & {
  readonly approval?: ToolApprovalRecord;
};

/** Tool calls that ran at the same time. */
export type PartToolBatch = {
  readonly kind: "tool-batch";
  readonly id: string;
  readonly tools: readonly PartTool[];
};

/**
 * One generated image, stored behind a URL or inline as base64. Exactly one of
 * the two is set; `base64` is the bare payload, without a `data:` prefix
 * (`mediaType` supplies it).
 */
export type ConversationImage = {
  readonly id: string;
  readonly mediaType: string;
  readonly width: number;
  readonly height: number;
  readonly alt?: string;
} & (
  | { readonly url: string; readonly base64?: never }
  | { readonly base64: string; readonly url?: never }
);

/** Images an agent made. */
export type PartImage = {
  readonly kind: "image";
  readonly id: string;
  readonly prompt: string;
  readonly state: "generating" | "done" | "error";
  readonly images: readonly ConversationImage[];
  /** While generating: how many are coming and their size, so placeholders hold the space. */
  readonly expected?: {
    readonly count: number;
    readonly width: number;
    readonly height: number;
  };
};

export type ConversationSource = {
  readonly title: string;
  readonly url: string;
};

/** Where an answer's facts came from. */
export type PartSources = {
  readonly kind: "sources";
  readonly sources: readonly ConversationSource[];
};

export type ConversationPart =
  | PartText
  | PartReasoning
  | PartTool
  | PartToolBatch
  | PartBlock
  | PartFile
  | PartEvent
  | PartImage
  | PartSources;

export type ConversationReaction = {
  readonly emoji: string;
  readonly count: number;
  /** Whether the viewer is one of `count`. */
  readonly mine: boolean;
};

/** What a message with replies shows about them. */
export type ConversationRepliesSummary = {
  readonly count: number;
  /** ISO timestamp of the latest reply. */
  readonly lastAt: string;
};

export type ConversationMessage = {
  readonly id: string;
  readonly author: ConversationParticipant;
  /** ISO timestamp. */
  readonly at: string;
  readonly status: ConversationMessageStatus;
  readonly parts: readonly ConversationPart[];
  /** Why a `failed` message failed, in words a person can act on. */
  readonly error?: string;
  readonly replies?: ConversationRepliesSummary;
  readonly reactions?: readonly ConversationReaction[];
};
