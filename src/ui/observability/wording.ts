import { formatTokens } from "./format.js";
import type { Compaction, GrantEffect, GrantOrigin, Span, SpanKind } from "./model.js";

/** Plain hides the platform words. Precise keeps them. */
export type Wording = "plain" | "precise";

export const FOCUS_KEYS = [
  "thinking",
  "actions",
  "approvals",
  "messages",
  "setup",
  "internet",
  "files",
  "compaction",
  "context",
  "nudges",
] as const;

export type FocusKey = (typeof FOCUS_KEYS)[number];

export type TraceFocus = Record<FocusKey, boolean>;

export const DEFAULT_FOCUS: TraceFocus = {
  thinking: true,
  actions: true,
  approvals: true,
  messages: true,
  setup: true,
  internet: true,
  files: true,
  compaction: true,
  context: true,
  nudges: true,
};

const FOCUS_KINDS: Record<FocusKey, readonly SpanKind[]> = {
  thinking: ["reasoning", "citation"],
  compaction: ["compact"],
  context: ["transform"],
  nudges: ["nudge"],
  actions: ["tool"],
  approvals: ["gate", "permission"],
  messages: ["mail"],
  setup: ["provision", "reactor", "fork", "event"],
  internet: ["network"],
  files: ["attachment"],
};

const KIND_PRECISE: Record<SpanKind, string> = {
  turn: "Turn",
  reasoning: "Thought",
  tool: "Tool",
  permission: "Permission",
  subagent: "Agent",
  compact: "Compact",
  error: "Error",
  event: "Event",
  step: "Step",
  gate: "Gate",
  mail: "Mail",
  provision: "Provision",
  fork: "Fork",
  reactor: "Reactor",
  network: "Network",
  attachment: "Media",
  citation: "Citation",
  transform: "Transform",
  nudge: "Director",
};

const KIND_PLAIN: Record<SpanKind, string> = {
  turn: "Reply",
  reasoning: "Thinking",
  tool: "Action",
  permission: "Ask",
  subagent: "Helper",
  compact: "Shorten",
  error: "Failed",
  event: "Note",
  step: "Step",
  gate: "Approval",
  mail: "Message",
  provision: "Setup",
  fork: "Split",
  reactor: "Runtime",
  network: "Internet",
  attachment: "File",
  citation: "Source",
  transform: "Context",
  nudge: "Nudge",
};

const NAME_PLAIN: Record<string, string> = {
  "Reactor started": "The run started",
  "Allocate a sidecar": "Starting the machine",
  "Approval requested": "Asked for approval",
  "Inbound trigger": "A message started this run",
  "Send the verdict": "Sent the result",
  "Fork a test run": "Split off a test run",
  "Context compacted": "Shortened the notes",
  "Hidden reasoning": "Thinking was hidden",
  "Session started": "Session started",
};

export const FOCUS_LABEL: Record<Wording, Record<FocusKey, string>> = {
  plain: {
    thinking: "Thinking",
    actions: "Actions",
    approvals: "Approvals",
    messages: "Messages",
    setup: "Setup",
    internet: "Internet",
    files: "Files",
    compaction: "Shortening",
    context: "Context",
    nudges: "Nudges",
  },
  precise: {
    thinking: "Reasoning",
    actions: "Tools",
    approvals: "Gates",
    messages: "Mail",
    setup: "Provision",
    internet: "Network",
    files: "Media",
    compaction: "Compaction",
    context: "Transforms",
    nudges: "Director",
  },
};

export function phrase(wording: Wording, precise: string, plain: string): string {
  return wording === "plain" ? plain : precise;
}

export function kindLabel(kind: SpanKind, wording: Wording): string {
  return wording === "plain" ? KIND_PLAIN[kind] : KIND_PRECISE[kind];
}

export function focusKeyOf(kind: SpanKind): FocusKey | null {
  for (const key of FOCUS_KEYS) {
    if (FOCUS_KINDS[key].includes(kind)) return key;
  }
  return null;
}

export function focusKeepsKind(kind: SpanKind, focus: TraceFocus): boolean {
  const key = focusKeyOf(kind);
  if (key === null) return true;
  return focus[key];
}

export function focusKeeps(span: Span, focus: TraceFocus): boolean {
  return focusKeepsKind(span.kind, focus);
}

export function effectLabel(effect: GrantEffect | "none", wording: Wording): string {
  if (wording === "precise") return effect;
  if (effect === "allow") return "Allowed";
  if (effect === "deny") return "Denied";
  if (effect === "ask") return "Asked";
  return "None";
}

export function originLabel(origin: GrantOrigin, wording: Wording): string {
  if (wording === "precise") return origin;
  if (origin === "system") return "a built-in rule";
  if (origin === "role") return "their role";
  if (origin === "creator") return "the person who set it up";
  return "the person who started the run";
}

export function placementStatus(status: string, wording: Wording): string {
  if (wording === "precise") return status;
  if (status === "pending") return "waiting";
  if (status === "provisioning") return "starting";
  if (status === "allocated") return "ready";
  if (status === "replacing") return "swapping";
  if (status === "releasing") return "shutting down";
  if (status === "destroy_failed") return "could not shut down";
  if (status === "released") return "finished";
  if (status === "failed") return "failed";
  return status;
}

/** Small label beside the row. Precise keeps the tool name when the title was rewritten. */
export function rowMarker(span: Span, wording: Wording): string {
  const title = stepTitle(span, wording);
  if (title === span.name || wording === "plain") return kindLabel(span.kind, wording);
  return span.name;
}

/** The row title: what the step did, not only the tool that did it. */
export function stepTitle(span: Span, wording: Wording): string {
  const did = whatItDid(span);
  if (did !== undefined) return did;
  if (span.compaction !== undefined) {
    return `${span.compaction.turnsBefore} turns down to ${span.compaction.turnsAfter}, ${compactionLine(span.compaction)}`;
  }
  if (span.nudge !== undefined) return span.nudge.because;
  if (span.contextChange !== undefined) return span.contextChange.summary;
  if (span.kind === "reasoning" && span.thinking !== undefined) {
    const line = span.thinking.split("\n")[0] ?? span.thinking;
    return line.length > 88 ? `${line.slice(0, 85)}…` : line;
  }
  if (wording === "plain") return NAME_PLAIN[span.name] ?? span.name;
  return span.name;
}

export function compactionLine(compaction: Compaction): string {
  return `${formatTokens(compaction.tokensBefore)} down to ${formatTokens(compaction.tokensAfter)}`;
}

function whatItDid(span: Span): string | undefined {
  const hop = span.network?.[0];
  if (hop !== undefined) return `${hop.method} ${shortUrl(hop.url)}`;
  const record = recordOf(span.input);
  if (record === undefined) return undefined;
  const command = text(record, "command") ?? text(record, "cmd");
  if (command !== undefined) return command;
  const pattern = text(record, "pattern");
  const path = text(record, "path") ?? text(record, "file");
  if (pattern !== undefined && !span.name.includes(pattern)) {
    return path === undefined ? `Find ${pattern}` : `Find ${pattern} in ${path}`;
  }
  if (path !== undefined && !span.name.includes(path)) return `${verb(span.name)} ${path}`;
  const url = text(record, "url");
  if (url !== undefined) return shortUrl(url);
  return undefined;
}

function verb(name: string): string {
  if (name === "write_file" || name === "write") return "Write";
  if (name === "read_file" || name === "read") return "Read";
  if (name.includes("_")) return name.replaceAll("_", " ");
  return name;
}

function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function recordOf(input: string | undefined): Record<string, unknown> | undefined {
  if (input === undefined || !input.startsWith("{")) return undefined;
  try {
    const value: unknown = JSON.parse(input);
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const record: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value)) record[key] = item;
      return record;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function text(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
