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
import { countFailedTools, displayedToolStatus } from "../lib/tool-display.js";
import { cn } from "../lib/utils.js";
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
  /** The run is still going. */
  readonly streaming?: boolean | undefined;
  /** Controlled open state. Pair with `onOpenChange`. */
  readonly open?: boolean | undefined;
  readonly defaultOpen?: boolean | undefined;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
};

/**
 * A stretch of an agent's work, thinking and tool calls however many, as one
 * block. Folded by default, live or done: closed, it is one summary line
 * ("Thought for 4s · 3 steps") and nothing of the steps is in the page.
 * Opened, it lists every step in order, newest last, the latest ten first
 * with the rest behind a control.
 *
 * Without children it renders `ActivityTrigger` and `ActivityContent`.
 * Renders nothing for a run with no steps.
 */
export function Activity({
  steps,
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

  if (steps.length === 0) return null;

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
            <ActivityTrigger />
            <ActivityContent />
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
  if (only !== undefined) return `${only.name}…`;
  return steps.at(-1)?.kind === "reasoning"
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
  return (
    <button
      type="button"
      data-slot="activity-trigger"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      onClick={toggle}
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1.5 self-start rounded-md px-1 py-1 text-start text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
    >
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
   * kind; a call with a settled approval shows its outcome.
   */
  readonly renderStep?:
    | ((step: ActivityStep, index: number) => ReactNode)
    | undefined;
  readonly labels?: Partial<ActivityContentLabels> | undefined;
  readonly className?: string | undefined;
};

function defaultStep(step: ActivityStep): ReactNode {
  switch (step.kind) {
    case "reasoning":
      return <Reasoning part={step} />;
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

/** The run's steps, while open: the latest ten, with a control for the rest. */
export function ActivityContent({
  renderStep = defaultStep,
  labels: labelOverrides,
  className,
}: ActivityContentProps) {
  const { steps, open, contentId } = useActivityContext("ActivityContent");
  if (!open) return null;
  return (
    <ActivitySteps
      id={contentId}
      steps={steps}
      renderStep={renderStep}
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
  readonly steps: readonly ActivityStep[];
  readonly renderStep: (step: ActivityStep, index: number) => ReactNode;
  readonly labels: ActivityContentLabels;
  readonly className: string | undefined;
}) {
  const [showAll, setShowAll] = useState(false);
  const listRef = useRef<HTMLOListElement | null>(null);
  const revealed = useRef(false);
  const hidden = showAll ? 0 : Math.max(0, steps.length - SHOWN_STEPS);

  // The control disappears once pressed, so focus moves to the first step
  // it revealed rather than dropping to the page.
  useLayoutEffect(() => {
    if (!revealed.current) return;
    revealed.current = false;
    listRef.current?.querySelector<HTMLElement>("li[data-step]")?.focus();
  }, [showAll]);

  return (
    <ol
      ref={listRef}
      id={id}
      data-slot="activity-content"
      className={cn(
        "ms-1 mt-1 flex flex-col gap-1 border-s-2 border-border ps-3",
        className,
      )}
    >
      {hidden > 0 ? (
        <li>
          <button
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
      {steps.slice(hidden).map((step, offset) => {
        const index = hidden + offset;
        return (
          <li
            key={stepKey(step, index)}
            data-step={step.kind}
            tabIndex={-1}
            className="min-w-0 rounded-md"
          >
            {renderStep(step, index)}
          </li>
        );
      })}
    </ol>
  );
}
