import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CONVERSATION_END_THRESHOLD } from "../lib/conversation-scroll.js";
import { useConversation } from "../ui/conversation.js";

/** Where the window starts: the latest `windowSize` items, or a pinned item. */
type WindowStart =
  | { readonly kind: "latest" }
  | { readonly kind: "item"; readonly id: string };

const LATEST: WindowStart = { kind: "latest" };

/** A load the host was asked for: the first item it had when asked. */
type EarlierRequest = {
  readonly first: string | undefined;
  readonly settled: boolean;
};

type WindowState = {
  readonly start: WindowStart;
  readonly request: EarlierRequest | null;
  /** The `atBottom` and last item id seen at the last render, so a change
   * in either is noticed once. */
  readonly atBottom: boolean;
  readonly lastId: string | undefined;
};

export type UseHistoryWindowOptions<T extends { readonly id: string }> = {
  /** Every item the host holds, oldest first. Ids must stay stable across
   * pages: the reader's position is kept by id. */
  readonly items: readonly T[];
  /** How many of the latest items the window holds at the bottom. Defaults
   * to 120. It should cover the view plus the marker's reach at the
   * smallest item height, or each new item at the bottom trims a page that
   * is loaded straight back. */
  readonly windowSize?: number | undefined;
  /** How many more items each load near the top brings in. Defaults to 60. */
  readonly step?: number | undefined;
  /** The host has older items than `items[0]` that it can page in. */
  readonly hasEarlier?: boolean | undefined;
  /**
   * Called when the reader nears the start of `items` and `hasEarlier` is
   * true: prepend the next page to `items`. Called once until the returned
   * promise settles. A load that settles without a new first item (an empty
   * page, or a rejection) leaves the window `stalled`; report failures from
   * here, the hook only stops asking.
   */
  readonly onLoadEarlier?: (() => Promise<void> | void) | undefined;
};

export type HistoryWindow<T> = {
  /** The items to render, oldest first. */
  readonly items: readonly T[];
  /** Older items exist, in `items` before the window or with the host. */
  readonly hasEarlier: boolean;
  /** `onLoadEarlier` is in flight. */
  readonly loading: boolean;
  /** The window starts at the first item and the last load brought nothing
   * new: stop asking on scroll and offer a retry. Clears when a new first
   * item arrives, and never holds back items already above the window. */
  readonly stalled: boolean;
  /** The reader is near the start of the window: show `step` more items, or
   * ask the host for a page once the window holds every item it has. */
  readonly reachStart: () => void;
};

function startIndex(
  items: readonly { readonly id: string }[],
  start: WindowStart,
  windowSize: number,
  previous: readonly { readonly id: string }[],
): number {
  const latest = Math.max(0, items.length - windowSize);
  if (start.kind === "latest") return latest;
  const at = items.findIndex((item) => item.id === start.id);
  if (at !== -1) return at;
  // The pinned item is gone (deleted, or its id replaced): start at the
  // first item of the last window that still exists, so nothing above the
  // reader goes with it.
  const ids = new Set(items.map((item) => item.id));
  const kept = previous.find((item) => ids.has(item.id));
  return kept === undefined
    ? latest
    : items.findIndex((item) => item.id === kept.id);
}

/**
 * Renders a window of a long conversation: the latest `windowSize` items,
 * with older ones added `step` at a time as the reader nears the top. While
 * the reader is scrolled up the window only grows, so nothing they are
 * reading is removed; back at the bottom it shrinks to `windowSize` again.
 * Each load keeps the item being read where it was, through the
 * conversation's `captureAnchor` / `restoreAnchor`.
 *
 * Call it inside `<Conversation>`, in the component that renders
 * `ConversationContent`, and put a `ConversationEarlier` first in the
 * content, wired to `hasEarlier`, `loading`, `stalled` and `reachStart`.
 * Key the `<Conversation>` by conversation, so a pinned window never carries
 * over to another one.
 *
 * Two sources work the same way. In-memory history passes every item and
 * no `hasEarlier`. Server paging passes what it has loaded, `hasEarlier`,
 * and an `onLoadEarlier` that prepends the next page; a landed page is
 * revealed `step` items at a time like local history, so a large page never
 * mounts at once.
 *
 * ## The ceiling
 *
 * This windows; it does not virtualise. Every item in the window is a real,
 * mounted element in normal flow, so the browser's own scrolling, momentum
 * and scrollbar apply, find-in-page and focus reach everything in the
 * window, and items of any height (streaming text, images that load late)
 * need no measuring or estimating. The cost is that the window grows as far
 * as the reader scrolls back in one sitting, and is trimmed only when they
 * return to the bottom.
 *
 * It is built for conversations up to about 10,000 items held in memory.
 * The window mounts `windowSize` items at the bottom (120 by default) and
 * `step` more per load. Each render does one linear id lookup over `items`
 * and slices the window; the slice is reused until `items` or the window
 * start change, and scrolling re-renders the host only when the reader
 * leaves or reaches the bottom.
 *
 * Page from the server instead (`hasEarlier`, `onLoadEarlier`) when the
 * history is longer than that, when items are heavy enough that holding
 * them all costs memory (large tool outputs, images), or when most readers
 * never scroll back far. If readers routinely read back through thousands
 * of items in one go, the mounted window itself becomes the cost, and
 * virtualisation is the better trade despite losing find-in-page.
 */
export function useHistoryWindow<T extends { readonly id: string }>({
  items,
  windowSize = 120,
  step = 60,
  hasEarlier = false,
  onLoadEarlier,
}: UseHistoryWindowOptions<T>): HistoryWindow<T> {
  const { atBottom, captureAnchor, restoreAnchor, subscribeScroll } =
    useConversation();
  const lastId = items.at(-1)?.id;
  const [state, setState] = useState<WindowState>(() => ({
    start: LATEST,
    request: null,
    atBottom,
    lastId,
  }));
  const previousWindow = useRef<readonly T[]>([]);

  let start = state.start;
  if (state.atBottom !== atBottom || state.lastId !== lastId) {
    // Back at the bottom, or a new item while there: trim back. The
    // conversation's anchor is current from the reader's last scroll.
    if (atBottom) start = LATEST;
    setState({ ...state, start, atBottom, lastId });
  }

  const index = useMemo(
    () => startIndex(items, start, windowSize, previousWindow.current),
    [items, start, windowSize],
  );
  const shown = useMemo(() => items.slice(index), [items, index]);
  const firstId = shown[0]?.id;

  const request = state.request;
  const loading = request !== null && !request.settled;
  // The host is only asked from items[0], so its stall applies only there;
  // items held above the window are always revealed.
  const stalled =
    index === 0 &&
    request !== null &&
    request.settled &&
    items[0]?.id === request.first;

  const latest = useRef({ items, index, step, hasEarlier, onLoadEarlier });
  const pending = useRef<object | null>(null);
  useLayoutEffect(() => {
    latest.current = { items, index, step, hasEarlier, onLoadEarlier };
    previousWindow.current = shown;
  });

  // Items above the reader came or went: put what they were reading back.
  // Also needed when an append and a trim cancel out, so nothing resizes.
  const seenFirst = useRef(firstId);
  useLayoutEffect(() => {
    if (firstId === seenFirst.current) return;
    seenFirst.current = firstId;
    restoreAnchor();
  }, [firstId, restoreAnchor]);

  // The reader scrolls away from the end: freeze the start, so new items no
  // longer slide the window over what they are looking at.
  useEffect(
    () =>
      subscribeScroll((snapshot) => {
        if (!snapshot.byReader) return;
        if (snapshot.distanceFromEnd <= CONVERSATION_END_THRESHOLD) return;
        setState((current) => {
          const first = latest.current.items[latest.current.index]?.id;
          if (current.start.kind !== "latest" || first === undefined) {
            return current;
          }
          return { ...current, start: { kind: "item", id: first } };
        });
      }),
    [subscribeScroll],
  );

  const reachStart = useCallback(() => {
    const { items, index, step, hasEarlier, onLoadEarlier } = latest.current;
    const earlier = items[Math.max(0, index - step)];
    if (index > 0 && earlier !== undefined) {
      captureAnchor();
      setState((current) => ({
        ...current,
        start: { kind: "item", id: earlier.id },
      }));
      return;
    }
    if (!hasEarlier || onLoadEarlier === undefined) return;
    if (pending.current !== null) return;
    const token = {};
    pending.current = token;
    const first = items[0]?.id;
    // Pin the start, so the page lands above the window and is revealed a
    // step at a time rather than all at once.
    setState((current) => ({
      ...current,
      start: first === undefined ? current.start : { kind: "item", id: first },
      request: { first, settled: false },
    }));
    const settle = () => {
      if (pending.current !== token) return;
      pending.current = null;
      setState((current) => ({
        ...current,
        request: { first, settled: true },
      }));
    };
    let result: Promise<void> | void;
    try {
      result = onLoadEarlier();
    } catch (error) {
      settle();
      throw error;
    }
    void Promise.resolve(result).then(settle, settle);
  }, [captureAnchor]);

  return {
    items: shown,
    hasEarlier: index > 0 || hasEarlier,
    loading,
    stalled,
    reachStart,
  };
}
