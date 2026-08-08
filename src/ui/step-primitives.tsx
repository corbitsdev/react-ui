import type * as React from "react";

import { cn } from "../lib/utils.js";

/**
 * Low-level, un-opinionated step-list building blocks — a compound API
 * (`Steps` / `Step` / `StepIndicator` / `StepLabel` / `StepTitle` /
 * `StepDescription`) for a caller assembling a bespoke step layout that
 * neither `HorizontalStepper` nor `StepList` fits. Each piece is a plain
 * styled element with no shared state between them; the caller wires status
 * into each `StepIndicator` itself.
 */

export type StepsProps = React.ComponentProps<"div"> & { readonly orientation?: "horizontal" | "vertical" };

export function Steps({ className, orientation = "horizontal", ...props }: StepsProps) {
  return <div className={cn("flex", orientation === "horizontal" ? "gap-2" : "flex-col gap-4", className)} {...props} />;
}

export function Step({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center gap-3", className)} {...props} />;
}

export type StepIndicatorStatus = "complete" | "active" | "incomplete";

export type StepIndicatorProps = React.ComponentProps<"div"> & {
  readonly status?: StepIndicatorStatus;
  readonly index?: number;
};

export function StepIndicator({ className, status = "incomplete", index, ...props }: StepIndicatorProps) {
  return (
    <div
      className={cn(
        "flex size-8 items-center justify-center rounded-full text-sm font-semibold",
        status === "complete" && "bg-success text-success-foreground",
        status === "active" && "border-2 border-primary-emphasis text-primary-emphasis",
        status === "incomplete" && "border-2 border-border text-muted-foreground",
        className,
      )}
      {...props}
    >
      {status === "complete" ? "✓" : index === undefined ? "" : index + 1}
    </div>
  );
}

export function StepLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function StepTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-sm font-semibold", className)} {...props} />;
}

export function StepDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />;
}
