"use client";

import { ChevronDown } from "lucide-react";
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ComponentProps, ReactNode } from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import {
  summarizeActivity,
  type ActivityStep,
} from "../lib/conversation-activity.js";
import type { PartTool } from "../lib/conversation.js";
import {
  countFailedTools,
  displayedToolStatus,
  toolTitle,
} from "../lib/tool-display.js";
import { cn } from "../lib/utils.js";
import {
  ActivityAgents,
  type ActivityAgent,
  type ActivityAgentsLabels,
} from "./activity-agents.js";
import { ActivitySpinner } from "./activity-spinner.js";
import { Reasoning } from "./reasoning.js";
import { Tool } from "./tool.js";
import { ToolGroup } from "./tool-group.js";

/** An opened run lists its latest steps; older ones wait behind a control. */
const SHOWN_STEPS = 10;

type ActivityContextValue = {
  readonly steps: readonly ActivityStep[];
  readonly streaming: boolean;
  readonly open: boolean;
  readonly toggle: () => void;
  readonly contentId: string;
};

const ActivityContext = createContext<ActivityContextValue | null>(null);

function useActivityContext(part: string): ActivityContextValue {
  const context = useContext(ActivityContext);
  if (context === null) throw new Error(`${part} must be inside an Activity.`);
  return context;
}

export type ActivityProps = ComponentProps<"div"> & {
  /** One run of thinking and tool work, e.g. an `activity` group from `groupActivity`. */
  readonly steps: readonly ActivityStep[];
  /** The run is still going. While it is, the line shows a spinner, even before the first step. */
  readonly streaming?: boolean | undefined;
  /** Agents the run handed work to, shown under its steps as `ActivityAgents`. */
  readonly agents?: readonly ActivityAgent[] | undefined;
  readonly agentLabels?: Partial<ActivityAgentsLabels> | undefined;
  /** Controlled open state. Pair with `onOpenChange`. */
  readonly open?: boolean | undefined;
  readonly defaultOpen?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
};

/** An opened agent's own steps, drawn as an opened run of its own. */
function agentSteps(agent: ActivityAgent): ReactNode {
  return (
    <Activity steps={agent.steps} streaming={agent.state === "working"} open>
      <ActivityContent />
    </Activity>
  );
}

/**
 * A stretch of an agent's work, thinking and tool calls however many, as one
 * block. Folded by default, live or done: closed, it is one summary line
 * ("Thought for 4s · 3 steps") and nothing of the steps is in the page.
 * Opened, it lists every step in order, newest last, the latest ten first
 * with the rest behind a control. A finished thought with no text has
 * nothing to show and is left out.
 *
 * Work it handed to other agents follows as `ActivityAgents`: a calm row
 * per agent, opened to its own steps drawn the same way.
 *
 * Without children it renders `ActivityTrigger`, `ActivityContent` and,
 * given agents, `ActivityAgents`. Renders nothing for a run with no steps,
 * no agents and nothing streaming.
 */
export function Activity({
  steps,
  agents = [],
  agentLabels,
  streaming = false,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}: ActivityProps) {
  const contentId = useId();
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
    name: "Activity",
  });

  if (steps.length === 0 && agents.length === 0 && !streaming) return null;

  return (
    <ActivityContext.Provider
      value={{
        steps,
        streaming,
        open,
        toggle: () => setOpen(!open),
        contentId,
      }}
    >
      <div
        data-slot="activity"
        data-streaming={streaming || undefined}
        className={cn("flex min-w-0 flex-col text-sm", className)}
        {...props}
      >
        {children ?? (
          <>
            {steps.length > 0 || streaming ? <ActivityTrigger /> : null}
            <ActivityContent />
            {agents.length > 0 ? (
              <ActivityAgents
                agents={agents}
                labels={agentLabels}
                renderSteps={agentSteps}
                className="mt-2"
              />
            ) : null}
          </>
        )}
      </div>
    </ActivityContext.Provider>
  );
}

export type ActivityTriggerLabels = {
  readonly failed: (count: number) => string;
  /** While streaming, with more than one call running. */
  readonly runningMany: (count: number) => string;
  /** While streaming, when the newest step is thinking. */
  readonly thinking: string;
  /** While streaming, otherwise. */
  readonly working: string;
};

const TRIGGER_LABELS: ActivityTriggerLabels = {
  failed: (count) => `${count} failed`,
  runningMany: (count) => `Running ${count} at once`,
  thinking: "Thinking",
  working: "Working",
};

export type ActivityTriggerProps = {
  /** Replaces the summary or live line. */
  readonly label?: ReactNode;
  readonly labels?: Partial<ActivityTriggerLabels> | undefined;
  readonly className?: string | undefined;
};

function runningTools(steps: readonly ActivityStep[]): readonly PartTool[] {
  return steps.flatMap((step) => {
    const tools =
      step.kind === "tool-batch"
        ? step.tools
        : step.kind === "tool-trace"
          ? [step]
          : [];
    return tools.filter((tool) => displayedToolStatus(tool) === "running");
  });
}

/** While live, what the run is doing right now, as one line. */
function liveLine(
  steps: readonly ActivityStep[],
  labels: ActivityTriggerLabels,
): string {
  const running = runningTools(steps);
  const [only] = running;
  if (running.length > 1) return `${labels.runningMany(running.length)}…`;
  if (only !== undefined) return `${toolTitle(only.name).action}…`;
  // Before its first step, a run is thinking.
  const last = steps.at(-1);
  return last === undefined || last.kind === "reasoning"
    ? `${labels.thinking}…`
    : `${labels.working}…`;
}

/** The run's one line, which opens and closes it. */
export function ActivityTrigger({
  label,
  labels: labelOverrides,
  className,
}: ActivityTriggerProps) {
  const { steps, streaming, open, toggle, contentId } =
    useActivityContext("ActivityTrigger");
  const labels = { ...TRIGGER_LABELS, ...labelOverrides };
  const failed = countFailedTools(steps);
  const line =
    label ?? (streaming ? liveLine(steps, labels) : summarizeActivity(steps));
  // Thinking before any step: nothing to open yet, so a status, not a button.
  // With no steps and nothing running there is no line to show at all.
  if (steps.length === 0)
    return !streaming ? null : (
      <span
        role="status"
        data-slot="activity-trigger"
        className={cn(
          "inline-flex max-w-full min-w-0 items-center gap-2 self-start px-1 py-1 text-foreground",
          className,
        )}
      >
        <ActivitySpinner />
        <span className="min-w-0 truncate">{line}</span>
      </span>
    );
  return (
    <button
      type="button"
      data-slot="activity-trigger"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      onClick={toggle}
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1.5 self-start rounded-md px-1 py-1 text-start text-muted-foreground transition-colors hover:text-foreground",
        streaming && "gap-2 text-foreground",
        className,
      )}
    >
      {streaming ? <ActivitySpinner /> : null}
      <span className="min-w-0 truncate">{line}</span>
      {failed > 0 ? (
        <span className="shrink-0 text-destructive">
          · {labels.failed(failed)}
        </span>
      ) : null}
      <ChevronDown
        aria-hidden
        className={cn(
          "size-3.5 shrink-0 motion-safe:transition-transform motion-safe:duration-200",
          open && "rotate-180",
        )}
      />
    </button>
  );
}

export type ActivityContentLabels = {
  readonly showEarlier: (count: number) => string;
};

const CONTENT_LABELS: ActivityContentLabels = {
  showEarlier: (count) =>
    `Show ${count} earlier ${count === 1 ? "step" : "steps"}`,
};

export type ActivityContentProps = {
  /**
   * Renders one step. Defaults to `Reasoning`, `Tool` or `ToolGroup` by
   * kind; a call with a settled approval shows its outcome, and while the
   * run streams a thought that is its newest step shows as still thinking.
   * `index` is the step's place in the run. It is not called for a finished
   * thought with no text.
   */
  readonly renderStep?:
    | ((step: ActivityStep, index: number) => ReactNode)
    | undefined;
  readonly labels?: Partial<ActivityContentLabels> | undefined;
  readonly className?: string | undefined;
};

type ShownStep = { readonly step: ActivityStep; readonly index: number };

function defaultStep(step: ActivityStep, live: boolean): ReactNode {
  switch (step.kind) {
    case "reasoning":
      return <Reasoning part={step} streaming={live} />;
    case "tool-trace":
      return <Tool part={step} />;
    case "tool-batch":
      return <ToolGroup part={step} />;
  }
}

function stepKey(step: ActivityStep, index: number): string {
  switch (step.kind) {
    case "reasoning":
      return `reasoning-${index}`;
    case "tool-trace":
      return `tool-${step.toolCallId}`;
    case "tool-batch":
      return `batch-${step.id}`;
  }
}

/**
 * The run's steps, while open: the latest ten, with a control for the rest.
 * A finished thought with no text is left out, as `Reasoning` shows nothing
 * for it. When a new step pushes the step holding focus behind the control,
 * focus moves to the control.
 */
export function ActivityContent({
  renderStep,
  labels: labelOverrides,
  className,
}: ActivityContentProps) {
  const { steps, streaming, open, contentId } =
    useActivityContext("ActivityContent");
  if (!open) return null;
  const live = (index: number) => streaming && index === steps.length - 1;
  // An empty item would still be read as a list item, take focus from "Show
  // earlier" and count toward the ten shown. Each keeps its index in the run.
  const shown = steps.flatMap((step, index): ShownStep[] =>
    step.kind === "reasoning" && !live(index) && step.text.trim().length === 0
      ? []
      : [{ step, index }],
  );
  return (
    <ActivitySteps
      id={contentId}
      steps={shown}
      renderStep={
        renderStep ?? ((step, index) => defaultStep(step, live(index)))
      }
      labels={{ ...CONTENT_LABELS, ...labelOverrides }}
      className={className}
    />
  );
}

// Its own component so the "show all" choice resets whenever the run closes.
function ActivitySteps({
  id,
  steps,
  renderStep,
  labels,
  className,
}: {
  readonly id: string;
  readonly steps: readonly ShownStep[];
  readonly renderStep: (step: ActivityStep, index: number) => ReactNode;
  readonly labels: ActivityContentLabels;
  readonly className: string | undefined;
}) {
  const [showAll, setShowAll] = useState(false);
  const listRef = useRef<HTMLOListElement | null>(null);
  const showEarlierRef = useRef<HTMLButtonElement | null>(null);
  const revealed = useRef(false);
  // The key of the step holding focus, while focus is in the list.
  const focusedStep = useRef<string | null>(null);
  const hidden = showAll ? 0 : Math.max(0, steps.length - SHOWN_STEPS);

  // The control disappears once pressed, so focus moves to the first step
  // it revealed rather than dropping to the page.
  useLayoutEffect(() => {
    if (!revealed.current) return;
    revealed.current = false;
    listRef.current?.querySelector<HTMLElement>("li[data-step]")?.focus();
  }, [showAll]);

  // A new step slides the oldest shown one behind the control. If focus
  // went with it, it moves to the control, which now counts that step.
  useLayoutEffect(() => {
    const key = focusedStep.current;
    if (key === null) return;
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    const behind = steps
      .slice(0, hidden)
      .some(({ step, index }) => stepKey(step, index) === key);
    if (!behind) return;
    focusedStep.current = null;
    showEarlierRef.current?.focus();
  });

  return (
    <ol
      ref={listRef}
      id={id}
      data-slot="activity-content"
      className={cn("-ms-1 mt-1 flex flex-col gap-0.5", className)}
      onFocus={(event) => {
        focusedStep.current =
          event.target
            .closest("li[data-step]")
            ?.getAttribute("data-step-key") ?? null;
      }}
      onBlur={(event) => {
        // A step going away with focus in it does not reach here: React
        // ignores blur while it commits, so the effect still sees the key.
        const next = event.relatedTarget;
        if (next === null || !event.currentTarget.contains(next))
          focusedStep.current = null;
      }}
    >
      {hidden > 0 ? (
        <li>
          <button
            ref={showEarlierRef}
            type="button"
            onClick={() => {
              revealed.current = true;
              setShowAll(true);
            }}
            className="rounded-md px-1 py-1 font-medium text-muted-foreground underline decoration-border-strong underline-offset-2 hover:text-foreground"
          >
            {labels.showEarlier(hidden)}
          </button>
        </li>
      ) : null}
      {steps.slice(hidden).map(({ step, index }) => (
        <li
          key={stepKey(step, index)}
          data-step={step.kind}
          data-step-key={stepKey(step, index)}
          tabIndex={-1}
          className="min-w-0 rounded-md"
        >
          {renderStep(step, index)}
        </li>
      ))}
    </ol>
  );
}
