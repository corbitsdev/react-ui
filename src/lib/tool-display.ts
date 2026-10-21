import type { ToolTraceStatus } from "./chat-parts.js";
import {
  isAwaitingApproval,
  type ActivityStep,
} from "./conversation-activity.js";
import type { PartTool } from "./conversation.js";

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
