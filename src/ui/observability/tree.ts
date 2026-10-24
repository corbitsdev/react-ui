import type { Span } from "./model.js";

export type PlacedSpan = {
  readonly span: Span;
  readonly depth: number;
};

export function placeSpans(spans: readonly Span[]): readonly PlacedSpan[] {
  const byId = new Map(spans.map((span) => [span.id, span]));
  const depth = (span: Span, guard = 0): number => {
    if (span.parentId === null || guard > 16) return 0;
    const parent = byId.get(span.parentId);
    if (parent === undefined) return 0;
    return 1 + depth(parent, guard + 1);
  };
  return [...spans]
    .sort((a, b) => a.startMs - b.startMs || a.name.localeCompare(b.name))
    .map((span) => ({ span, depth: depth(span) }));
}

export function traceEnd(spans: readonly Span[]): number {
  return spans.reduce(
    (end, span) => Math.max(end, span.startMs + span.durationMs),
    0,
  );
}
