"use client";

import { useEffect, useRef } from "react";

import { useControllableState } from "../../hooks/use-controllable-state.js";
import { seriesColor } from "../../lib/chart-palette.js";
import { cn } from "../../lib/utils.js";
import { Badge } from "../badge.js";
import { InspectorHeader, InspectorKv, InspectorShell } from "../inspector-shell.js";
import {
  formatBytes,
  formatClock,
  formatCost,
  formatDuration,
  formatSpeed,
  formatTokens,
  spanTokens,
} from "./format.js";
import {
  AUDIENCE_REPRESENTATION,
  DEFAULT_LAYERS,
  type AgentBrief,
  type Audience,
  type Compaction,
  type ContextChange,
  type DirectorNudge,
  type GrantUse,
  type MediaItem,
  type NetworkHop,
  type SignatureStatus,
  type Span,
  type SpanStatus,
  type Trace,
  type TraceLayers,
  type TraceRepresentation,
} from "./model.js";
import { usageOfSpan, type UsageBreakdown } from "./metrics.js";
import { AudienceBand, CostPicture, Ledger, Shape, UsageMix } from "./slots.js";
import {
  deepestAt,
  grantAt,
  revealedText,
  spanEnd,
  visibleSpans,
} from "./playback.js";
import { TraceTimeline } from "./timeline.js";
import { placeSpans, traceEnd } from "./tree.js";
import {
  DEFAULT_FOCUS,
  effectLabel,
  FOCUS_KEYS,
  FOCUS_LABEL,
  compactionLine,
  kindLabel,
  originLabel,
  phrase,
  placementStatus,
  rowMarker,
  stepTitle,
  type TraceFocus,
  type Wording,
} from "./wording.js";

export type TraceViewProps = {
  readonly trace: Trace;
  readonly selectedId?: string;
  readonly defaultSelectedId?: string;
  readonly onSelect?: (id: string) => void;
  readonly timeMs?: number;
  readonly defaultTimeMs?: number;
  readonly onTimeChange?: (timeMs: number) => void;
  readonly playing?: boolean;
  readonly defaultPlaying?: boolean;
  readonly onPlayingChange?: (playing: boolean) => void;
  readonly layers?: TraceLayers;
  readonly onLayersChange?: (layers: TraceLayers) => void;
  readonly audience?: Audience;
  readonly defaultAudience?: Audience;
  readonly onAudienceChange?: (audience: Audience) => void;
  readonly representation?: TraceRepresentation;
  readonly onRepresentationChange?: (representation: TraceRepresentation) => void;
  readonly peers?: readonly Trace[];
  readonly onOpen?: (id: string) => void;
  readonly wording?: Wording;
  readonly onWordingChange?: (wording: Wording) => void;
  readonly className?: string;
};

const STATUS_LABEL: Record<SpanStatus, string> = {
  running: "Running",
  ok: "Done",
  error: "Failed",
  waiting: "Waiting",
  denied: "Denied",
};

const STATUS_TONE = {
  running: "info",
  ok: "success",
  error: "danger",
  waiting: "warning",
  denied: "danger",
} as const;

const LAYERS = ["reasoning", "grants", "io", "media", "network", "raw"] as const;

function layerLabel(key: (typeof LAYERS)[number], wording: Wording): string {
  if (wording === "precise") {
    if (key === "reasoning") return "Thought";
    if (key === "grants") return "Grants";
    if (key === "io") return "Input / output";
    if (key === "media") return "Media";
    if (key === "network") return "Network";
    return "Raw";
  }
  if (key === "reasoning") return "Thinking";
  if (key === "grants") return "Rules";
  if (key === "io") return "In and out";
  if (key === "media") return "Files";
  if (key === "network") return "Internet";
  return "Raw record";
}

export function AgentTrace(props: TraceViewProps) {
  return <TraceView {...props} />;
}

export function WorkflowTrace(props: TraceViewProps) {
  return <TraceView {...props} />;
}

export function TraceView({
  trace,
  selectedId: selectedProp,
  defaultSelectedId,
  onSelect,
  timeMs: timeProp,
  defaultTimeMs = 0,
  onTimeChange,
  playing: playingProp,
  defaultPlaying = false,
  onPlayingChange,
  layers: layersProp,
  onLayersChange,
  audience: audienceProp,
  defaultAudience = "operator",
  onAudienceChange,
  representation: representationProp,
  onRepresentationChange,
  peers,
  onOpen,
  wording: wordingProp,
  onWordingChange,
  className,
}: TraceViewProps) {
  const placedAll = placeSpans(trace.spans);
  const [selectedId, setSelectedId] = useControllableState({
    value: selectedProp,
    defaultValue: defaultSelectedId ?? placedAll[0]?.span.id ?? "",
    onChange: onSelect,
    name: "selectedId",
  });
  const [timeMs, setTimeMs] = useControllableState({
    value: timeProp,
    defaultValue: defaultTimeMs,
    onChange: onTimeChange,
    name: "timeMs",
  });
  const [playing, setPlaying] = useControllableState({
    value: playingProp,
    defaultValue: defaultPlaying,
    onChange: onPlayingChange,
    name: "playing",
  });
  const [layers, setLayers] = useControllableState({
    value: layersProp,
    defaultValue: DEFAULT_LAYERS,
    onChange: onLayersChange,
    name: "layers",
  });
  const [audience, setAudience] = useControllableState({
    value: audienceProp,
    defaultValue: defaultAudience,
    onChange: onAudienceChange,
    name: "audience",
  });
  const [wording, setWording] = useControllableState({
    value: wordingProp,
    defaultValue: "plain" as Wording,
    onChange: onWordingChange,
    name: "wording",
  });
  const [focus, setFocus] = useControllableState<TraceFocus>({
    value: undefined,
    defaultValue: DEFAULT_FOCUS,
    name: "focus",
  });
  const [representation, setRepresentation] = useControllableState({
    value: representationProp,
    defaultValue: AUDIENCE_REPRESENTATION[audienceProp ?? defaultAudience],
    onChange: onRepresentationChange,
    name: "representation",
  });

  const shown = visibleSpans(trace.spans, layers, focus);
  const placed = placeSpans(shown);
  const selected = trace.spans.find((span) => span.id === selectedId);
  const end = Math.max(trace.durationMs, traceEnd(trace.spans), 1);
  const liveGrant = layers.grants ? grantAt(shown, timeMs) : undefined;
  const index = placed.findIndex((row) => row.span.id === selectedId);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (!playing) return;
    const active = deepestAt(visibleSpans(trace.spans, layers, focus), timeMs);
    if (active !== undefined && active.id !== selectedId) setSelectedId(active.id);
  }, [playing, trace.spans, layers, focus, timeMs, selectedId, setSelectedId]);

  useEffect(() => {
    rowRefs.current.get(selectedId)?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  function seek(id: string, at: number) {
    setPlaying(false);
    setSelectedId(id);
    setTimeMs(at);
  }

  function move(delta: number) {
    const next = placed[index + delta];
    if (next !== undefined) seek(next.span.id, next.span.startMs);
  }

  const tokens = trace.spans.reduce((sum, span) => sum + spanTokens(span), 0);
  const cost = trace.spans.reduce(
    (sum, span) => sum + (span.usage?.costUsd ?? 0),
    0,
  );

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <header className="flex flex-col gap-3 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{trace.name}</h2>
              <Badge tone="neutral">{trace.kind === "agent" ? "Agent" : "Workflow"}</Badge>
              <Badge tone={STATUS_TONE[trace.status]}>{STATUS_LABEL[trace.status]}</Badge>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              {trace.actor} · {trace.startedAt}
            </p>
          </div>
          {audience === "operator" ? (
            <dl className="flex gap-6 text-right">
              <Metric label="Duration" value={formatDuration(trace.durationMs)} />
              <Metric label="Tokens" value={formatTokens(tokens)} />
              <Metric label="Cost" value={formatCost(cost)} />
              <Metric label="Steps" value={String(trace.spans.length)} />
            </dl>
          ) : null}
        </div>
        {trace.placement === undefined ? null : (
          <dl className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <PlacementItem label={phrase(wording, "Sidecar", "Machine")} value={trace.placement.sidecarId} />
            <PlacementItem label={phrase(wording, "Host", "Computer")} value={trace.placement.host} />
            <PlacementItem label="Region" value={trace.placement.region} />
            <PlacementItem label="Size" value={trace.placement.size} />
            <PlacementItem
              label={phrase(wording, "Package", "Software")}
              value={`${trace.placement.packageName}@${trace.placement.packageVersion}`}
            />
            <PlacementItem label={phrase(wording, "Generation", "Run")} value={String(trace.placement.generation)} />
            <PlacementItem
              label={phrase(wording, "Allocation", "Status")}
              value={placementStatus(trace.placement.status, wording)}
            />
          </dl>
        )}
      </header>
      {trace.brief === undefined ? null : <AgentBriefPanel brief={trace.brief} wording={wording} />}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2">
        <ChipRow
          label="Audience"
          value={audience}
          options={[
            ["operator", "Operator"],
            ["cfo", "CFO"],
            ["coo", "COO"],
            ["ciso", "CISO"],
          ] as const}
          onChange={(next) => {
            setAudience(next);
            if (representationProp === undefined) setRepresentation(AUDIENCE_REPRESENTATION[next]);
          }}
        />
        <ChipRow
          label="View"
          value={representation}
          options={[
            ["timeline", "Timeline"],
            ["ledger", "Ledger"],
            ["cost", "Cost"],
            ["shape", "Shape"],
          ] as const}
          onChange={setRepresentation}
        />
        <ChipRow
          label="Words"
          value={wording}
          options={[
            ["plain", "Plain"],
            ["precise", "Precise"],
          ] as const}
          onChange={setWording}
        />
      </div>
      <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2" role="group" aria-label="Show">
        {FOCUS_KEYS.map((key) => {
          const on = focus[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={on}
              onClick={() => setFocus({ ...focus, [key]: !on })}
              className={cn(
                "rounded-full px-2 py-1 text-xs",
                on ? "font-medium text-foreground" : "text-muted-foreground line-through decoration-border hover:text-foreground hover:no-underline",
              )}
            >
              {FOCUS_LABEL[wording][key]}
            </button>
          );
        })}
      </div>
      <AudienceBand
        audience={audience}
        trace={trace}
        peers={peers ?? []}
        wording={wording}
        {...(onOpen === undefined ? {} : { onOpen })}
      />

      {representation === "timeline" ? (
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
        <TraceTimeline
          spans={shown}
          endMs={end}
          timeMs={timeMs}
          playing={playing}
          wording={wording}
          onTimeChange={setTimeMs}
          onPlayingChange={setPlaying}
        />
        <div className="flex flex-wrap gap-1" role="group" aria-label="Layers">
          {LAYERS.map((key) => {
            const on = layers[key];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setLayers({ ...layers, [key]: !on })}
                className={cn(
                  "rounded-full px-2 py-1 text-xs",
                  on ? "font-medium text-foreground" : "text-muted-foreground line-through decoration-border hover:text-foreground hover:no-underline",
                )}
              >
                {layerLabel(key, wording)}
              </button>
            );
          })}
        </div>
        <LiveGrant span={liveGrant} wording={wording} />
      </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {representation === "timeline" ? (
        <div
          className="min-w-0 flex-1 overflow-auto outline-none"
          role="listbox"
          aria-label="Trace steps"
          aria-activedescendant={selectedId === "" ? undefined : selectedId}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              move(1);
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              move(-1);
            }
          }}
        >
          <div className="grid grid-cols-[minmax(0,1fr)_16rem] border-b border-border px-2 py-1 font-mono text-[11px] text-muted-foreground">
            <span>Step</span>
            <span className="flex justify-between">
              <span>0</span>
              <span>{formatDuration(end)}</span>
            </span>
          </div>
          {placed.map(({ span, depth }) => {
            const selectedRow = span.id === selectedId;
            const future = span.startMs > timeMs;
            const played = playedRatio(span, timeMs);
            return (
              <div
                key={span.id}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_16rem] border-b border-border",
                  selectedRow && "bg-muted/70 shadow-[inset_2px_0_0_var(--foreground)]",
                  future && "opacity-40",
                )}
              >
                <button
                  type="button"
                  role="option"
                  id={span.id}
                  aria-selected={selectedRow}
                  ref={(node) => {
                    if (node === null) rowRefs.current.delete(span.id);
                    else rowRefs.current.set(span.id, node);
                  }}
                  className="flex min-w-0 items-center gap-2 py-1.5 text-left"
                  style={{ paddingLeft: 8 + depth * 14 }}
                  onClick={() => seek(span.id, span.startMs)}
                >
                  <span className="w-24 shrink-0 text-xs text-muted-foreground">
                    {rowMarker(span, wording)}
                  </span>
                  <span className="truncate text-sm">{stepTitle(span, wording)}</span>
                </button>
                <div className="relative" title={formatDuration(span.durationMs)} aria-hidden="true">
                  <div
                    className="absolute inset-y-2 overflow-hidden rounded-sm"
                    style={barBox(span, end)}
                  >
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{ backgroundColor: barColor(span) }}
                    />
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{ width: `${played * 100}%`, backgroundColor: barColor(span) }}
                    />
                  </div>
                  <span
                    className="absolute inset-y-0 w-px bg-foreground"
                    style={{ left: `${(Math.min(timeMs, end) / end) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-auto p-4">
            {representation === "cost" ? <CostPicture trace={trace} wording={wording} /> : null}
            {representation === "shape" ? <Shape trace={trace} wording={wording} /> : null}
            {representation === "shape" ? null : (
            <Ledger
              trace={trace}
              wording={wording}
              sort={ledgerSort(audience, representation)}
              selectedId={selectedId}
              onSelect={(id) => {
                const span = trace.spans.find((item) => item.id === id);
                if (span !== undefined) seek(span.id, span.startMs);
              }}
            />
            )}
          </div>
        )}
        <InspectorShell
          className="w-80 shrink-0"
          header={
            selected === undefined ? undefined : (
              <InspectorHeader
                eyebrow={
                  <>
                    <Badge tone="neutral">{kindLabel(selected.kind, wording)}</Badge>
                    <Badge tone={STATUS_TONE[selected.status]}>
                      {STATUS_LABEL[selected.status]}
                    </Badge>
                  </>
                }
                title={stepTitle(selected, wording)}
                description={`${formatClock(selected.startMs)} · ${formatDuration(selected.durationMs)}`}
              />
            )
          }
          {...(selected === undefined ? { empty: <p className="p-4 text-sm text-muted-foreground">Select a step.</p> } : {})}
        >
          {selected === undefined ? null : (
            <SpanDetail
              traceSpans={trace.spans}
              span={selected}
              timeMs={timeMs}
              layers={layers}
              playing={playing}
              wording={wording}
            />
          )}
        </InspectorShell>
      </div>
    </div>
  );
}

function playedRatio(span: Span, timeMs: number): number {
  if (timeMs <= span.startMs) return 0;
  if (timeMs >= spanEnd(span)) return 1;
  return (timeMs - span.startMs) / Math.max(span.durationMs, 1);
}

function barBox(span: Span, end: number): { left: string; width: string } {
  const width = (Math.max(span.durationMs, 1) / end) * 100;
  return {
    left: `${(span.startMs / end) * 100}%`,
    width: `max(4px, ${width}%)`,
  };
}

function ink(amount: number): string {
  return `color-mix(in oklab, var(--foreground) ${amount}%, transparent)`;
}

function barColor(span: Span): string {
  if (span.status === "error" || span.status === "denied") return "var(--destructive)";
  if (span.status === "waiting") return "var(--warn)";
  if (span.status === "running") return "var(--foreground)";
  if (span.kind === "network") return seriesColor(0);
  if (span.kind === "mail" || span.kind === "attachment") return seriesColor(1);
  if (span.kind === "provision" || span.kind === "reactor") return seriesColor(3);
  if (span.kind === "reasoning") return ink(40);
  if (span.kind === "compact") return seriesColor(2);
  if (span.kind === "transform") return seriesColor(3);
  if (span.kind === "nudge") return ink(60);
  return ink(75);
}

function usageTotal(usage: UsageBreakdown): number {
  return usage.input + usage.output + usage.cacheRead + usage.cacheWrite + usage.thinking;
}

function ledgerSort(
  audience: Audience,
  representation: TraceRepresentation,
): "time" | "cost" | "duration" {
  if (audience === "cfo" || representation === "cost") return "cost";
  if (audience === "coo") return "duration";
  return "time";
}

function ChipRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 border-l border-border pl-3 first:border-l-0 first:pl-0"
      role="group"
      aria-label={label}
    >
      <span className="mr-1 text-xs text-muted-foreground">{label}</span>
      {options.map(([id, text]) => {
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(id)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs",
              on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {text}
          </button>
        );
      })}
    </div>
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

function PlacementItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1 after:mx-1 after:text-muted-foreground after:content-['·'] last:after:content-none">
      <dt>{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

function LiveGrant({ span, wording }: { span: Span | undefined; wording: Wording }) {
  if (span?.grant === undefined) {
    return (
      <p className="font-mono text-[11px] text-muted-foreground">
        {phrase(wording, "No grant is resolved at the playhead.", "Nothing is asking for permission here.")}
      </p>
    );
  }
  const grant = span.grant;
  const winner = grant.resolvedBy;
  const stopped = grant.blocked ? phrase(wording, " · blocked", ", stopped") : "";
  const by =
    winner === null
      ? ""
      : wording === "plain"
        ? ` by ${originLabel(winner.origin, wording)}`
        : ` · ${winner.origin} ${winner.resource} ${winner.action} · ${winner.id}`;
  return (
    <p className="font-mono text-[11px] text-foreground">
      <span className="text-muted-foreground">{phrase(wording, "Grant now", "Permission now")} · </span>
      {stepTitle(span, wording)} · {effectLabel(grant.effect, wording)}
      {stopped}
      {by}
    </p>
  );
}

function SpanDetail({
  traceSpans,
  span,
  timeMs,
  layers,
  playing,
  wording,
}: {
  traceSpans: readonly Span[];
  span: Span;
  timeMs: number;
  layers: TraceLayers;
  playing: boolean;
  wording: Wording;
}) {
  const thoughts = thoughtSpans(traceSpans, span);
  return (
    <div className="flex flex-col gap-4">
      {usageTotal(usageOfSpan(span)) > 0 ? <UsageMix usage={usageOfSpan(span)} /> : null}
      <InspectorKv
        rows={[
          { label: "Starts", value: formatClock(span.startMs), mono: true },
          { label: "Duration", value: formatDuration(span.durationMs), mono: true },
          ...(span.usage?.provider === undefined
            ? []
            : [{ label: "Provider", value: span.usage.provider, mono: true }]),
          ...(span.usage?.model === undefined
            ? []
            : [{ label: "Model", value: span.usage.model, mono: true }]),
          ...(span.usage?.cachedTokens === undefined
            ? []
            : [{ label: "Cached", value: formatTokens(span.usage.cachedTokens), mono: true }]),
          ...(spanTokens(span) === 0
            ? []
            : [
                {
                  label: "Speed",
                  value: formatSpeed(
                    span.durationMs > 0 ? spanTokens(span) / (span.durationMs / 1000) : null,
                  ),
                  mono: true,
                },
              ]),
          ...(span.usage === undefined
            ? []
            : [
                {
                  label: "Tokens",
                  value: formatTokens(spanTokens(span)),
                  mono: true,
                },
              ]),
          ...(span.signature === undefined
            ? []
            : [
                {
                  label: "Signature",
                  value: <SignatureBadge status={span.signature} wording={wording} />,
                },
              ]),
          ...(span.attributes ?? []).map((attribute) => ({
            label: attribute.label,
            value: attribute.value,
            mono: true,
          })),
        ]}
      />
      {span.nudge === undefined ? null : <NudgeBlock nudge={span.nudge} wording={wording} />}
      {span.compaction === undefined ? null : (
        <CompactionBlock compaction={span.compaction} wording={wording} />
      )}
      {span.contextChange === undefined ? null : (
        <ContextBlock change={span.contextChange} wording={wording} />
      )}
      {layers.grants && span.grant !== undefined ? (
        <GrantBlock grant={span.grant} wording={wording} />
      ) : null}
      {layers.reasoning
        ? thoughts.map((thought) => (
            <ThoughtBlock
              key={thought.id}
              span={thought}
              timeMs={timeMs}
              playing={playing}
              wording={wording}
            />
          ))
        : null}
      {layers.io && span.input !== undefined ? (
        <TextBlock label="Input" text={span.input} />
      ) : null}
      {layers.io && span.output !== undefined ? (
        <TextBlock label="Output" text={span.output} />
      ) : null}
      {layers.media && span.media !== undefined && span.media.length > 0 ? (
        <MediaBlock items={span.media} />
      ) : null}
      {layers.network && span.network !== undefined && span.network.length > 0 ? (
        <NetworkBlock hops={span.network} />
      ) : null}
      {layers.raw ? <TextBlock label="Raw" text={span.payload ?? rawSpan(span)} /> : null}
    </div>
  );
}

function thoughtSpans(spans: readonly Span[], span: Span): readonly Span[] {
  if (span.thinking !== undefined || span.redacted === true) return [span];
  return spans.filter(
    (item) =>
      item.parentId === span.id &&
      item.kind === "reasoning" &&
      (item.thinking !== undefined || item.redacted === true),
  );
}

function AgentBriefPanel({ brief, wording }: { brief: AgentBrief; wording: Wording }) {
  return (
    <div className="grid gap-6 border-b border-border bg-card px-4 py-4 lg:grid-cols-2">
      <section className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-semibold">{phrase(wording, "System prompt", "Instructions")}</h3>
        <p className="max-h-28 overflow-auto whitespace-pre-wrap text-sm leading-6">{brief.systemPrompt}</p>
      </section>
      <section className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-semibold">{phrase(wording, "Tools", "What it can use")}</h3>
        <ul className="flex flex-col gap-2">
          {brief.tools.map((tool) => (
            <li key={tool.name} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 text-sm">
              <span className="truncate font-mono text-xs leading-6">{tool.name}</span>
              <span className="text-muted-foreground">{tool.description}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function NudgeBlock({ nudge, wording }: { nudge: DirectorNudge; wording: Wording }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium">{phrase(wording, "Director action", "Nudge")}</h3>
      <p className="text-sm">{nudge.because}</p>
      {wording === "precise" ? (
        <p className="font-mono text-[11px] text-muted-foreground">{nudge.action}</p>
      ) : null}
    </section>
  );
}

function CompactionBlock({
  compaction,
  wording,
}: {
  compaction: Compaction;
  wording: Wording;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-xs font-medium">{phrase(wording, "Compaction", "What was shortened")}</h3>
        <p className="text-sm">
          {compaction.turnsBefore} turns down to {compaction.turnsAfter}
          {` · ${compactionLine(compaction)}`}
        </p>
        <p className="text-sm text-muted-foreground">{compaction.detail}</p>
        {wording === "precise" ? (
          <p className="font-mono text-[11px] text-muted-foreground">
            {compaction.compactor} v{compaction.version} · {compaction.reason}
          </p>
        ) : null}
      </div>
      <table className="w-full border-collapse text-left text-xs">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 font-medium">{phrase(wording, "Turn", "Piece")}</th>
            <th className="py-1 text-right font-medium">Tokens</th>
            <th className="py-1 font-medium">{phrase(wording, "Kept", "Stayed")}</th>
          </tr>
        </thead>
        <tbody>
          {compaction.turns.map((turn) => (
            <tr key={`${turn.role}:${turn.title}`} className="border-t border-border">
              <td className="py-1 pr-2">
                <span className={turn.kept ? "" : "text-muted-foreground"}>{turn.title}</span>
                {turn.note === undefined ? null : (
                  <span className="block text-muted-foreground">{turn.note}</span>
                )}
              </td>
              <td className="py-1 text-right font-mono">{formatTokens(turn.tokens)}</td>
              <td className="py-1">{turn.kept ? phrase(wording, "Kept", "Stayed") : phrase(wording, "Dropped", "Cut")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ContextBlock({ change, wording }: { change: ContextChange; wording: Wording }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium">{phrase(wording, "Context transform", "Prompt change")}</h3>
      <p className="text-sm">{change.summary}</p>
      {wording === "precise" ? (
        <p className="font-mono text-[11px] text-muted-foreground">
          {change.strategy} v{change.version} · {change.trigger} · {change.reason}
        </p>
      ) : null}
    </section>
  );
}

function ThoughtBlock({
  span,
  timeMs,
  playing,
  wording,
}: {
  span: Span;
  timeMs: number;
  playing: boolean;
  wording: Wording;
}) {
  const started = timeMs > span.startMs;
  const done = timeMs >= spanEnd(span);
  const streaming = playing && started && !done;
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium">{phrase(wording, "Chain of thought", "Thinking")}</h3>
      {span.redacted === true || span.thinking === undefined ? (
        <p className="text-sm text-muted-foreground">Redacted by the model.</p>
      ) : playing && !started ? (
        <p className="text-sm text-muted-foreground">
          Starts at {formatClock(span.startMs)}.
        </p>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {streaming ? revealedText(span.thinking, span, timeMs) : span.thinking}
          {streaming ? (
            <span className="ml-0.5 inline-block h-4 w-px align-text-bottom bg-foreground" />
          ) : null}
        </p>
      )}
    </section>
  );
}

function GrantBlock({ grant, wording }: { grant: GrantUse; wording: Wording }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-medium">
          {phrase(wording, "Grant at this step", "Permission at this step")}
        </h3>
        <EffectBadge effect={grant.effect} wording={wording} />
        {grant.blocked ? <Badge tone="danger">{phrase(wording, "Blocked", "Stopped")}</Badge> : null}
      </div>
      {grant.blockReason === undefined ? null : (
        <p className="text-sm">{grant.blockReason}</p>
      )}
      {grant.resolvedBy === null ? (
        <p className="text-xs text-muted-foreground">
          {phrase(wording, "Nothing matched. Failed closed.", "No rule matched, so this was refused.")}
        </p>
      ) : (
        <GrantLine
          label={phrase(wording, "Resolved by", "Chosen rule")}
          grant={grant.resolvedBy}
          wording={wording}
        />
      )}
      {grant.matching.length === 0 ? null : (
        <ul className="flex flex-col gap-1">
          {grant.matching.map((item) => (
            <li key={item.id}>
              <GrantLine
                label={phrase(wording, "Matched", "Also considered")}
                grant={item}
                wording={wording}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GrantLine({
  label,
  grant,
  wording,
}: {
  label: string;
  grant: NonNullable<GrantUse["resolvedBy"]>;
  wording: Wording;
}) {
  const exact =
    grant.specificity === undefined || wording === "plain" ? "" : ` · specificity ${grant.specificity}`;
  return (
    <p className="font-mono text-[11px] leading-relaxed">
      <span className="text-muted-foreground">{label} </span>
      {wording === "plain" ? (
        <>
          {effectLabel(grant.effect, wording)} by {originLabel(grant.origin, wording)}
        </>
      ) : (
        <>
          {grant.id} · {grant.effect} · {grant.origin}
          <br />
          {grant.resource} {grant.action}
          {exact}
        </>
      )}
    </p>
  );
}

function EffectBadge({ effect, wording }: { effect: GrantUse["effect"]; wording: Wording }) {
  const tone =
    effect === "allow" ? "success" : effect === "ask" ? "warning" : effect === "none" ? "neutral" : "danger";
  return <Badge tone={tone}>{effectLabel(effect, wording)}</Badge>;
}

function SignatureBadge({ status, wording }: { status: SignatureStatus; wording: Wording }) {
  const tone =
    status === "valid" ? "success" : status === "invalid" ? "danger" : "warning";
  const label =
    wording === "precise"
      ? status
      : status === "valid"
        ? "Checked"
        : status === "invalid"
          ? "Bad"
          : status === "missing"
            ? "Missing"
            : "Unknown";
  return <Badge tone={tone}>{label}</Badge>;
}

function TextBlock({ label, text }: { label: string; text: string }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium">{label}</h3>
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-2 font-mono text-[11px] leading-relaxed">
        {text}
      </pre>
    </section>
  );
}

function MediaBlock({ items }: { items: readonly MediaItem[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium">Attached</h3>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.name} className="rounded-md border border-border p-2">
            {item.mediaType.startsWith("image/") ? (
              <div className="mb-2 flex h-16 items-end rounded-sm bg-muted p-2 font-mono text-[10px] text-muted-foreground">
                {item.mediaType}
              </div>
            ) : null}
            <p className="truncate text-sm">{item.name}</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              {item.mediaType} · {formatBytes(item.bytes)}
            </p>
            {item.note === undefined ? null : (
              <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function NetworkBlock({ hops }: { hops: readonly NetworkHop[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium">Network</h3>
      <ul className="flex flex-col gap-2">
        {hops.map((hop) => (
          <li key={`${hop.method} ${hop.url}`} className="text-xs">
            <p className="font-mono">
              {hop.method} {hop.url}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-muted-foreground">
              <span>{hop.status === null ? "no status" : hop.status}</span>
              <span>{formatBytes(hop.bytes)}</span>
              {hop.external ? <Badge tone="warning">External</Badge> : <Badge tone="neutral">Internal</Badge>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function rawSpan(span: Span): string {
  return JSON.stringify(span, null, 2);
}
