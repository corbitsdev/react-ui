import { Badge } from "../badge.js";
import {
  formatCost,
  formatDuration,
  formatTokens,
  spanTokens,
} from "./format.js";
import type { Span, SpanStatus, Trace } from "./model.js";
import { stepTitle } from "./wording.js";

export const STATUS_LABEL: Record<SpanStatus, string> = {
  running: "Running",
  ok: "Done",
  error: "Failed",
  waiting: "Waiting",
  denied: "Denied",
};

export const STATUS_TONE = {
  running: "info",
  ok: "success",
  error: "danger",
  waiting: "warning",
  denied: "danger",
} as const;

export function TraceHeader({ trace }: { readonly trace: Trace }) {
  const tokens = trace.spans.reduce((sum, span) => sum + spanTokens(span), 0);
  const cost = trace.spans.reduce(
    (sum, span) => sum + (span.usage?.costUsd ?? 0),
    0,
  );
  return (
    <header className="flex flex-col gap-3 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {trace.name}
            </h2>
            <Badge tone="neutral">
              {trace.kind === "agent" ? "Agent" : "Workflow"}
            </Badge>
            <Badge tone={STATUS_TONE[trace.status]}>
              {STATUS_LABEL[trace.status]}
            </Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {trace.actor} · {trace.startedAt}
          </p>
        </div>
        <dl className="flex gap-6 text-right">
          <Metric label="Duration" value={formatDuration(trace.durationMs)} />
          <Metric label="Tokens" value={formatTokens(tokens)} />
          <Metric label="Cost" value={formatCost(cost)} />
          <Metric label="Steps" value={String(trace.spans.length)} />
        </dl>
      </div>
    </header>
  );
}

export function LiveGrant({ span }: { readonly span: Span | undefined }) {
  if (span?.grant === undefined) {
    return (
      <p className="font-mono text-[11px] text-muted-foreground">
        No grant at the playhead.
      </p>
    );
  }
  const grant = span.grant;
  const winner = grant.resolvedBy;
  const stopped = grant.blocked ? " · blocked" : "";
  const by = winner === null ? "" : ` · ${winner.id}`;
  return (
    <p className="font-mono text-[11px] text-foreground">
      <span className="text-muted-foreground">Grant · </span>
      {stepTitle(span)} · {grant.effect}
      {stopped}
      {by}
    </p>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-muted-foreground">{label}</dt>
      <dd className="font-mono text-sm font-medium">{value}</dd>
    </div>
  );
}
