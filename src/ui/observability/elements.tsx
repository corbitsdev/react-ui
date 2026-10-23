"use client";

import { formatCost, formatDuration } from "./format.js";
import type { Placement, Span, Trace } from "./model.js";
import { spanEnd } from "./playback.js";
import { AgentBrief as BriefPanel } from "./span-inspector.js";
import {
  CompactionBlock,
  ContextBlock,
  GrantBlock,
  NetworkBlock,
  TextBlock,
  ThoughtBlock,
} from "./span-inspector.js";
import { stepTitle } from "./wording.js";

export function Brief({
  brief,
}: {
  readonly brief: Parameters<typeof BriefPanel>[0]["brief"] | undefined;
}) {
  if (brief === undefined) return null;
  return <BriefPanel brief={brief} />;
}

export function Input({ span }: { readonly span: Span }) {
  if (span.input === undefined) return null;
  return <TextBlock label="Input" text={span.input} />;
}

export function Output({ span }: { readonly span: Span }) {
  if (span.output === undefined) return null;
  return <TextBlock label="Output" text={span.output} />;
}

export function Thinking({
  span,
  timeMs = Number.POSITIVE_INFINITY,
  playing = false,
}: {
  readonly span: Span;
  readonly timeMs?: number;
  readonly playing?: boolean;
}) {
  if (span.thinking === undefined && span.redacted !== true) return null;
  return <ThoughtBlock span={span} timeMs={timeMs} playing={playing} />;
}

export function Tool({ span }: { readonly span: Span }) {
  if (span.kind !== "tool") return null;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium">{stepTitle(span)}</h3>
      <Input span={span} />
      <Output span={span} />
    </section>
  );
}

export function Grant({ span }: { readonly span: Span }) {
  if (span.grant === undefined) return null;
  return <GrantBlock grant={span.grant} />;
}

export function Compaction({ span }: { readonly span: Span }) {
  if (span.compaction === undefined) return null;
  return <CompactionBlock compaction={span.compaction} />;
}

export function ContextTransform({ span }: { readonly span: Span }) {
  if (span.kind === "tool" || span.contextChange === undefined) return null;
  return <ContextBlock change={span.contextChange} />;
}

export function ToolResultTransform({ span }: { readonly span: Span }) {
  if (span.kind !== "tool" || span.contextChange === undefined) return null;
  return <ContextBlock change={span.contextChange} />;
}

export function Signal({ span }: { readonly span: Span }) {
  if (span.kind !== "gate" && span.status !== "waiting") return null;
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium">Signal</h3>
      <p className="text-sm">{stepTitle(span)}</p>
      <p className="font-mono text-[11px] text-muted-foreground">
        {span.status} · {formatDuration(span.durationMs)}
      </p>
    </section>
  );
}

export function Trigger({ span }: { readonly span: Span }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium">Trigger</h3>
      <p className="text-sm">{stepTitle(span)}</p>
    </section>
  );
}

export function Network({ span }: { readonly span: Span }) {
  if (span.network === undefined || span.network.length === 0) return null;
  return <NetworkBlock hops={span.network} />;
}

export function Payload({ span }: { readonly span: Span }) {
  if (span.payload === undefined) return null;
  return <TextBlock label="Payload" text={span.payload} />;
}

export function ChildRun({
  name,
  onOpen,
}: {
  readonly name: string;
  readonly onOpen?: () => void;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium">Child run</h3>
      {onOpen === undefined ? (
        <p className="text-sm">{name}</p>
      ) : (
        <button type="button" className="text-left text-sm" onClick={onOpen}>
          {name}
        </button>
      )}
    </section>
  );
}

export function Execution({
  id,
  status,
}: {
  readonly id: string;
  readonly status: string;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium">Execution</h3>
      <p className="font-mono text-[11px] text-muted-foreground">
        {id} · {status}
      </p>
    </section>
  );
}

export function Sidecar({
  placement,
  shares,
  costUsd,
  connectMs,
}: {
  readonly placement: Placement;
  readonly shares?: readonly string[];
  readonly costUsd?: number;
  readonly connectMs?: number;
}) {
  return (
    <section className="flex flex-col gap-1 border-b border-border px-4 py-3">
      <h3 className="text-xs font-medium">Sidecar</h3>
      <p className="font-mono text-[11px] text-muted-foreground">
        {placement.sidecarId} · {placement.status} · {placement.size} ·{" "}
        {placement.region}
        {connectMs === undefined
          ? ""
          : ` · connect ${formatDuration(connectMs)}`}
        {costUsd === undefined ? "" : ` · ${formatCost(costUsd)}`}
      </p>
      <p className="font-mono text-[11px] text-muted-foreground">
        {placement.host} · {placement.packageName}@{placement.packageVersion} ·
        generation {placement.generation}
      </p>
      {shares === undefined || shares.length === 0 ? null : (
        <p className="text-sm text-muted-foreground">
          Shares this machine with {shares.join(", ")}
        </p>
      )}
    </section>
  );
}

const TIMING_BUCKETS = [
  ["provision", "Provision"],
  ["gate", "Waiting"],
  ["turn", "Model"],
  ["reasoning", "Thinking"],
  ["tool", "Tools"],
  ["compact", "Compaction"],
] as const;

export function TimingBreakdown({
  spans,
}: {
  readonly spans: readonly Span[];
}) {
  const totals = new Map<string, number>();
  for (const span of spans) {
    totals.set(span.kind, (totals.get(span.kind) ?? 0) + span.durationMs);
  }
  const end = spans.reduce((max, span) => Math.max(max, spanEnd(span)), 1);
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium">Timing</h3>
      <ul className="flex flex-col gap-1">
        {TIMING_BUCKETS.map(([kind, label]) => {
          const value = totals.get(kind) ?? 0;
          if (value === 0) return null;
          return (
            <li
              key={kind}
              className="grid grid-cols-[6rem_1fr_4rem] items-center gap-2"
            >
              <span className="text-xs">{label}</span>
              <span className="h-2 rounded-sm bg-muted">
                <span
                  className="block h-full rounded-sm bg-foreground/70"
                  style={{ width: `${(value / end) * 100}%` }}
                />
              </span>
              <span className="text-right font-mono text-xs">
                {formatDuration(value)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function RunList({
  traces,
  groupBy,
  onOpen,
}: {
  readonly traces: readonly Trace[];
  readonly groupBy?: "sidecar";
  readonly onOpen?: (id: string) => void;
}) {
  const groups = new Map<string, Trace[]>();
  for (const trace of traces) {
    const key =
      groupBy === "sidecar"
        ? (trace.placement?.sidecarId ?? "No sidecar")
        : "Runs";
    const list = groups.get(key);
    if (list === undefined) groups.set(key, [trace]);
    else list.push(trace);
  }
  return (
    <div className="flex flex-col gap-4">
      {[...groups.entries()].map(([key, list]) => (
        <section key={key} className="flex flex-col gap-1">
          {groupBy === "sidecar" ? (
            <h3 className="font-mono text-xs text-muted-foreground">{key}</h3>
          ) : null}
          <ul className="flex flex-col">
            {list.map((trace) => (
              <li key={trace.id} className="border-b border-border py-2">
                {onOpen === undefined ? (
                  <span className="text-sm">{trace.name}</span>
                ) : (
                  <button
                    type="button"
                    className="text-left text-sm"
                    onClick={() => onOpen(trace.id)}
                  >
                    {trace.name}
                  </button>
                )}
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                  {trace.kind} · {trace.status} ·{" "}
                  {formatDuration(trace.durationMs)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
