import type { Span } from "./model.js";

export type PlacedSpan = {
  readonly span: Span;
  readonly depth: number;
};

/** Step order: earlier start first, then `localeCompare` on the name. */
export function compareSpans(left: Span, right: Span): number {
  return left.startMs - right.startMs || left.name.localeCompare(right.name);
}

export function placeSpans(spans: readonly Span[]): readonly PlacedSpan[] {
  const byId = new Map(spans.map((span) => [span.id, span]));
  const depth = (span: Span, guard = 0): number => {
    if (span.parentId === null || guard > 16) return 0;
    const parent = byId.get(span.parentId);
    if (parent === undefined) return 0;
    return 1 + depth(parent, guard + 1);
  };
  return [...spans]
    .sort(compareSpans)
    .map((span) => ({ span, depth: depth(span) }));
}

export function traceEnd(spans: readonly Span[]): number {
  return spans.reduce(
    (end, span) => Math.max(end, span.startMs + span.durationMs),
    0,
  );
}
