import type { StepDisplayStatus, StepListItem } from "./workflow-registry.js";

/**
 * How a display step behaves at runtime — a renderer-facing vocabulary for
 * drawing a gate differently from a sleep differently from a child-workflow
 * spawn, independent of whatever primitive-kind enum the host's workflow
 * engine uses internally.
 */
export type DisplayStepCharacter =
  | "deterministic"
  | "reasoning"
  | "gate"
  | "await"
  | "action"
  | "sleep"
  | "child"
  | "other";

/** One display step derived from a single runtime primitive. `after` is
 * carried through unmodified so a renderer can lay out parallel branches
 * honestly instead of flattening the DAG into a single line. */
export type DisplayFlowStep = {
  readonly stepId: string;
  readonly label: string;
  readonly character: DisplayStepCharacter;
  readonly after: readonly string[];
};

/** The full derived display model for one workflow definition, already in
 * run order. */
export type DisplayFlow = {
  readonly steps: readonly DisplayFlowStep[];
};

/**
 * What `deriveDisplayFlow` needs to know about one runtime primitive. The
 * host's workflow engine owns the real primitive-kind enum and any
 * author-tagging convention for a friendlier label or a deterministic flag —
 * this shape asks the host to resolve those once, at the boundary, rather
 * than importing the host's tag vocabulary in here.
 */
export type WorkflowStepPrimitive = {
  readonly stepId: string;
  readonly kind:
    | "step"
    | "map"
    | "gate"
    | "awaitSignal"
    | "escalation"
    | "sleep"
    | "childWorkflow"
    | "action"
    | "other";
  /** Already-humanised label. The step id is used verbatim when omitted. */
  readonly label?: string;
  readonly after?: readonly string[];
  /** True for a `step`/`map` primitive the host tags as deterministic tool
   * work rather than a model call — everything else defaults to `reasoning`. */
  readonly deterministic?: boolean;
};

function characterOf(primitive: WorkflowStepPrimitive): DisplayStepCharacter {
  switch (primitive.kind) {
    case "step":
    case "map":
      return primitive.deterministic === true ? "deterministic" : "reasoning";
    case "gate":
      return "gate";
    case "awaitSignal":
    case "escalation":
      return "await";
    case "sleep":
      return "sleep";
    case "childWorkflow":
      return "child";
    case "action":
      return "action";
    default:
      return "other";
  }
}

/**
 * Projects a workflow's runtime primitives into one display step per
 * primitive, in the order given. The host resolves each primitive's label
 * and deterministic flag before calling this — that keeps any
 * author-tagging convention (a legacy tag, a metadata field) out of a
 * published library, where the tag vocabulary would become part of the
 * public surface.
 */
export function deriveDisplayFlow(primitives: readonly WorkflowStepPrimitive[]): DisplayFlow {
  return {
    steps: primitives.map((primitive) => ({
      stepId: primitive.stepId,
      label: primitive.label ?? primitive.stepId,
      character: characterOf(primitive),
      after: primitive.after ?? [],
    })),
  };
}

/** A curated group of runtime steps, as declared by whoever authored the
 * curation (a workflow author, a preview overlay). */
export type DisplayOverlayGroup = {
  readonly key: string;
  readonly label: string;
  readonly steps: readonly string[];
  readonly activityLabel?: string;
};

export type DisplayOverlay = {
  readonly groups: readonly DisplayOverlayGroup[];
};

/** One curated group after applying a `DisplayOverlay` to a `DisplayFlow`. */
export type OverlaidDisplayStep = {
  readonly key: string;
  readonly label: string;
  readonly character: DisplayStepCharacter;
  readonly stepIds: readonly string[];
  readonly activityLabel?: string;
};

export type OverlaidDisplayFlow = {
  readonly groups: readonly OverlaidDisplayStep[];
};

/**
 * Aggregation priority when a curated group clusters several runtime steps
 * with different characters — the strongest signal wins so a group never
 * under-represents itself (a group containing one human `await` step reads
 * as `await` even if every other step in it is `deterministic`).
 */
const CHARACTER_PRIORITY: readonly DisplayStepCharacter[] = [
  "await",
  "gate",
  "child",
  "action",
  "reasoning",
  "sleep",
  "deterministic",
  "other",
];

function aggregateCharacter(characters: readonly DisplayStepCharacter[]): DisplayStepCharacter {
  for (const candidate of CHARACTER_PRIORITY) {
    if (characters.includes(candidate)) return candidate;
  }
  return "other";
}

/**
 * Curates a derived `DisplayFlow` into an author's declared groups. Every
 * group's `steps` is validated against the flow's actual step ids — an
 * unknown id throws immediately rather than silently producing an empty or
 * partial group.
 */
export function applyDisplayOverlay(flow: DisplayFlow, overlay: DisplayOverlay): OverlaidDisplayFlow {
  const byId = new Map(flow.steps.map((step) => [step.stepId, step]));
  const groups: OverlaidDisplayStep[] = overlay.groups.map((group) => {
    const characters: DisplayStepCharacter[] = [];
    for (const stepId of group.steps) {
      const step = byId.get(stepId);
      if (step === undefined) {
        throw new Error(`display overlay group ${JSON.stringify(group.key)} references unknown step ${JSON.stringify(stepId)}`);
      }
      characters.push(step.character);
    }
    return {
      key: group.key,
      label: group.label,
      character: aggregateCharacter(characters),
      stepIds: group.steps,
      ...(group.activityLabel !== undefined ? { activityLabel: group.activityLabel } : {}),
    };
  });
  return { groups };
}

/**
 * Maps pure display-flow steps into `StepList` items, all `pending` unless a
 * status lookup is given — the host overlays real run state on top once it
 * has any.
 */
export function stepListFromDisplayFlow(
  steps: readonly DisplayFlowStep[],
  statusById?: ReadonlyMap<string, StepDisplayStatus> | Record<string, StepDisplayStatus>,
): StepListItem[] {
  const lookup =
    statusById instanceof Map
      ? (id: string) => statusById.get(id)
      : statusById !== undefined
        ? (id: string) => (statusById as Record<string, StepDisplayStatus | undefined>)[id]
        : () => undefined;

  return steps.map((step) => ({
    id: step.stepId,
    name: step.label,
    status: lookup(step.stepId) ?? "pending",
    character: step.character,
  }));
}
