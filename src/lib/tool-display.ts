import {
  isAwaitingApproval,
  type ActivityStep,
} from "./conversation-activity.js";
import type { PartTool, ToolTraceStatus } from "./conversation.js";

/**
 * The execution status a tool call shows, with its approval record taken
 * into account. A call waiting on a person reads as `approval-requested`
 * whatever its own status says. A call whose record is settled no longer
 * waits: approved, it is about to run (`pending`); refused, timed out or
 * expired, it never ran (`output-denied`).
 */
export function displayedToolStatus(part: PartTool): ToolTraceStatus {
  if (isAwaitingApproval(part)) return "approval-requested";
  if (part.status !== "approval-requested") return part.status;
  return part.approval?.status === "approved" ? "pending" : "output-denied";
}

/** How many calls failed, counting each call inside a batch. */
export function countFailedTools(steps: readonly ActivityStep[]): number {
  return steps.reduce((total, step) => {
    if (step.kind === "tool-batch") return total + countFailedTools(step.tools);
    if (step.kind === "tool-trace" && displayedToolStatus(step) === "error")
      return total + 1;
    return total;
  }, 0);
}

/**
 * A raw tool name as words: `calendar__create_event` reads as the action
 * "Create event" from the source "Calendar". A name with no source is all
 * action.
 */
export function toolTitle(name: string): {
  readonly action: string;
  readonly source: string | undefined;
} {
  const words = (text: string) => text.replace(/[_-]+/g, " ").trim();
  const capital = (text: string) =>
    text.charAt(0).toUpperCase() + text.slice(1);
  const split = name.lastIndexOf("__");
  const action = split > 0 ? words(name.slice(split + 2)) : "";
  // No source, or nothing after it (`files__`): the whole name is the action.
  if (action === "") return { action: capital(words(name)), source: undefined };
  return {
    action: capital(action),
    source: capital(words(name.slice(0, split))),
  };
}

/** Tool input or output as text: strings as they are, anything else as indented JSON. */
export function formatToolValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2) ?? String(value);
  } catch {
    // Circular structures and BigInt values have no JSON form.
    return String(value);
  }
}
