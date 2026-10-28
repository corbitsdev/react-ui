import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  currentTurn,
  readingPosition,
  samePosition,
  type MeasuredReadingPosition,
} from "../lib/reading-position.js";
import { useConversation } from "../ui/conversation.js";

export type ReadingPosition = {
  /** The turn being read, or `null` before anything is on screen. */
  readonly currentId: string | null;
  /** Turns with any item on screen, in document order. */
  readonly visibleIds: readonly string[];
  /**
   * Glides to a turn, like `scrollToItem`, and keeps it current until the
   * reader scrolls the view or it leaves the view, even where the view cannot
   * bring it to the top. A glide cut short before the turn came on screen
   * ends the jump. Only a mounted turn can be jumped to.
   */
  readonly jumpTo: (id: string) => void;
};

type Measured = MeasuredReadingPosition & { readonly pinnedId: string | null };

const NOTHING: Measured = { lineId: null, visibleIds: [], pinnedId: null };

/** Input on the scroll container after a jump that may move the view. */
const READER_INPUT = ["wheel", "touchstart", "keydown", "pointerdown"] as const;

type Pin = {
  readonly id: string;
  /** The turn has been on screen since the jump. */
  seen: boolean;
  /** The reader has given input on the container since the jump. */
  armed: boolean;
};

function scrollPaddingTop(element: HTMLElement): number {
  const value = Number.parseFloat(getComputedStyle(element).scrollPaddingTop);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Which turns of the surrounding `Conversation` are on screen and which one
 * is being read: the last whose start has crossed a line a third of the way
 * down the view (below any `scroll-padding-top`), or the last on screen once
 * the view is at the end.
 *
 * `turnIds` are the item ids that start a turn; each turn spans the items up
 * to the next one. Omitted, every registered item is a turn. Turns whose items
 * are not mounted (a virtualised or windowed list) are never on screen.
 *
 * One `IntersectionObserver`, rooted on the conversation's scroll container,
 * watches every registered item. The answer is measured on the
 * conversation's per-frame scroll snapshot (`subscribeScroll`), on
 * intersection and registry changes, so scrolling re-renders the caller only
 * when the answer changes.
 */
export function useReadingPosition(
  turnIds?: readonly string[],
): ReadingPosition {
  const { items, atBottom, scrollToItem, scrollContainer, subscribeScroll } =
    useConversation();
  const [measured, setMeasured] = useState<Measured>(NOTHING);
  const turnsRef = useRef<ReadonlySet<string> | null>(null);
  const pinRef = useRef<Pin | null>(null);
  const measureRef = useRef<(() => void) | null>(null);
  // Ids can hold any character, so no separator is safe to join them with.
  const turnsKey = turnIds === undefined ? null : JSON.stringify(turnIds);

  useLayoutEffect(() => {
    turnsRef.current = turnIds === undefined ? null : new Set(turnIds);
    measureRef.current?.();
    // Keyed on the ids' content: a host passes a new array every render.
  }, [turnsKey]);

  useEffect(() => {
    let scroller: HTMLElement | null = null;
    let observer: IntersectionObserver | null = null;
    const observed = new Map<string, Element>();
    const idOf = new Map<Element, string>();
    const visible = new Set<string>();

    const measure = () => {
      let next: MeasuredReadingPosition = NOTHING;
      if (scroller !== null) {
        const view = scroller.getBoundingClientRect();
        const inset = scrollPaddingTop(scroller);
        next = readingPosition({
          ids: items.ids(),
          turnIds: turnsRef.current,
          visible,
          turnTop: (id) => items.get(id)?.getBoundingClientRect().top,
          line: view.top + inset + (view.height - inset) / 3,
        });
      }
      const pin = pinRef.current;
      if (pin !== null) {
        if (next.visibleIds.includes(pin.id)) pin.seen = true;
        else if (pin.seen) pinRef.current = null;
      }
      const pinnedId = pinRef.current?.id ?? null;
      setMeasured((previous) =>
        previous.pinnedId === pinnedId && samePosition(previous, next)
          ? previous
          : { ...next, pinnedId },
      );
    };
    // The pin is released by the reader scrolling the view after the jump:
    // input on the container arms it, and a byReader snapshot that moved the
    // view releases it. Input alone (clicking text, typing in an item) keeps
    // it, and arming keeps a gesture from just before the jump, which the
    // engine still counts as the reader's, from releasing it mid-glide.
    const arm = () => {
      if (pinRef.current !== null) pinRef.current.armed = true;
    };

    const onEntries = (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        // A late entry for an element no longer observed is dropped.
        const id = idOf.get(entry.target);
        if (id === undefined) continue;
        if (entry.isIntersecting) visible.add(id);
        else visible.delete(id);
      }
      measure();
    };

    const detach = () => {
      observer?.disconnect();
      observer = null;
      if (scroller !== null) {
        for (const type of READER_INPUT) {
          scroller.removeEventListener(type, arm);
        }
      }
      scroller = null;
      observed.clear();
      idOf.clear();
      visible.clear();
      // A jump does not outlive the view it was gliding, seen or not.
      pinRef.current = null;
    };

    /** Follows the scroll container (`null` while `ConversationContent` is
     * unmounted or remounting), then the registry: observes new elements and
     * drops gone ones. */
    const sync = () => {
      const root = scrollContainer();
      if (root !== scroller) {
        detach();
        if (root !== null) {
          scroller = root;
          observer = new IntersectionObserver(onEntries, { root });
          for (const type of READER_INPUT) {
            root.addEventListener(type, arm, { passive: true });
          }
        }
      }
      if (observer !== null) {
        for (const [id, element] of observed) {
          if (items.get(id) === element) continue;
          observer.unobserve(element);
          observed.delete(id);
          idOf.delete(element);
          visible.delete(id);
        }
        for (const id of items.ids()) {
          const element = items.get(id);
          if (element === undefined || observed.get(id) === element) continue;
          observed.set(id, element);
          idOf.set(element, id);
          observer.observe(element);
        }
      }
      // A jumped-to turn removed before it was seen can never release.
      const pin = pinRef.current;
      if (pin !== null && items.get(pin.id) === undefined) {
        pinRef.current = null;
      }
    };

    measureRef.current = measure;
    // Items already mounted registered before this effect ran, and the
    // container attached in ConversationContent's layout effect.
    sync();
    measure();
    const stopItems = items.subscribe(() => {
      sync();
      measure();
    });
    // Once a frame while the view moves, and once after the container
    // attaches (which also picks up a remounted ConversationContent).
    const stopScroll = subscribeScroll((snapshot) => {
      if (scrollContainer() !== scroller) sync();
      if (pinRef.current?.armed && snapshot.byReader && snapshot.delta !== 0) {
        pinRef.current = null;
      }
      measure();
    });
    return () => {
      stopItems();
      stopScroll();
      detach();
      measureRef.current = null;
    };
  }, [items, scrollContainer, subscribeScroll]);

  const jumpTo = useCallback(
    (id: string) => {
      const pin: Pin | null =
        items.get(id) === undefined ? null : { id, seen: false, armed: false };
      pinRef.current = pin;
      scrollToItem(id, {
        // Cut short (the reader's input or momentum, another glide) before
        // the turn came on screen: nothing keeps it current any more.
        onEnd: (arrived) => {
          if (arrived || pin === null || pinRef.current !== pin || pin.seen) {
            return;
          }
          pinRef.current = null;
          measureRef.current?.();
        },
      });
      measureRef.current?.();
    },
    [items, scrollToItem],
  );

  const currentId = currentTurn(measured, atBottom);
  const { visibleIds } = measured;
  return useMemo(
    () => ({ currentId, visibleIds, jumpTo }),
    [currentId, visibleIds, jumpTo],
  );
}
