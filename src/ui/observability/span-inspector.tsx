import { Badge } from "../badge.js";
import { InspectorKv } from "../inspector-shell.js";
import {
  formatBytes,
  formatClock,
  formatDuration,
  formatSpeed,
  formatTokens,
  spanTokens,
} from "./format.js";
import { usageOfSpan, type UsageBreakdown } from "./metrics.js";
import type {
  AgentBrief as AgentBriefModel,
  Compaction,
  ContextChange,
  DirectorNudge,
  GrantUse,
  MediaItem,
  NetworkHop,
  SignatureStatus,
  Span,
  TraceLayers,
} from "./model.js";
import { revealedText, spanEnd } from "./playback.js";
import { UsageMix } from "./usage-mix.js";
import { compactionLine } from "./wording.js";

function usageTotal(usage: UsageBreakdown): number {
  return (
    usage.input +
    usage.output +
    usage.cacheRead +
    usage.cacheWrite +
    usage.thinking
  );
}

export function SpanInspector({
  traceSpans,
  span,
  timeMs,
  layers,
  playing,
}: {
  traceSpans: readonly Span[];
  span: Span;
  timeMs: number;
  layers: TraceLayers;
  playing: boolean;
}) {
  const thoughts = thoughtSpans(traceSpans, span);
  return (
    <div className="flex flex-col gap-4">
      {usageTotal(usageOfSpan(span)) > 0 ? (
        <UsageMix usage={usageOfSpan(span)} />
      ) : null}
      <InspectorKv
        rows={[
          { label: "Starts", value: formatClock(span.startMs), mono: true },
          {
            label: "Duration",
            value: formatDuration(span.durationMs),
            mono: true,
          },
          ...(span.usage?.provider === undefined
            ? []
            : [{ label: "Provider", value: span.usage.provider, mono: true }]),
          ...(span.usage?.model === undefined
            ? []
            : [{ label: "Model", value: span.usage.model, mono: true }]),
          ...(span.usage?.cachedTokens === undefined
            ? []
            : [
                {
                  label: "Cached",
                  value: formatTokens(span.usage.cachedTokens),
                  mono: true,
                },
              ]),
          ...(spanTokens(span) === 0
            ? []
            : [
                {
                  label: "Speed",
                  value: formatSpeed(
                    span.durationMs > 0
                      ? spanTokens(span) / (span.durationMs / 1000)
                      : null,
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
                  value: <SignatureBadge status={span.signature} />,
                },
              ]),
          ...(span.attributes ?? []).map((attribute) => ({
            label: attribute.label,
            value: attribute.value,
            mono: true,
          })),
        ]}
      />
      {span.nudge === undefined ? null : <NudgeBlock nudge={span.nudge} />}
      {span.compaction === undefined ? null : (
        <CompactionBlock compaction={span.compaction} />
      )}
      {span.contextChange === undefined ? null : (
        <ContextBlock change={span.contextChange} />
      )}
      {layers.grants && span.grant !== undefined ? (
        <GrantBlock grant={span.grant} />
      ) : null}
      {layers.reasoning
        ? thoughts.map((thought) => (
            <ThoughtBlock
              key={thought.id}
              span={thought}
              timeMs={timeMs}
              playing={playing}
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
      {layers.network &&
      span.network !== undefined &&
      span.network.length > 0 ? (
        <NetworkBlock hops={span.network} />
      ) : null}
      {layers.raw ? (
        <TextBlock label="Raw" text={span.payload ?? rawSpan(span)} />
      ) : null}
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

export function AgentBrief({ brief }: { brief: AgentBriefModel }) {
  return (
    <div className="grid gap-6 border-b border-border bg-card px-4 py-4 lg:grid-cols-2">
      <section className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-semibold">System prompt</h3>
        <p className="max-h-28 overflow-auto whitespace-pre-wrap text-sm leading-6">
          {brief.systemPrompt}
        </p>
      </section>
      <section className="flex min-w-0 flex-col gap-2">
        <h3 className="text-sm font-semibold">Tools</h3>
        <ul className="flex flex-col gap-2">
          {brief.tools.map((tool) => (
            <li
              key={tool.name}
              className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 text-sm"
            >
              <span className="truncate font-mono text-xs leading-6">
                {tool.name}
              </span>
              <span className="text-muted-foreground">{tool.description}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function NudgeBlock({ nudge }: { nudge: DirectorNudge }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium">{nudge.action}</h3>
      <p className="text-sm">{nudge.because}</p>
    </section>
  );
}

function CompactionBlock({ compaction }: { compaction: Compaction }) {
  return (
    <section className="flex flex-col gap-2">
      <div>
        <h3 className="text-xs font-medium">Compaction</h3>
        <p className="text-sm">
          {compaction.turnsBefore} turns down to {compaction.turnsAfter}
          {` · ${compactionLine(compaction)}`}
        </p>
        <p className="text-sm text-muted-foreground">{compaction.detail}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {compaction.compactor} v{compaction.version} · {compaction.reason}
        </p>
      </div>
      <table className="w-full border-collapse text-left text-xs">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 pr-2 font-medium">Turn</th>
            <th className="py-1 pr-3 text-right font-medium">Tokens</th>
            <th className="py-1 pl-2 font-medium">Kept</th>
          </tr>
        </thead>
        <tbody>
          {compaction.turns.map((turn) => (
            <tr
              key={`${turn.role}:${turn.title}`}
              className="border-t border-border"
            >
              <td className="py-1 pr-2">
                <span className={turn.kept ? "" : "text-muted-foreground"}>
                  {turn.title}
                </span>
                {turn.note === undefined ? null : (
                  <span className="block text-muted-foreground">
                    {turn.note}
                  </span>
                )}
              </td>
              <td className="py-1 pr-3 text-right font-mono">
                {formatTokens(turn.tokens)}
              </td>
              <td className="py-1 pl-2">{turn.kept ? "Kept" : "Dropped"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ContextBlock({ change }: { change: ContextChange }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium">Context transform</h3>
      <p className="text-sm">{change.summary}</p>
      <p className="font-mono text-[11px] text-muted-foreground">
        {change.strategy} v{change.version} · {change.trigger} · {change.reason}
      </p>
    </section>
  );
}

function ThoughtBlock({
  span,
  timeMs,
  playing,
}: {
  span: Span;
  timeMs: number;
  playing: boolean;
}) {
  const started = timeMs > span.startMs;
  const done = timeMs >= spanEnd(span);
  const streaming = playing && started && !done;
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-medium">Thinking</h3>
      {span.redacted === true || span.thinking === undefined ? (
        <p className="text-sm text-muted-foreground">Redacted by the model.</p>
      ) : playing && !started ? (
        <p className="text-sm text-muted-foreground">
          Starts at {formatClock(span.startMs)}.
        </p>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {streaming
            ? revealedText(span.thinking, span, timeMs)
            : span.thinking}
          {streaming ? (
            <span className="ml-0.5 inline-block h-4 w-px align-text-bottom bg-foreground" />
          ) : null}
        </p>
      )}
    </section>
  );
}

function GrantBlock({ grant }: { grant: GrantUse }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-medium">Grant</h3>
        <EffectBadge effect={grant.effect} />
        {grant.blocked ? <Badge tone="danger">Blocked</Badge> : null}
      </div>
      {grant.blockReason === undefined ? null : (
        <p className="text-sm">{grant.blockReason}</p>
      )}
      {grant.resolvedBy === null ? (
        <p className="text-xs text-muted-foreground">
          Nothing matched. Failed closed.
        </p>
      ) : (
        <GrantLine label="Resolved by" grant={grant.resolvedBy} />
      )}
      {grant.matching.length === 0 ? null : (
        <ul className="flex flex-col gap-1">
          {grant.matching.map((item) => (
            <li key={item.id}>
              <GrantLine label="Matched" grant={item} />
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
}: {
  label: string;
  grant: NonNullable<GrantUse["resolvedBy"]>;
}) {
  const exact =
    grant.specificity === undefined
      ? ""
      : ` · specificity ${grant.specificity}`;
  return (
    <p className="font-mono text-[11px] leading-relaxed">
      <span className="text-muted-foreground">{label} </span>
      {grant.id} · {grant.effect} · {grant.origin}
      <br />
      {grant.resource} {grant.action}
      {exact}
    </p>
  );
}

function EffectBadge({ effect }: { effect: GrantUse["effect"] }) {
  const tone =
    effect === "allow"
      ? "success"
      : effect === "ask"
        ? "warning"
        : effect === "none"
          ? "neutral"
          : "danger";
  return <Badge tone={tone}>{effect}</Badge>;
}

function SignatureBadge({ status }: { status: SignatureStatus }) {
  const tone =
    status === "valid"
      ? "success"
      : status === "invalid"
        ? "danger"
        : "warning";
  return <Badge tone={tone}>{status}</Badge>;
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
              {hop.external ? (
                <Badge tone="warning">External</Badge>
              ) : (
                <Badge tone="neutral">Internal</Badge>
              )}
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
