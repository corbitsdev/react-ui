import { spanTokens } from "./format.js";
import type { Span, Trace } from "./model.js";

export type StepMeasure = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly kind: Span["kind"];
  readonly provider: string;
  readonly model: string;
  readonly tokens: number;
  readonly cachedTokens: number;
  readonly costUsd: number;
  readonly durationMs: number;
  readonly tokensPerSecond: number | null;
  readonly status: Span["status"];
  readonly startMs: number;
};

export type TraceRollup = {
  readonly tokens: number;
  readonly cachedTokens: number;
  readonly costUsd: number;
  readonly durationMs: number;
  readonly tokensPerSecond: number | null;
  readonly denied: number;
  readonly blocked: number;
  readonly externalHops: number;
  readonly badSignatures: number;
  readonly waitingMs: number;
  readonly provisionMs: number;
};

export type ModelShare = {
  readonly provider: string;
  readonly model: string;
  readonly tokens: number;
  readonly costUsd: number;
  readonly quirks: readonly string[];
};

export type Finding = {
  readonly id: string;
  readonly tone: "danger" | "warning";
  readonly title: string;
  readonly detail: string;
};

export type MeasureSort = "time" | "cost" | "duration";

export type UsageBreakdown = {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  readonly cacheWrite: number;
  readonly thinking: number;
};

export type ShapeNode = {
  readonly key: string;
  readonly name: string;
  readonly count: number;
  readonly durationMs: number;
  readonly tokens: number;
  readonly costUsd: number;
};

export type ObservationRow = {
  readonly traceId: string;
  readonly traceName: string;
  readonly spanId: string;
  readonly type: Span["kind"];
  readonly name: string;
  readonly model: string;
  readonly level: "Default" | "Warning" | "Error" | "Debug";
  readonly latencyMs: number;
  readonly tokens: number;
  readonly costUsd: number;
};

const speed = (tokens: number, durationMs: number): number | null => {
  if (tokens <= 0 || durationMs <= 0) return null;
  return tokens / (durationMs / 1000);
};

/** Stable key for a step. A repeated name gets `.2`, `.3`, and so on. */
export function stepKeys(spans: readonly Span[]): ReadonlyMap<string, string> {
  const seen = new Map<string, number>();
  const keys = new Map<string, string>();
  for (const span of spans) {
    const base = `${span.kind}.${span.name}`
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "_")
      .replace(/_+/g, "_");
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    keys.set(span.id, count === 1 ? base : `${base}.${count}`);
  }
  return keys;
}

export function measures(trace: Trace, sort: MeasureSort = "time"): readonly StepMeasure[] {
  const keys = stepKeys(trace.spans);
  const rows = trace.spans.map((span) => {
    const tokens = spanTokens(span);
    const cachedTokens = span.usage?.cachedTokens ?? 0;
    const durationMs = span.durationMs;
    return {
      id: span.id,
      key: keys.get(span.id) ?? span.id,
      name: span.name,
      kind: span.kind,
      provider: span.usage?.provider ?? "—",
      model: span.usage?.model ?? "—",
      tokens,
      cachedTokens,
      costUsd: span.usage?.costUsd ?? 0,
      durationMs,
      tokensPerSecond: speed(tokens, durationMs),
      status: span.status,
      startMs: span.startMs,
    };
  });
  if (sort === "cost") {
    return rows
      .filter((row) => row.costUsd > 0 || row.tokens > 0)
      .sort((a, b) => b.costUsd - a.costUsd || a.startMs - b.startMs);
  }
  if (sort === "duration") {
    return rows
      .filter((row) => row.durationMs >= 1000 || row.tokens > 0)
      .sort((a, b) => b.durationMs - a.durationMs || a.startMs - b.startMs);
  }
  return rows;
}

export function rollup(trace: Trace): TraceRollup {
  let tokens = 0;
  let cachedTokens = 0;
  let costUsd = 0;
  let denied = 0;
  let blocked = 0;
  let externalHops = 0;
  let badSignatures = 0;
  let waitingMs = 0;
  let provisionMs = 0;
  for (const span of trace.spans) {
    tokens += spanTokens(span);
    cachedTokens += span.usage?.cachedTokens ?? 0;
    costUsd += span.usage?.costUsd ?? 0;
    if (span.status === "denied") denied += 1;
    if (span.grant?.blocked === true) blocked += 1;
    externalHops += span.network?.filter((hop) => hop.external).length ?? 0;
    if (span.signature === "invalid" || span.signature === "missing") badSignatures += 1;
    if (span.status === "waiting") waitingMs += span.durationMs;
    if (span.kind === "provision") provisionMs += span.durationMs;
  }
  return {
    tokens,
    cachedTokens,
    costUsd,
    durationMs: trace.durationMs,
    tokensPerSecond: speed(tokens, trace.durationMs),
    denied,
    blocked,
    externalHops,
    badSignatures,
    waitingMs,
    provisionMs,
  };
}

export function modelShares(trace: Trace): readonly ModelShare[] {
  const byKey = new Map<string, ModelShare>();
  for (const span of trace.spans) {
    const provider = span.usage?.provider;
    const model = span.usage?.model;
    if (provider === undefined || model === undefined) continue;
    const key = `${provider}/${model}`;
    const current = byKey.get(key) ?? {
      provider,
      model,
      tokens: 0,
      costUsd: 0,
      quirks: quirksFor(trace, provider, model),
    };
    byKey.set(key, {
      ...current,
      tokens: current.tokens + spanTokens(span),
      costUsd: current.costUsd + (span.usage?.costUsd ?? 0),
    });
  }
  return [...byKey.values()].sort((a, b) => b.costUsd - a.costUsd);
}

function quirksFor(trace: Trace, provider: string, model: string): readonly string[] {
  const listed =
    trace.providers?.find((item) => item.provider === provider && item.model === model)
      ?.quirks ?? [];
  const redacted = trace.spans.some(
    (span) => span.redacted === true && modelOf(trace, span) === model,
  );
  return redacted ? [...listed, "This run redacted a thinking block"] : listed;
}

export function usageOf(trace: Trace): UsageBreakdown {
  const totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, thinking: 0 };
  for (const span of trace.spans) {
    totals.input += span.usage?.inputTokens ?? 0;
    totals.output += span.usage?.outputTokens ?? 0;
    totals.cacheRead += span.usage?.cachedTokens ?? 0;
    totals.cacheWrite += span.usage?.cacheWriteTokens ?? 0;
    totals.thinking += span.usage?.thinkingTokens ?? 0;
  }
  return totals;
}

export function usageOfSpan(span: Span): UsageBreakdown {
  return {
    input: span.usage?.inputTokens ?? 0,
    output: span.usage?.outputTokens ?? 0,
    cacheRead: span.usage?.cachedTokens ?? 0,
    cacheWrite: span.usage?.cacheWriteTokens ?? 0,
    thinking: span.usage?.thinkingTokens ?? 0,
  };
}

/** Same step name collapsed, with a count. Loops show up as one node. */
export function shapeOf(trace: Trace): readonly ShapeNode[] {
  const keys = stepKeys(trace.spans);
  const grouped = new Map<string, ShapeNode>();
  for (const span of trace.spans) {
    const full = keys.get(span.id) ?? span.id;
    const key = full.replace(/\.\d+$/, "");
    const current = grouped.get(key) ?? {
      key,
      name: span.name,
      count: 0,
      durationMs: 0,
      tokens: 0,
      costUsd: 0,
    };
    grouped.set(key, {
      ...current,
      count: current.count + 1,
      durationMs: current.durationMs + span.durationMs,
      tokens: current.tokens + spanTokens(span),
      costUsd: current.costUsd + (span.usage?.costUsd ?? 0),
    });
  }
  return [...grouped.values()].sort((a, b) => b.durationMs - a.durationMs);
}

export function observationRows(traces: readonly Trace[]): readonly ObservationRow[] {
  const rows: ObservationRow[] = [];
  for (const trace of traces) {
    for (const span of trace.spans) {
      rows.push({
        traceId: trace.id,
        traceName: trace.name,
        spanId: span.id,
        type: span.kind,
        name: span.name,
        model: span.usage?.model ?? "—",
        level: levelOf(span.status),
        latencyMs: span.durationMs,
        tokens: spanTokens(span),
        costUsd: span.usage?.costUsd ?? 0,
      });
    }
  }
  return rows.sort((a, b) => b.costUsd - a.costUsd || b.latencyMs - a.latencyMs);
}

function levelOf(status: Span["status"]): ObservationRow["level"] {
  if (status === "error" || status === "denied") return "Error";
  if (status === "waiting") return "Warning";
  if (status === "running") return "Debug";
  return "Default";
}

export function portfolio(traces: readonly Trace[]): readonly ModelShare[] {
  const byKey = new Map<string, ModelShare>();
  for (const trace of traces) {
    for (const share of modelShares(trace)) {
      const key = `${share.provider}/${share.model}`;
      const current = byKey.get(key) ?? { ...share, tokens: 0, costUsd: 0 };
      byKey.set(key, {
        ...current,
        tokens: current.tokens + share.tokens,
        costUsd: current.costUsd + share.costUsd,
        quirks: current.quirks.length > share.quirks.length ? current.quirks : share.quirks,
      });
    }
  }
  return [...byKey.values()].sort((a, b) => b.costUsd - a.costUsd);
}

function modelOf(trace: Trace, span: Span): string | undefined {
  if (span.usage?.model !== undefined) return span.usage.model;
  if (span.parentId === null) return undefined;
  const parent = trace.spans.find((item) => item.id === span.parentId);
  return parent === undefined ? undefined : modelOf(trace, parent);
}

export function findings(trace: Trace): readonly Finding[] {
  const rows: Finding[] = [];
  for (const span of trace.spans) {
    if (span.status === "denied" || span.grant?.effect === "deny") {
      rows.push({
        id: `${span.id}:deny`,
        tone: "danger",
        title: span.name,
        detail: span.grant?.blockReason ?? "Denied",
      });
    } else if (span.grant?.blocked === true) {
      rows.push({
        id: `${span.id}:block`,
        tone: "warning",
        title: span.name,
        detail: span.grant.blockReason ?? "Blocked pending approval",
      });
    }
    for (const hop of span.network ?? []) {
      if (!hop.external) continue;
      rows.push({
        id: `${span.id}:${hop.url}`,
        tone: "warning",
        title: `${hop.method} ${hop.url}`,
        detail: hop.status === null ? "External, no status" : `External · ${hop.status}`,
      });
    }
    if (span.signature === "invalid" || span.signature === "missing") {
      rows.push({
        id: `${span.id}:sig`,
        tone: "danger",
        title: span.name,
        detail: `Signature ${span.signature}`,
      });
    }
  }
  return rows;
}
