import type { Span, TraceLayers } from "./model.js";
import { placeSpans } from "./tree.js";
import { focusKeeps, type TraceFocus } from "./wording.js";

/** How long a full play-through takes on screen, whatever the trace length. */
export const SCAN_MS = 16_000;

export function spanEnd(span: Span): number {
  return span.startMs + Math.max(span.durationMs, 1);
}

export function contains(span: Span, timeMs: number): boolean {
  return timeMs >= span.startMs && timeMs < spanEnd(span);
}

export function visibleSpans(
  spans: readonly Span[],
  layers: TraceLayers,
  focus?: TraceFocus,
): readonly Span[] {
  return spans.filter((span) => {
    if (focus !== undefined && !focusKeeps(span, focus)) return false;
    if (span.kind === "reasoning" && !layers.reasoning) return false;
    if (span.kind === "network" && !layers.network) return false;
    if (span.kind === "attachment" && !layers.media) return false;
    return true;
  });
}

/** Deepest span that covers `timeMs`. */
export function deepestAt(
  spans: readonly Span[],
  timeMs: number,
): Span | undefined {
  let best: { readonly span: Span; readonly depth: number } | undefined;
  for (const row of placeSpans(spans)) {
    if (!contains(row.span, timeMs)) continue;
    if (best === undefined || row.depth >= best.depth) best = row;
  }
  return best?.span;
}

/** The grant that applies at `timeMs`: the deepest active span that has one. */
export function grantAt(
  spans: readonly Span[],
  timeMs: number,
): Span | undefined {
  let best: { readonly span: Span; readonly depth: number } | undefined;
  for (const row of placeSpans(spans)) {
    if (row.span.grant === undefined || !contains(row.span, timeMs)) continue;
    if (best === undefined || row.depth >= best.depth) best = row;
  }
  return best?.span;
}

/**
 * How much of `text` has been produced by `timeMs` inside `span`.
 * Cuts on a space so the playhead does not stop mid-word.
 */
export function revealedText(text: string, span: Span, timeMs: number): string {
  if (timeMs <= span.startMs) return "";
  if (timeMs >= spanEnd(span)) return text;
  const ratio = (timeMs - span.startMs) / Math.max(span.durationMs, 1);
  const cut = Math.max(1, Math.floor(text.length * ratio));
  const space = text.lastIndexOf(" ", cut);
  return text.slice(0, space > 0 ? space : cut);
}

export function nextBoundary(
  spans: readonly Span[],
  timeMs: number,
): number | undefined {
  const starts = spans
    .map((span) => span.startMs)
    .filter((start) => start > timeMs + 1)
    .sort((a, b) => a - b);
  return starts[0];
}

export function previousBoundary(
  spans: readonly Span[],
  timeMs: number,
): number | undefined {
  const starts = spans
    .map((span) => span.startMs)
    .filter((start) => start < timeMs - 1)
    .sort((a, b) => a - b);
  return starts[starts.length - 1];
}
