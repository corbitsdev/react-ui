"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import type { SubagentRun, SubagentState } from "@/registry/corbits/lib/chat-message";
import { formatRelativeTime } from "@/registry/corbits/lib/relative-time";
import { cn } from "@/registry/corbits/lib/utils";
import { Badge, type BadgeTone } from "@/registry/corbits/ui/badge";
import { StatusDot } from "@/registry/corbits/ui/status-dot";
import { ToolNarrative } from "@/registry/corbits/ui/tool-narrative";

export type SubagentDockProps = {
  /** In the order they were spawned. */
  readonly subagents: readonly SubagentRun[];
  readonly now?: number;
  readonly className?: string;
};

const STATE_LABEL: Record<SubagentState, string> = {
  queued: "Queued",
  running: "Working",
  done: "Done",
  error: "Failed",
};

const STATE_TONE: Record<SubagentState, BadgeTone> = {
  queued: "neutral",
  running: "accent",
  done: "success",
  error: "danger",
};

/**
 * Who else is working on this, while it is happening.
 *
 * When an agent delegates, the transcript stops explaining itself: the user
 * sees a long pause and one summarised answer, and has no way to tell four
 * helpers running in parallel from one that has hung. This is the strip that
 * answers it — one row per delegated task, its state, and what it has actually
 * been calling.
 *
 * Not the workflow dock. That lists server-owned runs from a `DataPort`, keyed
 * by run id and paginated. Subagents are turn-scoped: they are born and die
 * inside one reply, the host already has them streaming in, and putting them
 * behind a collection request would mean polling for state the caller is
 * holding in its hand.
 *
 * A row's detail is `ToolNarrative`, the same component the main transcript
 * uses, so a helper's work reads the way the agent's own work reads. The
 * running rows open by default and finished ones stay shut: while it is
 * running, "what is it doing" is the question; afterwards, the answer is.
 *
 * Renders nothing when no one was delegated to — the ordinary case is a turn
 * with no helpers, and a permanent empty strip announcing that is furniture.
 */
export function SubagentDock({ subagents, now, className }: SubagentDockProps) {
  if (subagents.length === 0) return null;

  return (
    <section
      aria-label="Delegated work"
      className={cn("flex flex-col gap-1 rounded-lg border border-border bg-card p-2", className)}
    >
      {subagents.map((subagent) => (
        <SubagentRow key={subagent.id} subagent={subagent} {...(now === undefined ? {} : { now })} />
      ))}
    </section>
  );
}

function SubagentRow({ subagent, now }: { subagent: SubagentRun; now?: number }) {
  const detail = subagent.tools ?? [];
  const hasDetail = detail.length > 0 || subagent.result !== undefined;
  const [open, setOpen] = useState(subagent.state === "running");

  return (
    <div data-slot="subagent-row" className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        disabled={!hasDetail}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted disabled:hover:bg-transparent"
      >
        <StatusDot
          label={STATE_LABEL[subagent.state]}
          live={subagent.state === "running"}
          tone={subagent.state === "error" ? "danger" : subagent.state === "running" ? "emphasis" : "neutral"}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{subagent.name}</span>
          {subagent.task === undefined ? null : (
            <span className="block truncate text-xs text-muted-foreground">{subagent.task}</span>
          )}
        </span>
        {subagent.startedAt === undefined ? null : (
          <time dateTime={subagent.startedAt} className="shrink-0 font-mono text-[11px] text-muted-foreground">
            {formatRelativeTime(subagent.startedAt, now)}
          </time>
        )}
        <Badge tone={STATE_TONE[subagent.state]}>{STATE_LABEL[subagent.state]}</Badge>
        {hasDetail ? (
          <ChevronRight className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")} aria-hidden />
        ) : null}
      </button>

      {open && hasDetail ? (
        <div className="mt-1 mb-1 ml-4 flex flex-col gap-1 border-l border-border pl-3">
          {detail.map((part) => (
            <ToolNarrative key={part.toolCallId} part={part} />
          ))}
          {subagent.result === undefined ? null : (
            <p className="px-2 py-1 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {subagent.result}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
