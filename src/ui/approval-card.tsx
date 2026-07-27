import { useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";
import { Badge } from "./badge.js";
import { Button } from "./button.js";

/** One argument of the action being approved, already resolved for display. */
export type ApprovalDetail = {
  readonly label: string;
  readonly value: string;
};

export type ApprovalRequest = {
  readonly id: string;
  /** What will happen if approved, in plain language: "Post to #sales (Slack)". */
  readonly headline: string;
  /** Who or what is asking. */
  readonly requestedBy: string;
  readonly details?: readonly ApprovalDetail[];
  /**
   * A stable name for the *class* of action, so "always allow" can mean
   * something. Without it the always-allow control is not offered at all.
   */
  readonly actionKey?: string;
};

export type ApprovalState = "idle" | "approving" | "rejecting" | "allowing-always";

export type ApprovalCardProps = {
  readonly request: ApprovalRequest;
  readonly onApprove: () => void;
  readonly onReject: () => void;
  /** Durably allow this action class. Omit to hide the control entirely. */
  readonly onAllowAlways?: (actionKey: string) => void;
  readonly state?: ApprovalState;
  readonly error?: string | null;
  readonly className?: string;
  readonly children?: ReactNode;
};

const LONG_VALUE = 140;

/**
 * The human decision surface: something is blocked until a person says yes or
 * no, and this is where they say it.
 *
 * Approve is the primary and reject is an outline button — not because approval
 * is the expected answer, but because a destructive-styled reject would read as
 * the dangerous option when it is the *safe* one. Neither is pre-focused, and
 * there is no default: a gate whose buttons can be dismissed by a stray Enter
 * is not a gate.
 *
 * Every argument the action will run with is shown. A card that hides them
 * behind "details" is asking for approval of something the user cannot see, so
 * long values clamp rather than disappear.
 */
export function ApprovalCard({
  request,
  onApprove,
  onReject,
  onAllowAlways,
  state = "idle",
  error = null,
  className,
  children,
}: ApprovalCardProps) {
  const busy = state !== "idle";
  const canAllowAlways = onAllowAlways !== undefined && request.actionKey !== undefined;

  return (
    <section
      aria-label={`Approval requested: ${request.headline}`}
      className={cn("flex flex-col gap-3 rounded-lg border border-primary-emphasis bg-card p-4", className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">Needs your approval</Badge>
        <span className="text-xs text-muted-foreground">Requested by {request.requestedBy}</span>
      </div>

      <p className="text-sm font-semibold">{request.headline}</p>

      {request.details === undefined || request.details.length === 0 ? null : (
        <dl className="flex flex-col gap-1.5 rounded-md bg-muted p-3 text-xs">
          {request.details.map((detail) => (
            <ApprovalDetailRow key={detail.label} detail={detail} />
          ))}
        </dl>
      )}

      {children}

      {error === null ? null : (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onApprove} disabled={busy}>
          {state === "approving" ? "Approving…" : "Approve"}
        </Button>
        <Button variant="outline" size="sm" onClick={onReject} disabled={busy}>
          {state === "rejecting" ? "Rejecting…" : "Reject"}
        </Button>
        {canAllowAlways ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAllowAlways(request.actionKey as string)}
            disabled={busy}
            className="ml-auto"
          >
            {state === "allowing-always" ? "Saving…" : "Always allow this"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function ApprovalDetailRow({ detail }: { detail: ApprovalDetail }) {
  const [expanded, setExpanded] = useState(false);
  const long = detail.value.length > LONG_VALUE;

  return (
    <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-2">
      <dt className="truncate text-muted-foreground">{detail.label}</dt>
      <dd className="min-w-0">
        <span className={cn("block break-words whitespace-pre-wrap", long && !expanded && "line-clamp-2")}>
          {detail.value}
        </span>
        {long ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="mt-0.5 text-primary-emphasis hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
      </dd>
    </div>
  );
}
