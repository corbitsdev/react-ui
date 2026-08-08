import { classifyRunError } from "./workflow-run-error.js";

/**
 * Shared run-progress reasoning for a stepper or sidebar rendering a
 * workflow's live progress.
 *
 * `RunProgress` is a plain, generic snapshot — a phase and a step-id-to-phase
 * map — rather than the host's own run-state type. A step is only marked
 * `"completed"` once the host's runtime actually resolves its output, and
 * that resolution can lag behind a gate's own phase (an `awaiting-signal`
 * step's completion event can be missing from a projection for a beat), so a
 * gate's own phase is not a reliable "done" signal on its own. The robust
 * rule encoded here: a step counts as passed once its own phase is completed
 * OR any later step has progressed at all.
 */
export type StepPhase = "pending" | "in-flight" | "awaiting-signal" | "awaiting-timer" | "completed" | "failed";

export type RunPhase = "pending" | "in-flight" | "completed" | "failed";

export type RunStepSnapshot = {
  readonly phase: StepPhase;
  /** Sanitizable raw error text — pass through `classifyRunError` before display. */
  readonly lastErrorMessage?: string;
};

export type RunProgress = {
  readonly phase: RunPhase;
  readonly steps: ReadonlyMap<string, RunStepSnapshot>;
};

export type WorkflowStepStatus = "completed" | "current" | "pending" | "failed";

/** A single step descriptor for a stepper or sidebar. */
export type WorkflowStep = {
  readonly number: number;
  readonly label: string;
  readonly status: WorkflowStepStatus;
};

/**
 * A stepper entry backed by one or more runtime step ids, in run order. A
 * linear workflow maps one runtime id per display step; a clustered one
 * (a multi-source research phase, say) groups several. The group's *last* id
 * is its terminal step — the group only reads `completed` once that one does.
 */
export type DisplayStep = {
  readonly key: string;
  readonly label: string;
  readonly stepIds: readonly string[];
  /** Present-progress verb shown on a live status line while this step is
   * in-flight (e.g. "Saving to workbench"). Omit for a human gate or an
   * intake step — an unlabeled active step shows no line rather than
   * inventing one. */
  readonly activityLabel?: string;
};

export function getStepPhase(progress: RunProgress | null, stepId: string): StepPhase | undefined {
  return progress?.steps.get(stepId)?.phase;
}

export function isStepRunning(phase: StepPhase | undefined): boolean {
  return phase === "in-flight" || phase === "awaiting-signal" || phase === "awaiting-timer";
}

/** The aggregate phase of a display step from its runtime steps. */
export function displayStepPhase(progress: RunProgress | null, stepIds: readonly string[]): StepPhase | undefined {
  if (stepIds.length === 0) return undefined;
  const terminal = stepIds[stepIds.length - 1];
  if (terminal !== undefined && getStepPhase(progress, terminal) === "completed") return "completed";
  for (const id of stepIds) {
    const phase = getStepPhase(progress, id);
    if (isStepRunning(phase)) return phase;
  }
  for (const id of stepIds) {
    if (getStepPhase(progress, id) === "failed") return "failed";
  }
  for (const id of stepIds) {
    if (getStepPhase(progress, id) !== undefined) return "in-flight";
  }
  return undefined;
}

function hasAnyProgress(progress: RunProgress | null, step: DisplayStep): boolean {
  return step.stepIds.some((id) => getStepPhase(progress, id) !== undefined);
}

/**
 * Index of the display step the run is currently on. A step whose own phase
 * is `failed` is never treated as passed even when a later, independently
 * running branch has progressed — independent steps can run concurrently, so
 * a later step's progress says nothing about whether this one failed.
 * Returns the last index once every step is complete.
 */
export function activeDisplayStepIndex(progress: RunProgress | null, steps: readonly DisplayStep[]): number {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step === undefined) continue;
    const phase = displayStepPhase(progress, step.stepIds);
    if (phase === "completed") continue;
    if (phase === "failed") return i;
    const laterProgressed = steps.slice(i + 1).some((later) => hasAnyProgress(progress, later));
    if (laterProgressed) continue;
    return i;
  }
  return Math.max(0, steps.length - 1);
}

export function buildStepperSteps(progress: RunProgress | null, steps: readonly DisplayStep[]): WorkflowStep[] {
  const activeIdx = activeDisplayStepIndex(progress, steps);
  // A completed run marks every entry done: the final step's output can lag
  // behind the run's own terminal phase, and without this it would linger
  // as "current" on an already-finished run.
  const runCompleted = progress?.phase === "completed";
  return steps.map((step, i) => {
    let status: WorkflowStepStatus;
    if (runCompleted || i < activeIdx) {
      status = "completed";
    } else if (i > activeIdx) {
      status = "pending";
    } else {
      const phase = displayStepPhase(progress, step.stepIds);
      status = phase === "completed" ? "completed" : phase === "failed" ? "failed" : "current";
    }
    return { number: i + 1, label: step.label, status };
  });
}

/** The active display step, or `null` while the run is terminal. */
export function activeDisplayStep(progress: RunProgress | null, steps: readonly DisplayStep[]): DisplayStep | null {
  if (steps.length === 0) return null;
  return steps[activeDisplayStepIndex(progress, steps)] ?? null;
}

/**
 * The "what's happening now" verb for a live status line, taken from the
 * active step's `activityLabel`. Returns `null` — showing no line — once the
 * run is terminal, while the first step owns its own loading UI, once the
 * active group is done or parked on a human gate, or when the active step
 * carries no `activityLabel` at all (a gate or intake step): silence there is
 * correct, never a stepper noun standing in for it.
 */
export function liveStatusLabel(progress: RunProgress | null, steps: readonly DisplayStep[]): string | null {
  if (progress === null) return null;
  if (progress.phase === "failed" || progress.phase === "completed") return null;
  const idx = activeDisplayStepIndex(progress, steps);
  if (idx === 0) return null;
  const step = steps[idx];
  if (step === undefined) return null;
  const phase = displayStepPhase(progress, step.stepIds);
  if (phase === "completed" || phase === "awaiting-signal") return null;
  return step.activityLabel ?? null;
}

/** Label of the first display step whose aggregate phase is `failed`. Does
 * not require `progress.phase === "failed"` — a caller flagging failure from
 * a single failed step ahead of the run's own phase flip still gets a name. */
export function failedDisplayStepLabel(progress: RunProgress | null, steps: readonly DisplayStep[]): string | null {
  if (progress === null) return null;
  for (const step of steps) {
    if (displayStepPhase(progress, step.stepIds) === "failed") return step.label;
  }
  return null;
}

/** The sanitized end-user message from whichever step failed the run, or
 * `null` if the run has not failed or no step carries an error. Uses the
 * first error found in map-iteration order — a run design that attaches an
 * error to more than one step at once is a design this cannot disambiguate. */
export function failedRunErrorMessage(progress: RunProgress | null): string | null {
  if (progress?.phase !== "failed") return null;
  for (const step of progress.steps.values()) {
    if (step.lastErrorMessage !== undefined) return classifyRunError(step.lastErrorMessage).userMessage;
  }
  return null;
}

/**
 * True only for a genuine never-started run: a non-null progress with an
 * empty step map, where that emptiness came from an event log that was
 * actually read. `logRead` distinguishes that from a log-unavailable fallback
 * (a legacy run, or a read error) that can synthesize the same empty-step
 * shape regardless of phase — in that case whether it started is unknown, so
 * this returns `false` rather than making a false "never started" claim.
 */
export function runNeverStarted(progress: RunProgress | null, logRead: boolean): boolean {
  return progress !== null && logRead && progress.steps.size === 0;
}

/** Honest copy for the pre-interactive window before a run's first step has
 * recorded any activity: queued (`pending`, or no progress yet) reads
 * differently from a runtime already booting that first step. */
export function runStartLabel(progress: RunProgress | null): string {
  if (progress === null || progress.phase === "pending") return "Starting your workflow…";
  return "Preparing your workflow…";
}
