import { useEffect, useRef } from "react";

import type { WorkflowStep, WorkflowStepStatus } from "../lib/workflow-run-progress.js";
import { cn } from "../lib/utils.js";

// Above this many steps, an even split can't give every label readable room,
// so labels compress to numbers-only pills except for the current step — the
// one label a reader actually needs without scrolling. Every label still
// renders (`sr-only`) so a screen reader still hears the full sequence.
const LABEL_VISIBLE_STEP_THRESHOLD = 5;

function pillClass(status: WorkflowStepStatus): string {
  if (status === "completed") return "bg-success text-success-foreground";
  if (status === "failed") return "bg-destructive text-destructive-foreground";
  if (status === "current") return "bg-primary text-primary-foreground";
  return "bg-muted text-muted-foreground";
}

function labelClass(status: WorkflowStepStatus): string {
  if (status === "current") return "text-foreground";
  if (status === "failed") return "text-destructive";
  return "text-muted-foreground";
}

function pillGlyph(status: WorkflowStepStatus, number: number): string {
  if (status === "completed") return "✓";
  if (status === "failed") return "!";
  return String(number);
}

export type HorizontalStepperProps = {
  readonly steps: readonly WorkflowStep[];
  readonly className?: string;
};

/**
 * A phase rail: numbered pills connected by a rail that fills in once the
 * segment behind it actually completes — the fill never runs ahead of real
 * work. Scrolls the current step into view on mount and on every step
 * change, so a run with more steps than fit on screen never leaves the
 * active one off to the side unannounced.
 */
export function HorizontalStepper({ steps, className }: HorizontalStepperProps) {
  const currentRef = useRef<HTMLLIElement>(null);
  const compress = steps.length > LABEL_VISIBLE_STEP_THRESHOLD;

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [steps]);

  return (
    <div className={cn("border-b border-border bg-card px-6 py-5", className)}>
      <ol
        aria-label="Workflow progress"
        className="flex items-center gap-2 overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-12px),transparent)] md:gap-3"
      >
        {steps.map((step, index) => (
          <li
            key={step.number}
            ref={step.status === "current" ? currentRef : undefined}
            aria-current={step.status === "current" ? "step" : undefined}
            className={cn(
              "flex min-w-0 items-center gap-2 last:flex-initial md:gap-3",
              compress ? (step.status === "current" ? "flex-[8_1_0%]" : "flex-1") : "flex-1",
            )}
          >
            <span className="relative flex size-8 shrink-0 items-center justify-center">
              {step.status === "current" ? (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-primary/30 motion-safe:[animation:corbits-status-pulse_1.8s_ease-out_infinite]"
                />
              ) : null}
              <span className={cn("relative flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors", pillClass(step.status))}>
                {pillGlyph(step.status, index + 1)}
              </span>
            </span>

            <span
              title={step.label}
              className={cn(
                "min-w-0 flex-1 truncate text-sm font-medium",
                compress && step.status !== "current" ? "sr-only" : labelClass(step.status),
              )}
            >
              {step.label}
            </span>

            {index === steps.length - 1 ? null : (
              <span className={cn("h-0.5 shrink-0 overflow-hidden rounded-full bg-border", compress ? "min-w-2 flex-1" : "w-4 md:w-6")}>
                <span
                  data-filled={step.status === "completed"}
                  className="block h-full w-full origin-left rounded-full bg-success transition-transform duration-300 ease-out data-[filled=false]:scale-x-0 data-[filled=true]:scale-x-100"
                />
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
