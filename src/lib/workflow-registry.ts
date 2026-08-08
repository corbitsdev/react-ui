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

export type WorkflowStatusTone = "running" | "awaiting" | "done" | "paused" | "fail";

export const WORKFLOW_STATUS_LABEL: Record<WorkflowStatusTone, string> = {
  running: "Running",
  awaiting: "Needs you",
  done: "Done",
  paused: "Paused",
  fail: "Failed",
};

/** Chip tone for `StatusChip`, aligned with `Badge`'s contrast-tested tones. */
export const WORKFLOW_STATUS_BADGE_TONE: Record<WorkflowStatusTone, BadgeTone> = {
  running: "info",
  awaiting: "accent",
  done: "success",
  paused: "neutral",
  fail: "danger",
};

/** Dot tone for the same chip — see `status-dot.tsx` for why only three exist. */
export const WORKFLOW_STATUS_DOT_TONE: Record<WorkflowStatusTone, StatusDotTone> = {
  running: "emphasis",
  awaiting: "emphasis",
  done: "neutral",
  paused: "neutral",
  fail: "danger",
};

export function workflowScopeLabel(scope: WorkflowScope): string {
  return scope === "tenant" ? "Everyone" : "Just me";
}

/** A live run's phase as an inspector or list row reports it — a coarser
 * vocabulary than `RunStatus` in `workflow-run.ts` (no `provisioning`), for
 * surfaces that only distinguish what a reader can act on. */
export type LiveRunPhase = "running" | "awaiting" | "completed" | "failed" | "cancelled";

export const LIVE_RUN_PHASE_TONE: Record<LiveRunPhase, WorkflowStatusTone> = {
  running: "running",
  awaiting: "awaiting",
  completed: "done",
  failed: "fail",
  cancelled: "fail",
};

export const LIVE_RUN_PHASE_LABEL: Record<LiveRunPhase, string> = {
  running: "Running",
  awaiting: "Needs you",
  completed: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

export type WorkflowListItemKind = "run" | "schedule";

/** One dense row in the combined live-runs-and-schedules list. */
export type WorkflowListItem = {
  readonly id: string;
  readonly itemKind: WorkflowListItemKind;
  /** Primary label — the workflow's kind, already humanised. */
  readonly title: string;
  /** Secondary line under the title: an alias, an origin tag. */
  readonly subtitle?: string;
  /** The "when" column: origin phrase for a run, cadence for a schedule. */
  readonly when: string;
  readonly scope: WorkflowScope;
  readonly statusTone: WorkflowStatusTone;
  readonly statusLabel: string;
  /** Next-fire or elapsed text, already formatted by the caller. */
  readonly nextOrElapsed: string;
  /** Highlights `nextOrElapsed` — the next fire is close, or the run is fresh. */
  readonly nextSoon?: boolean;
  /** A live run parked on a human decision gets a subtle accent stripe. */
  readonly needsYou?: boolean;
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

/** One offering in a workflow-kind picker (distinct from `WorkflowOffering` in
 * `workflow-catalog.tsx`, which drives the run-once grid): this shape adds
 * category grouping and an "already on" badge for a picker that lists kinds
 * to attach to a schedule or an automation rather than to run once. */
export type KindPickerItem = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  /** Grouping key. Omit when every item shares one category. */
  readonly category?: string;
  readonly categoryLabel?: string;
  readonly alreadyOn?: boolean;
  readonly alreadyOnLabel?: string;
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
