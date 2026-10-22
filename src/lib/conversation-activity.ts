import type {
  ConversationPart,
  PartReasoning,
  PartTool,
  PartToolBatch,
} from "./conversation.js";

/** A part that folds into an activity run: thinking or tool work. */
export type ActivityStep = PartReasoning | PartTool | PartToolBatch;

/**
 * A message's parts as they render: each stretch of thinking and tool work as
 * one `activity` group, everything else as its own `part`. `key` is derived
 * from the position the group starts at, so it stays put while a streaming
 * message appends parts. A change that splits or joins runs (a call starting
 * or stopping to wait on a person) re-keys the runs after it.
 */
export type ConversationPartGroup =
  | {
      readonly kind: "activity";
      readonly key: string;
      readonly steps: readonly ActivityStep[];
    }
  | {
      readonly kind: "part";
      readonly key: string;
      readonly part: ConversationPart;
    };

/**
 * Whether a tool call is waiting on a person. The approval record decides
 * when there is one; without it, the call's own `approval-requested` status
 * does.
 */
export function isAwaitingApproval(part: PartTool): boolean {
  if (part.approval !== undefined) return part.approval.status === "pending";
  return part.status === "approval-requested";
}

function foldable(part: ConversationPart): part is ActivityStep {
  switch (part.kind) {
    case "reasoning":
      return true;
    case "tool-trace":
      return !isAwaitingApproval(part);
    case "tool-batch":
      return !part.tools.some(isAwaitingApproval);
    default:
      return false;
  }
}

/**
 * Folds consecutive thinking and tool parts into one activity group. Any other
 * part ends the run. A call waiting on a person, alone or inside a batch,
 * never folds: it stands as its own part so the question is never hidden.
 */
export function groupActivity(
  parts: readonly ConversationPart[],
): readonly ConversationPartGroup[] {
  const groups: ConversationPartGroup[] = [];
  // The open run's steps; the group pushed for it holds this same array.
  let run: ActivityStep[] | null = null;

  parts.forEach((part, index) => {
    if (!foldable(part)) {
      run = null;
      groups.push({ kind: "part", key: `${part.kind}-${index}`, part });
      return;
    }
    if (run === null) {
      run = [];
      groups.push({ kind: "activity", key: `activity-${index}`, steps: run });
    }
    run.push(part);
  });

  return groups;
}

function formatDuration(ms: number): string {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

function countSteps(steps: readonly ActivityStep[]): number {
  return steps.reduce((total, step) => {
    if (step.kind === "tool-batch") return total + step.tools.length;
    if (step.kind === "tool-trace") return total + 1;
    return total;
  }, 0);
}

/**
 * The one line a folded run shows: "Thought for 4s · 3 steps". Thinking time
 * sums every known reasoning duration and is left out when none is known;
 * each call inside a batch counts as its own step.
 */
export function summarizeActivity(steps: readonly ActivityStep[]): string {
  const reasoning = steps.filter(
    (step): step is PartReasoning => step.kind === "reasoning",
  );
  const known = reasoning.flatMap((step) =>
    step.durationMs === undefined ? [] : [step.durationMs],
  );
  const thinking =
    reasoning.length === 0
      ? null
      : known.length === 0
        ? "Thought"
        : `Thought for ${formatDuration(known.reduce((sum, ms) => sum + ms, 0))}`;

  const stepCount = countSteps(steps);
  const work =
    stepCount === 0
      ? null
      : `${stepCount} ${stepCount === 1 ? "step" : "steps"}`;

  if (thinking === null)
    return work === null ? "Worked" : `Worked through ${work}`;
  return work === null ? thinking : `${thinking} · ${work}`;
}
