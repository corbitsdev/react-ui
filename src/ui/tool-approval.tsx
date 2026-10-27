"use client";

import {
  Ban,
  Check,
  CheckCheck,
  Hourglass,
  ShieldAlert,
  TimerOff,
  X,
} from "lucide-react";
import { useCallback, useId, useLayoutEffect, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";

import { isAwaitingApproval } from "../lib/conversation-activity.js";
import type {
  PartTool,
  ToolApprovalRecord,
  ToolApprovalScope,
} from "../lib/conversation.js";
import { formatToolValue } from "../lib/tool-display.js";
import { cn } from "../lib/utils.js";
import { Button } from "./button.js";

/** A person's answer to a pending approval. Deny is always `once`. */
export type ToolApprovalDecision = {
  readonly outcome: "approved" | "rejected";
  readonly scope: ToolApprovalScope;
};

export type ToolApprovalLabels = {
  readonly title: string;
  readonly input: string;
  readonly approve: string;
  readonly approveAlways: string;
  readonly deny: string;
  readonly approvedOnce: string;
  readonly approvedAlways: string;
  /** Approved, with no scope on the record. */
  readonly approved: string;
  readonly denied: string;
  readonly deniedAlways: string;
  readonly timedOut: string;
  readonly expired: string;
};

const LABELS: ToolApprovalLabels = {
  title: "Needs your approval",
  input: "Input",
  approve: "Approve",
  approveAlways: "Approve always",
  deny: "Deny",
  approvedOnce: "Approved once",
  approvedAlways: "Approved always",
  approved: "Approved",
  denied: "Denied",
  deniedAlways: "Always denied",
  timedOut: "Timed out",
  expired: "Expired",
};

export type ToolApprovalProps = Omit<
  ComponentProps<"div">,
  "children" | "part"
> & {
  readonly part: PartTool;
  /**
   * Called once per click with the person's decision. A fast double click
   * can call it twice, so record decisions idempotently by approval id.
   */
  readonly onDecide: (decision: ToolApprovalDecision) => void;
  /** Renders the call's input. Defaults to plain text or indented JSON. */
  readonly renderInput?: ((input: unknown) => ReactNode) | undefined;
  /** Holds the buttons while the host records a decision. They stay focusable. */
  readonly disabled?: boolean | undefined;
  /** Why the last decision could not be recorded. */
  readonly error?: ReactNode;
  readonly labels?: Partial<ToolApprovalLabels> | undefined;
  /** The host's own account of what is being asked, above the input. */
  readonly children?: ReactNode;
};

/**
 * A tool call's approval. While the call waits on a person it offers Approve,
 * Approve always and Deny on the attention wash; once its record is settled
 * it is one quiet line saying what happened. Waiting is decided by the
 * approval record when there is one (`isAwaitingApproval`), and the outcome
 * is read from the record alone. A call with no record that is not waiting
 * renders nothing.
 *
 * When the record settles while focus was inside and nothing else has taken
 * it, focus moves to the resolved line instead of dropping to the page.
 */
export function ToolApproval({
  part,
  onDecide,
  renderInput,
  disabled = false,
  error,
  labels: labelOverrides,
  children,
  ref,
  className,
  onFocus,
  onBlur,
  ...props
}: ToolApprovalProps) {
  const labels = { ...LABELS, ...labelOverrides };
  const titleId = useId();
  const inputTitleId = useId();
  const outcomeId = useId();
  const awaiting = isAwaitingApproval(part);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const focusInside = useRef(false);
  const wasAwaiting = useRef(awaiting);

  useLayoutEffect(() => {
    if (wasAwaiting.current && !awaiting && focusInside.current) {
      const active = document.activeElement;
      if (active === null || active === document.body) rootRef.current?.focus();
    }
    wasAwaiting.current = awaiting;
  }, [awaiting]);

  const setRoot = useCallback(
    (element: HTMLDivElement | null) => {
      rootRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref !== null && ref !== undefined) ref.current = element;
    },
    [ref],
  );

  if (!awaiting && part.approval === undefined) return null;

  const decide = (decision: ToolApprovalDecision) => () => {
    if (!disabled) onDecide(decision);
  };

  return (
    <div
      ref={setRoot}
      data-slot="tool-approval"
      data-status={awaiting ? "pending" : part.approval?.status}
      // Settled, the line is where focus lands, so it is named by what it says.
      role={awaiting ? undefined : "group"}
      aria-labelledby={awaiting ? undefined : outcomeId}
      tabIndex={-1}
      onFocus={(event) => {
        focusInside.current = true;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        // Focus leaving the card, to another element or to nothing (a click
        // on blank page), ends "inside". The decided button going away with
        // the record does not reach here: React ignores blur while it
        // commits, so the flag survives until the layout effect reads it.
        const next = event.relatedTarget;
        if (next === null || !event.currentTarget.contains(next))
          focusInside.current = false;
        onBlur?.(event);
      }}
      className={cn("min-w-0 text-sm outline-offset-2", className)}
      {...props}
    >
      {awaiting ? (
        <section
          aria-labelledby={titleId}
          className="flex flex-col gap-3 rounded-lg border border-primary-emphasis bg-attention-wash p-4 text-foreground"
        >
          <header className="flex min-w-0 flex-wrap items-center gap-2">
            <ShieldAlert
              aria-hidden
              className="size-4 shrink-0 text-primary-emphasis"
            />
            <p id={titleId} className="font-semibold">
              {labels.title}
            </p>
            <code className="ms-auto min-w-0 truncate font-mono text-xs">
              {part.name}
            </code>
          </header>
          {children}
          {part.input === undefined ? null : (
            <div className="flex flex-col gap-1">
              <p id={inputTitleId} className="text-xs font-medium">
                {labels.input}
              </p>
              <div
                role="group"
                aria-labelledby={inputTitleId}
                tabIndex={0}
                className="max-h-48 overflow-auto rounded-md bg-background p-2 font-mono text-xs break-words whitespace-pre-wrap"
              >
                {renderInput === undefined
                  ? formatToolValue(part.input)
                  : renderInput(part.input)}
              </div>
            </div>
          )}
          {error === undefined || error === null ? null : (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              aria-disabled={disabled || undefined}
              onClick={decide({ outcome: "approved", scope: "once" })}
              className="aria-disabled:opacity-50"
            >
              {labels.approve}
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-disabled={disabled || undefined}
              onClick={decide({ outcome: "approved", scope: "always" })}
              className="bg-background aria-disabled:opacity-50"
            >
              {labels.approveAlways}
            </Button>
            <Button
              size="sm"
              variant="outline"
              aria-disabled={disabled || undefined}
              onClick={decide({ outcome: "rejected", scope: "once" })}
              className="bg-background text-destructive aria-disabled:opacity-50 sm:ms-auto"
            >
              {labels.deny}
            </Button>
          </div>
        </section>
      ) : part.approval === undefined ? null : (
        <ResolvedLine
          id={outcomeId}
          record={part.approval}
          name={part.name}
          labels={labels}
        />
      )}
    </div>
  );
}

function ResolvedLine({
  id,
  record,
  name,
  labels,
}: {
  readonly id: string;
  readonly record: ToolApprovalRecord;
  readonly name: string;
  readonly labels: ToolApprovalLabels;
}) {
  const { icon, text } = resolved(record, labels);
  return (
    <p
      id={id}
      className="inline-flex max-w-full min-w-0 items-center gap-1.5 text-muted-foreground"
    >
      {icon}
      <span className="shrink-0">{text}</span>{" "}
      <code className="min-w-0 truncate font-mono text-xs">{name}</code>
    </p>
  );
}

function resolved(
  record: ToolApprovalRecord,
  labels: ToolApprovalLabels,
): { readonly icon: ReactNode; readonly text: string } {
  const icon = "size-3.5 shrink-0";
  switch (record.status) {
    case "approved":
      if (record.scope === "always")
        return {
          icon: <CheckCheck aria-hidden className={cn(icon, "text-ok")} />,
          text: labels.approvedAlways,
        };
      return {
        icon: <Check aria-hidden className={cn(icon, "text-ok")} />,
        text: record.scope === "once" ? labels.approvedOnce : labels.approved,
      };
    case "rejected":
      if (record.scope === "always")
        return {
          icon: <Ban aria-hidden className={cn(icon, "text-destructive")} />,
          text: labels.deniedAlways,
        };
      return {
        icon: <X aria-hidden className={cn(icon, "text-destructive")} />,
        text: labels.denied,
      };
    case "timeout":
      return {
        icon: <TimerOff aria-hidden className={icon} />,
        text: labels.timedOut,
      };
    case "expired":
      return {
        icon: <Hourglass aria-hidden className={icon} />,
        text: labels.expired,
      };
    case "pending":
      // Unreachable: a pending record is waiting and renders the buttons.
      return { icon: null, text: "" };
  }
}
