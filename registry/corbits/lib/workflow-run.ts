import type { BadgeTone } from "@/registry/corbits/ui/badge";
import type { StatusDotTone } from "@/registry/corbits/ui/status-dot";

/**
 * What a caller needs to know about a run without knowing what the run *did*.
 *
 * Status, identity and timing only. What a run produced — its blocks, its
 * output, its event log — is a separate contract and deliberately not modelled
 * here: a strip that lists runs should not have to understand their contents,
 * and a surface that renders contents can take this alongside them.
 */

export type RunStatus =
  /** Accepted, not yet executing. */
  | "provisioning"
  | "running"
  /** Parked on a human decision. The only status that is *asking* for something. */
  | "awaiting"
  | "completed"
  | "failed"
  | "stopped";

export type WorkflowRunSummary = {
  readonly runId: string;
  /** Human title for the run's kind, e.g. "Daily brief". Already humanised. */
  readonly title: string;
  readonly status: RunStatus;
  /** ISO timestamp of when the run started. */
  readonly startedAt: string;
  /** Where the run opens. */
  readonly href?: string;
};

export const RUN_STATUS_LABEL: Record<RunStatus, string> = {
  provisioning: "Starting",
  running: "Running",
  awaiting: "Needs you",
  completed: "Completed",
  failed: "Failed",
  stopped: "Stopped",
};

/**
 * State is the only colour on these surfaces. `awaiting` is the one orange:
 * it is the single status a person can act on, and orange is the registry's
 * "this is for you" tone.
 */
export const RUN_STATUS_TONE: Record<RunStatus, BadgeTone> = {
  provisioning: "neutral",
  running: "info",
  awaiting: "accent",
  completed: "success",
  failed: "danger",
  stopped: "neutral",
};

/**
 * The dot only marks liveness and failure — the badge above carries the full
 * status colour. See `status-dot.tsx` for why it is three tones and not six.
 */
export const RUN_STATUS_DOT_TONE: Record<RunStatus, StatusDotTone> = {
  provisioning: "neutral",
  running: "emphasis",
  awaiting: "emphasis",
  completed: "neutral",
  failed: "danger",
  stopped: "neutral",
};

/** A run that will not change again without someone starting a new one. */
export function isTerminalRun(status: RunStatus): boolean {
  return status === "completed" || status === "failed" || status === "stopped";
}

/** Still moving or still asking — what an "active runs" strip shows. */
export function isActiveRun(status: RunStatus): boolean {
  return !isTerminalRun(status);
}

// Needs-you first, then in-flight, then whatever finished. Failed sorts above
// completed because a failure is the finished run most likely to need a human.
const ATTENTION_RANK: Record<RunStatus, number> = {
  awaiting: 0,
  running: 1,
  provisioning: 1,
  failed: 2,
  completed: 3,
  stopped: 4,
};

/** Attention order, newest first within a band. Sorts a copy. */
export function sortRunsByAttention(runs: readonly WorkflowRunSummary[]): readonly WorkflowRunSummary[] {
  return [...runs].sort((a, b) => {
    const byAttention = ATTENTION_RANK[a.status] - ATTENTION_RANK[b.status];
    if (byAttention !== 0) return byAttention;
    return Date.parse(b.startedAt) - Date.parse(a.startedAt);
  });
}
