"use client";

import { cn } from "../../lib/utils.js";
import { Badge } from "../badge.js";
import { formatCost, formatDuration, formatTokens } from "./format.js";
import type { SessionSummary, SpanStatus, TraceKind } from "./model.js";

export type SessionTableProps = {
  readonly sessions: readonly SessionSummary[];
  readonly selectedId?: string;
  readonly onSelect: (id: string) => void;
  readonly className?: string;
};

const STATUS_TONE = {
  running: "info",
  ok: "success",
  error: "danger",
  waiting: "warning",
  denied: "danger",
} as const;

const STATUS_LABEL: Record<SpanStatus, string> = {
  running: "Running",
  ok: "Done",
  error: "Failed",
  waiting: "Waiting",
  denied: "Denied",
};

const KIND_LABEL: Record<TraceKind, string> = {
  agent: "Agent",
  workflow: "Workflow",
};

export function SessionTable({
  sessions,
  selectedId,
  onSelect,
  className,
}: SessionTableProps) {
  return (
    <div className={cn("overflow-auto", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <thead className="sticky top-0 bg-background text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-3 py-2 font-medium">Session</th>
            <th className="px-3 py-2 font-medium">Who</th>
            <th className="px-3 py-2 font-medium">Model</th>
            <th className="px-3 py-2 font-medium">When</th>
            <th className="px-3 py-2 text-right font-medium">Duration</th>
            <th className="px-3 py-2 text-right font-medium">Tokens</th>
            <th className="px-3 py-2 text-right font-medium">Cost</th>
            <th className="px-3 py-2 text-right font-medium">Steps</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => {
            const selected = session.id === selectedId;
            return (
              <tr
                key={session.id}
                className={cn(
                  "border-b border-border",
                  selected ? "bg-muted" : "hover:bg-muted/60",
                )}
              >
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="flex flex-col items-start gap-1 text-left"
                    aria-current={selected ? "true" : undefined}
                    onClick={() => onSelect(session.id)}
                  >
                    <span className="font-medium text-foreground">
                      {session.name}
                    </span>
                    <Badge tone="neutral">{KIND_LABEL[session.kind]}</Badge>
                  </button>
                </td>
                <td className="px-3 py-2 text-foreground">{session.actor}</td>
                <td className="px-3 py-2 font-mono text-xs text-foreground">
                  {session.model}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-foreground">
                  {session.startedAt}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {formatDuration(session.durationMs)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {formatTokens(session.tokens)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {formatCost(session.costUsd)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {session.steps}
                </td>
                <td className="px-3 py-2">
                  <Badge tone={STATUS_TONE[session.status]}>
                    {STATUS_LABEL[session.status]}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
