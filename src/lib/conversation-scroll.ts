/**
 * The geometry behind `Conversation`'s scrolling, as pure functions over
 * measured rectangles. The component measures; these decide.
 *
 * The anchor algorithm
 *
 * The container turns the browser's own scroll anchoring off
 * (`overflow-anchor: none`) so it cannot fight this one, which replaces it:
 *
 * 1. Capture: record every registered item that intersects the view, topmost
 *    first, each with its offset from the container's top. The topmost is the
 *    anchor; the rest are candidates, in order.
 * 2. Restore: after content changes above the anchor, and on each
 *    `ResizeObserver` callback until the anchor is released, scroll the
 *    container by the difference between the anchor's offset now and its
 *    captured offset, so what the reader sees stays put.
 * 3. Hand-over: when the anchor item is gone (trimmed out of a history
 *    window), the next captured candidate below it takes over and restores
 *    its own offset. With no candidate left, nothing moves.
 *
 * Capture happens whenever the reader (or the container itself) scrolls, and
 * on demand before a change the host is about to make. It is never taken
 * from a scroll the layout caused: that position already includes the shift
 * the anchor exists to undo. The anchor is released while `stick` follows the
 * end (the end is the anchor then).
 *
 * During a glide
 *
 * A glide re-captures the anchor after every frame it writes. A change above
 * the view mid-glide (a page of history landing, items trimmed) is measured
 * the same way, as how far the anchored content moved in scroll coordinates
 * (`anchorShift`), and is applied to the glide instead of fighting it
 * (`rebaseGlide`): the view moves with the content, the glide's start moves
 * by as much, and its target is re-resolved every frame. The glide then keeps
 * the same path through the content and lands where it would have.
 */

/** A vertical extent in one coordinate space (client pixels, usually). */
export type ConversationSpan = {
  readonly top: number;
  readonly bottom: number;
};

/** One item's place relative to the top of the view when it was captured. */
export type ConversationAnchorCandidate = {
  readonly id: string;
  readonly offset: number;
};

/** The items in view at capture time, topmost first. */
export type ConversationAnchor = {
  readonly candidates: readonly ConversationAnchorCandidate[];
};

/** Within this distance of the end counts as at the end. */
export const CONVERSATION_END_THRESHOLD = 32;

/** A reader's gesture stays open this long after its last input (a wheel
 * tick, a touch, a scroll key, the scrollbar released), so the scroll that
 * input animates is still theirs. Outside a momentum phase, scrolls never
 * extend it. */
export const CONVERSATION_GESTURE_QUIET_MS = 150;

/** How long after a touch lifts, or a wheel tick, the browser's own momentum
 * (or smooth-scroll animation) can keep extending the reader's gesture. A
 * hard cap, so no chain of scrolls keeps the gesture open for ever. */
export const CONVERSATION_MOMENTUM_MS = 2000;

/**
 * Records the items intersecting `viewport`, topmost first, each with its
 * offset from the viewport's top.
 *
 * `ids` must be in document order, which in a conversation column is also
 * top-to-bottom order, so the first visible item is found by binary search:
 * capture runs on every scroll and measures a handful of items, not the whole
 * history.
 */
export function captureAnchor(
  viewport: ConversationSpan,
  ids: readonly string[],
  measure: (id: string) => ConversationSpan | undefined,
): ConversationAnchor {
  let low = 0;
  let high = ids.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    const id = ids[middle];
    const box = id === undefined ? undefined : measure(id);
    if (box !== undefined && box.bottom <= viewport.top) low = middle + 1;
    else high = middle;
  }
  const candidates: ConversationAnchorCandidate[] = [];
  for (let index = low; index < ids.length; index += 1) {
    const id = ids[index];
    const box = id === undefined ? undefined : measure(id);
    if (id === undefined || box === undefined) continue;
    if (box.top >= viewport.bottom) break;
    candidates.push({ id, offset: box.top - viewport.top });
  }
  return { candidates };
}

/**
 * How far to scroll (added to `scrollTop`) to put the anchor back where it
 * was captured. The first candidate still present decides; `topOf` returns
 * undefined for an item that is gone. Zero when no candidate is left.
 */
export function anchorCorrection(
  anchor: ConversationAnchor,
  viewportTop: number,
  topOf: (id: string) => number | undefined,
): number {
  for (const candidate of anchor.candidates) {
    const top = topOf(candidate.id);
    if (top === undefined) continue;
    return top - viewportTop - candidate.offset;
  }
  return 0;
}

/**
 * How far the anchored content has moved, in scroll coordinates, since the
 * anchor was captured with the container at `capturedTop`: the anchor's
 * correction now, plus however far `scrollTop` moved meanwhile without the
 * conversation writing it (the browser clamping it as content above shrank).
 * The first candidate still present decides; zero with none left, since then
 * nothing says where the content went.
 */
export function anchorShift(
  anchor: ConversationAnchor,
  {
    viewportTop,
    scrollTop,
    capturedTop,
  }: {
    readonly viewportTop: number;
    readonly scrollTop: number;
    readonly capturedTop: number;
  },
  topOf: (id: string) => number | undefined,
): number {
  for (const candidate of anchor.candidates) {
    const top = topOf(candidate.id);
    if (top === undefined) continue;
    return scrollTop - capturedTop + top - viewportTop - candidate.offset;
  }
  return 0;
}

/**
 * Carries a glide in flight over content that moved under it by `shift`
 * (`anchorShift`). The view goes back over the content it showed when the
 * anchor was captured at `capturedTop`, and the start moves with the content,
 * so `glidePosition` from the new start towards the re-resolved target traces
 * the same path through the content, offset by `shift`, and lands on it.
 */
export function rebaseGlide({
  start,
  capturedTop,
  shift,
}: {
  readonly start: number;
  readonly capturedTop: number;
  readonly shift: number;
}): { readonly start: number; readonly scrollTop: number } {
  return { start: start + shift, scrollTop: capturedTop + shift };
}

/**
 * The `scrollTop` that puts an item's top at the top of the view, below an
 * optional `inset` (the container's `scroll-padding-top`, for a sticky
 * header). `itemTop` and `viewportTop` are in the same client coordinates.
 */
export function settleTarget({
  scrollTop,
  viewportTop,
  itemTop,
  inset = 0,
}: {
  readonly scrollTop: number;
  readonly viewportTop: number;
  readonly itemTop: number;
  readonly inset?: number;
}): number {
  return scrollTop + itemTop - viewportTop - inset;
}

/**
 * Space to reserve below the content so a settled item can sit at the top of
 * the view: the view's height minus everything from the item's top to the end
 * of the content, never negative. As the reply below the item grows, the
 * reserve shrinks by as much, so the scroll height (and the view) stays put
 * until the reply outgrows the view. Arguments are in scroll coordinates;
 * `viewportHeight` excludes any inset.
 */
export function reservedSpace({
  viewportHeight,
  itemTop,
  contentEnd,
}: {
  readonly viewportHeight: number;
  readonly itemTop: number;
  readonly contentEnd: number;
}): number {
  return Math.max(0, viewportHeight - (contentEnd - itemTop));
}

/** How far the end of the content is below the bottom of the view; the
 * reserved space after the content does not count as content. */
export function distanceFromEnd({
  scrollHeight,
  scrollTop,
  clientHeight,
  reserved = 0,
}: {
  readonly scrollHeight: number;
  readonly scrollTop: number;
  readonly clientHeight: number;
  readonly reserved?: number;
}): number {
  return scrollHeight - reserved - scrollTop - clientHeight;
}

/** Clamps a `scrollTop` to what the container can actually reach. */
export function clampScrollTop(
  value: number,
  scrollHeight: number,
  clientHeight: number,
): number {
  return Math.min(Math.max(0, value), Math.max(0, scrollHeight - clientHeight));
}

/** Who moved the view. */
export type ConversationScrollCause = "reader" | "self" | "layout";

/**
 * Classifies one scroll event. A scroll that lands where the container last
 * wrote `scrollTop` is the container's own (a follow, a glide frame, an anchor
 * restore), even inside a reader's gesture. Otherwise a scroll inside an open
 * gesture (`gestureUntil`, set from the reader's input only) is the reader's.
 * Anything else (content shrinking under the view, an image loading) is the
 * layout's, and must neither break a follow nor be captured as the reader's
 * position.
 */
export function classifyScroll({
  scrollTop,
  written,
  now,
  gestureUntil,
}: {
  readonly scrollTop: number;
  readonly written: number | null;
  readonly now: number;
  readonly gestureUntil: number;
}): ConversationScrollCause {
  if (written !== null && Math.abs(scrollTop - written) <= 1) return "self";
  if (now <= gestureUntil) return "reader";
  return "layout";
}

/**
 * The reader's gesture window after one of their own scrolls. Momentum after
 * a touch lifts (and a wheel's smooth-scroll animation) arrives as scroll
 * events with no input, so inside a momentum phase, which lasts until
 * `momentumUntil`, each of the reader's scrolls keeps the window open for
 * another quiet period, never past `momentumUntil`. Outside one, a scroll
 * never extends the window. Only `classifyScroll`'s "reader" scrolls count:
 * the conversation's own writes never extend it.
 */
export function extendGesture({
  now,
  gestureUntil,
  momentumUntil,
}: {
  readonly now: number;
  readonly gestureUntil: number;
  readonly momentumUntil: number;
}): number {
  if (now > momentumUntil) return gestureUntil;
  return Math.max(
    gestureUntil,
    Math.min(now + CONVERSATION_GESTURE_QUIET_MS, momentumUntil),
  );
}

/** A glide's length: longer jumps take a little longer, never sluggish. */
export function glideDuration(distance: number): number {
  return Math.min(320 + Math.abs(distance) * 0.08, 720);
}

export function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

/**
 * The glide's position at `progress` (0 to 1): eased from `start` towards a
 * `target` that is re-measured every frame, so it lands exactly even while
 * the content under it changes height. Content moving above the view moves
 * `start` too (`rebaseGlide`).
 */
export function glidePosition(
  start: number,
  target: number,
  progress: number,
): number {
  return (
    start + (target - start) * easeOutCubic(Math.min(Math.max(progress, 0), 1))
  );
}
