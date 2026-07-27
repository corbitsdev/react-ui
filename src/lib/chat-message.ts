/**
 * The conversation data model. Agent-agnostic on purpose: nothing here names a
 * particular assistant, and the identity shown in the header is a prop.
 *
 * A message is an ordered list of parts rather than a string, because a single
 * agent reply genuinely interleaves kinds — think, call a tool, think again,
 * answer. Flattening that to `text` plus a `toolCalls` array loses the order,
 * and the order is the only thing that makes a transcript readable.
 */

export type ChatRole = "user" | "agent" | "system";

/** Delivery state of a message the user sent. Absent on received messages. */
export type MessageStatus = "sending" | "sent" | "failed";

export type TextPart = {
  readonly type: "text";
  readonly text: string;
};

/** Thinking text. One cumulative string per turn — there are no segment boundaries. */
export type ReasoningPart = {
  readonly type: "reasoning";
  readonly text: string;
};

/**
 * Tool lifecycle, restricted to states a caller can actually distinguish:
 * running, finished, or finished badly. There is no "input streaming" state
 * because a surface cannot render one usefully.
 */
export type ToolPartState = "running" | "done" | "error";

export type ToolPart = {
  readonly type: "tool";
  readonly toolCallId: string;
  /** Raw tool identifier, e.g. `slack__post_message`. */
  readonly toolName: string;
  readonly state: ToolPartState;
  /** Human phrasing for what the tool did. Falls back to `toolName` when absent. */
  readonly label?: string;
  readonly input?: Readonly<Record<string, unknown>>;
  /** Result or failure text, already stringified by the host. */
  readonly output?: string;
};

export type FilePart = {
  readonly type: "file";
  readonly name: string;
  readonly mediaType: string;
  /** Resolved by the host — this model never fetches bytes. */
  readonly url?: string;
};

export type MessagePart = TextPart | ReasoningPart | ToolPart | FilePart;

export type ChatMessage = {
  readonly id: string;
  readonly role: ChatRole;
  readonly parts: readonly MessagePart[];
  /** ISO timestamp. */
  readonly createdAt: string;
  readonly status?: MessageStatus;
};

/** A tappable suggestion the agent offered. */
export type QuickReply = {
  readonly id: string;
  readonly label: string;
  /** Sent instead of the label when present. */
  readonly value?: string;
};

/** Who the user is talking to. The host names its own agent. */
export type AgentIdentity = {
  readonly name: string;
  readonly tagline?: string;
  /** Two or three characters for the avatar. Derived from `name` when absent. */
  readonly initials?: string;
};

/**
 * Work the agent handed to a helper of its own.
 *
 * The same four states as a tool call plus `queued`, because a delegated task
 * that has not started yet is a thing the user can see and a tool call is not.
 * `tools` is the helper's own calls, so a subagent's detail is the same
 * narrative the main transcript already renders rather than a second format.
 */
export type SubagentState = "queued" | "running" | "done" | "error";

export type SubagentRun = {
  readonly id: string;
  /** What this helper is, e.g. "Researcher". Named by the host, not the registry. */
  readonly name: string;
  /** The one-line instruction it was given. */
  readonly task?: string;
  readonly state: SubagentState;
  /** ISO timestamp. Absent while queued. */
  readonly startedAt?: string;
  readonly tools?: readonly ToolPart[];
  /** Its answer, once it has one. */
  readonly result?: string;
};

/** One conversation in the thread list. */
export type ChatThreadSummary = {
  readonly id: string;
  readonly title: string;
  /** ISO timestamp of the most recent message. */
  readonly updatedAt: string;
  readonly preview?: string;
};

/** The answer text: every text part joined, thinking and tools excluded. */
export function messageText(message: ChatMessage): string {
  return message.parts
    .filter((part): part is TextPart => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/** The turn's thinking, if the agent exposed any. */
export function reasoningText(message: ChatMessage): string {
  return message.parts
    .filter((part): part is ReasoningPart => part.type === "reasoning")
    .map((part) => part.text)
    .join("");
}

export function toolParts(message: ChatMessage): readonly ToolPart[] {
  return message.parts.filter((part): part is ToolPart => part.type === "tool");
}

/** True while any tool in the turn is still running — drives the live marker. */
export function isTurnWorking(message: ChatMessage): boolean {
  return toolParts(message).some((part) => part.state === "running");
}

/**
 * A readable name for a tool id. `slack__post_message` → "Post message
 * (Slack)"; `mail_send` → "Mail send". Never shows a raw snake_case id, and
 * never invents a label for a tool it does not recognise — it only reformats
 * what it was given, so a new tool reads correctly with no table to update.
 */
export function toolLabel(part: ToolPart): string {
  if (part.label !== undefined && part.label.length > 0) return part.label;

  const [provider, ...rest] = part.toolName.split("__");
  const humanise = (value: string) => {
    const words = value.replace(/[_-]+/g, " ").trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
  };

  if (rest.length > 0 && provider !== undefined) {
    return `${humanise(rest.join("__"))} (${humanise(provider)})`;
  }
  return humanise(part.toolName);
}

/** Avatar initials from a display name, capped at two characters. */
export function agentInitials(identity: AgentIdentity): string {
  if (identity.initials !== undefined) return identity.initials;
  return (
    identity.name
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "··"
  );
}
