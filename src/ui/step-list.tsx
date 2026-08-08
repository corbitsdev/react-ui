import { Check, X } from "lucide-react";

import type { StepDisplayStatus, StepListItem } from "../lib/workflow-registry.js";
import { cn } from "../lib/utils.js";
import { StatusDot } from "./status-dot.js";

const STATE_LABEL: Record<StepDisplayStatus, string> = {
  pending: "Pending",
  active: "Now",
  done: "Done",
  failed: "Failed",
};

const MARK_CLASS: Record<StepDisplayStatus, string> = {
  pending: "border-input text-muted-foreground",
  active: "border-primary-emphasis bg-primary/10 text-primary-emphasis",
  done: "border-transparent bg-success text-success-foreground",
  failed: "border-transparent bg-destructive text-destructive-foreground",
};

const LABEL_CLASS: Record<StepDisplayStatus, string> = {
  pending: "text-muted-foreground",
  active: "font-medium text-primary-emphasis",
  done: "text-foreground",
  failed: "font-medium text-destructive",
};

export type StepListRowProps = {
  readonly step: StepListItem;
  readonly className?: string;
};

/** One step row — a mark carrying its own glyph and colour, a name, and the
 * status spelled out in text so it never depends on colour alone. */
export function StepListRow({ step, className }: StepListRowProps) {
  return (
    <li
      data-step-status={step.status}
      className={cn("grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-2 py-1.5", className)}
    >
      <span aria-hidden className={cn("mt-0.5 grid size-5 place-items-center rounded-sm border text-[10px] font-semibold", MARK_CLASS[step.status])}>
        {step.status === "done" ? <Check className="size-3" /> : step.status === "failed" ? <X className="size-3" /> : step.status === "active" ? (
          <StatusDot label="" tone="emphasis" live />
        ) : null}
      </span>
      <span className="min-w-0">
        <span className={cn("block truncate text-sm", LABEL_CLASS[step.status])}>{step.name}</span>
        {step.meta === undefined ? null : <span className="block truncate text-xs text-muted-foreground">{step.meta}</span>}
      </span>
      <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
        {STATE_LABEL[step.status]}
      </span>
    </li>
  );
}

export type StepListProps = {
  readonly steps: readonly StepListItem[];
  /** Names the list. Required — a bare sequence of rows has no subject. */
  readonly label?: string;
  readonly className?: string;
};

/**
 * A run's steps and how far along each one is. `aria-live="polite"` so a
 * step flipping to done or failed is announced without stealing focus from
 * wherever the reader actually is — the same rule `progress-checklist.tsx`
 * follows for a long-running operation's checklist.
 */
export function StepList({ steps, label = "Steps", className }: StepListProps) {
  if (steps.length === 0) return null;
  return (
    <ol aria-label={label} aria-live="polite" className={cn("flex flex-col", className)}>
      {steps.map((step) => (
        <StepListRow key={step.id} step={step} />
      ))}
    </ol>
  );
}
