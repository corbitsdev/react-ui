import type { BadgeTone } from "../ui/badge.js";
import type { StatusDotTone } from "../ui/status-dot.js";
import type { DisplayStepCharacter } from "./workflow-display-flow.js";

/**
 * Shapes for the unified workflows registry surface: a combined list of live
 * runs and schedules, plus the inspector and picker that sit next to it.
 *
 * `WorkflowScope` and `WorkflowStatusTone` are a coarser vocabulary than
 * `RunStatus` in `workflow-run.ts` — that module models one run's lifecycle
 * (`provisioning` through `stopped`) for the active-runs dock; this module
 * models the tone a *list row or inspector chip* renders, which collapses a
 * schedule's paused/active state and a run's phase onto the same five tones.
 * They are deliberately not merged: a dock strip and a combined registry list
 * answer different questions about the same underlying runs.
 */
export type WorkflowScope = "personal" | "tenant";

export type WorkflowStatusTone =
  | "running"
  | "awaiting"
  | "done"
  | "paused"
  | "fail";

export const WORKFLOW_STATUS_LABEL: Record<WorkflowStatusTone, string> = {
  running: "Running",
  awaiting: "Needs you",
  done: "Done",
  paused: "Paused",
  fail: "Failed",
};

/** Badge tone for a status chip composed as `<Badge tone={...}><StatusDot .../>{label}</Badge>`. */
export const WORKFLOW_STATUS_BADGE_TONE: Record<WorkflowStatusTone, BadgeTone> =
  {
    running: "info",
    awaiting: "accent",
    done: "success",
    paused: "neutral",
    fail: "danger",
  };

/** Dot tone for the same chip — see `status-dot.tsx` for why only three exist. */
export const WORKFLOW_STATUS_DOT_TONE: Record<
  WorkflowStatusTone,
  StatusDotTone
> = {
  running: "emphasis",
  awaiting: "emphasis",
  done: "neutral",
  paused: "neutral",
  fail: "danger",
};

/** Whether a status tone's dot pulses by default — the two tones that are
 * still moving or still waiting on someone. A caller composing `Badge` +
 * `StatusDot` directly (there is no `StatusChip` component) passes this as
 * `StatusDot`'s `live` prop unless it has a more specific signal. */
export function workflowStatusLive(tone: WorkflowStatusTone): boolean {
  return tone === "running" || tone === "awaiting";
}

export function workflowScopeLabel(scope: WorkflowScope): string {
  return scope === "tenant" ? "Everyone" : "Just me";
}

/** Badge tone for a workflow's scope. `tenant` gets the info tone so it reads
 * as shared infrastructure; `personal` gets the accent tone that marks
 * "yours" everywhere else in the registry. */
export const WORKFLOW_SCOPE_BADGE_TONE: Record<WorkflowScope, BadgeTone> = {
  tenant: "info",
  personal: "accent",
};

export type GateKind = "reviewList" | "choice" | "form" | "multiSelect";

export const GATE_KIND_LABEL: Record<GateKind, string> = {
  reviewList: "Needs you · review",
  choice: "Needs you · choice",
  form: "Needs you · form",
  multiSelect: "Needs you · select",
};

/** Shell model for a pending gate; the interactive payload is the caller's. */
export type GateShellModel = {
  readonly kind: GateKind;
  readonly title: string;
  readonly prompt?: string;
};

export type StepDisplayStatus = "pending" | "active" | "done" | "failed";

/** One step row in the live inspector's step list. */
export type StepListItem = {
  readonly id: string;
  readonly name: string;
  readonly status: StepDisplayStatus;
  readonly meta?: string;
  readonly character?: DisplayStepCharacter;
};
