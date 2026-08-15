import type * as React from "react";

import type { WorkflowStep, WorkflowStepStatus } from "../lib/workflow-run-progress.js";
import { workflowStepGlyph, workflowStepLabelClass } from "../lib/workflow-run-progress.js";
import { cn } from "../lib/utils.js";
import { SidebarCollapseToggle } from "./sidebar.js";

function markClass(status: WorkflowStepStatus): string {
  if (status === "completed") return "border-transparent bg-success text-success-foreground";
  if (status === "failed") return "border-transparent bg-destructive text-destructive-foreground";
  if (status === "current") return "border-primary-emphasis bg-primary/10 text-primary-emphasis";
  return "border-input text-muted-foreground";
}

export type StepSidebarProps = {
  readonly steps: readonly WorkflowStep[];
  /** Collapse is host-owned state, not internal — same contract as `Sidebar`.
   * The host persists it and flips it; this component only renders it. */
  readonly collapsed?: boolean;
  /** Called with no args when the toggle is pressed; the host flips its own
   * `collapsed` boolean. */
  readonly onToggle: () => void;
  /** Arbitrary content pinned below the step list — a source summary, a
   * sign-out control, or nothing. Stays visible through collapse; compose a
   * layout inside it that degrades gracefully at 64px if it needs to. */
  readonly footer?: React.ReactNode;
  readonly className?: string;
};

/**
 * A vertical rail of a workflow's steps, numbered and coloured by status,
 * that collapses to a 64px icon-only strip or expands to a 224px labelled
 * list. Labels hide with `sr-only` on collapse, never `hidden` — the
 * icon-only rail keeps its accessible names.
 */
export function StepSidebar({ steps, collapsed = false, onToggle, footer, className }: StepSidebarProps) {
  return (
    <div
      data-slot="step-sidebar"
      data-collapsed={collapsed}
      className={cn(
        "group/step-sidebar flex h-full flex-col border-r border-border bg-card",
        "w-56 transition-[width] duration-200 data-[collapsed=true]:w-16",
        className,
      )}
    >
      <div className="flex items-center justify-end border-b border-border p-2">
        <SidebarCollapseToggle collapsed={collapsed} onToggle={onToggle} />
      </div>

      <ol aria-label="Workflow steps" aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
        {steps.map((step) => (
          <li
            key={step.number}
            data-step-status={step.status}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-md p-2",
              step.status === "current" && "bg-muted",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-medium",
                markClass(step.status),
              )}
            >
              {workflowStepGlyph(step.status, step.number)}
            </span>
            <span
              title={step.label}
              className={cn(
                "min-w-0 flex-1 truncate text-sm font-medium group-data-[collapsed=true]/step-sidebar:sr-only",
                workflowStepLabelClass(step.status),
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      {footer === undefined ? null : (
        <div data-slot="step-sidebar-footer" className="mt-auto border-t border-border">
          {footer}
        </div>
      )}
    </div>
  );
}
