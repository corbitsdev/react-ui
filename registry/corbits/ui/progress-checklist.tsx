import { Check, X } from "lucide-react";

import { cn } from "@/registry/corbits/lib/utils";
import { StatusDot } from "@/registry/corbits/ui/status-dot";

export type ChecklistStepStatus = "pending" | "running" | "done" | "failed";

export type ChecklistStep = {
  readonly id: string;
  readonly label: string;
  readonly status: ChecklistStepStatus;
  /** Why it failed, or what it found. Shown under the label. */
  readonly detail?: string;
};

const STATUS_LABEL: Record<ChecklistStepStatus, string> = {
  pending: "Not started",
  running: "In progress",
  done: "Done",
  failed: "Failed",
};

/**
 * A list of steps and how far along they are — a long operation reporting
 * itself while the user waits.
 *
 * Each row states its status in text, not only by icon or colour. A checklist
 * where "done" is conveyed by a green tick alone is unreadable to anyone who
 * cannot distinguish it from the grey one, and the status word costs a line of
 * markup.
 *
 * The whole list is `aria-live="polite"`, so steps completing are announced as
 * they happen without stealing focus from wherever the user actually is.
 */
export function ProgressChecklist({
  steps,
  label = "Progress",
  className,
}: {
  steps: readonly ChecklistStep[];
  label?: string;
  className?: string;
}) {
  if (steps.length === 0) return null;

  return (
    <ol aria-label={label} aria-live="polite" className={cn("flex flex-col gap-2.5", className)}>
      {steps.map((step, index) => (
        <li key={step.id} className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-semibold",
              step.status === "done" && "border-transparent bg-success text-success-foreground",
              step.status === "failed" && "border-transparent bg-destructive text-destructive-foreground",
              step.status === "running" && "border-primary-emphasis text-primary-emphasis",
              step.status === "pending" && "border-input text-muted-foreground",
            )}
          >
            {step.status === "done" ? (
              <Check className="size-3" />
            ) : step.status === "failed" ? (
              <X className="size-3" />
            ) : step.status === "running" ? (
              <StatusDot label="" live tone="emphasis" />
            ) : (
              index + 1
            )}
          </span>

          <div className="flex min-w-0 flex-col gap-0.5">
            <p
              className={cn(
                "text-sm leading-snug",
                step.status === "pending" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {step.label}{" "}
              <span className="text-xs text-muted-foreground">· {STATUS_LABEL[step.status]}</span>
            </p>
            {step.detail === undefined ? null : (
              <p className="text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
