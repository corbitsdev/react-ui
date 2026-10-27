"use client";

import { ArrowDown } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ComponentProps, ReactNode, Ref, RefCallback } from "react";

import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion.js";
import {
  CONVERSATION_END_THRESHOLD,
  CONVERSATION_GESTURE_QUIET_MS,
  CONVERSATION_MOMENTUM_MS,
  anchorCorrection,
  anchorShift,
  captureAnchor,
  clampScrollTop,
  classifyScroll,
  distanceFromEnd,
  extendGesture,
  glideDuration,
  glidePosition,
  rebaseGlide,
  releasedReserve,
  reservedSpace,
  settleTarget,
  type ConversationAnchor,
} from "../lib/conversation-scroll.js";
import { cn } from "../lib/utils.js";
import { EmptyState } from "./empty-state.js";

/**
 * How the view moves as a conversation grows.
 *
 * - `settle`: a sent item glides to the top of the view and the reply writes
 *   in below it, into space reserved for it; streaming never moves the view.
 * - `stick`: the view follows new content while the reader is at the end, and
 *   stays put once they scroll away.
 */
export type ConversationScrollPolicy = "settle" | "stick";

/**
 * The registered items, read without re-rendering: `get` and `ids` read the
 * current registry, `subscribe` calls back (once per batch) when an item
 * registers or unregisters.
 */
export interface ConversationItems {
  get(id: string): HTMLElement | undefined;
  /** Registered ids in document order. */
  ids(): readonly string[];
  subscribe(listener: () => void): () => void;
}

/**
 * The scroll container's geometry after a frame in which it scrolled, as
 * `subscribeScroll` hands it to its listeners.
 */
export type ConversationScrollSnapshot = {
  readonly scrollTop: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
  /** How far the end of the content is below the bottom of the view, not
   * counting the space `settle` reserves after it; at most
   * `CONVERSATION_END_THRESHOLD` means the end is in view. */
  readonly distanceFromEnd: number;
  /** `scrollTop` minus its value at the previous notification (0 on the
   * first): negative when the view moved towards the top. */
  readonly delta: number;
  /** At least one scroll since the previous notification was the reader's
   * own: it came while a finger or the scrollbar was held, within
   * `CONVERSATION_GESTURE_QUIET_MS` of their wheel, touch or key input, or
   * as momentum continuing a lifted touch or a wheel (at most
   * `CONVERSATION_MOMENTUM_MS` after it). The conversation's own writes
   * (following, glides, anchoring) never count, even then, and neither does
   * the layout or the page moving the view (focus, find in page), even when
   * the conversation keeps where it put the view. */
  readonly byReader: boolean;
};

export type ConversationContextValue = {
  /** The end of the content is in view (within a few pixels). */
  readonly atBottom: boolean;
  readonly items: ConversationItems;
  /** Glides an item's top to the top of the view. */
  readonly scrollToItem: (id: string) => void;
  /** Glides to the end of the content. */
  readonly scrollToEnd: () => void;
  /** Records which items are in view and where, right now; call it just
   * before changing content above the reader. */
  readonly captureAnchor: () => void;
  /** Puts the captured items back where they were; call it in a layout
   * effect after the change. Resizes keep it in place until the next jump.
   * Mid-glide, the glide moves with the content and still lands on its
   * target. */
  readonly restoreAnchor: () => void;
  /** The scroll container (the `ConversationContent` element, role `log`),
   * or `null` while none is mounted. */
  readonly scrollContainer: () => HTMLElement | null;
  /** Calls `listener` at most once per animation frame: once after the
   * container mounts, then after each frame in which it scrolled. Returns the
   * unsubscribe function. */
  readonly subscribeScroll: (
    listener: (snapshot: ConversationScrollSnapshot) => void,
  ) => () => void;
};

type ItemRegistry = ConversationItems & {
  register(id: string, element: HTMLElement): () => void;
};

function createItemRegistry(): ItemRegistry {
  const elements = new Map<string, HTMLElement>();
  const listeners = new Set<() => void>();
  let ordered: readonly string[] | null = null;
  let pending = false;

  const notify = () => {
    ordered = null;
    if (pending) return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      for (const listener of listeners) listener();
    });
  };

  return {
    get: (id) => elements.get(id),
    // Sorted on read, then cached until the registry changes: items mount in
    // any order (a page of history lands above), but are read on every scroll.
    ids() {
      ordered ??= [...elements.entries()]
        .sort(([, a], [, b]) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
            ? -1
            : 1,
        )
        .map(([id]) => id);
      return ordered;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    register(id, element) {
      elements.set(id, element);
      notify();
      return () => {
        if (elements.get(id) !== element) return;
        elements.delete(id);
        notify();
      };
    },
  };
}

/**
 * Calls `call` for each listener subscribed when notification starts, once
 * each, skipping any unsubscribed by an earlier one. A listener that throws
 * does not stop the others: its error is reported asynchronously instead.
 */
function notifyAll<T>(listeners: ReadonlySet<T>, call: (listener: T) => void) {
  // A copy: listeners may subscribe or unsubscribe while being notified.
  for (const listener of Array.from(listeners)) {
    if (!listeners.has(listener)) continue;
    try {
      call(listener);
    } catch (error) {
      if (typeof reportError === "function") reportError(error);
      else
        queueMicrotask(() => {
          throw error;
        });
    }
  }
}

/** The keys that scroll a focused container vertically. */
const SCROLL_KEYS: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches("input, textarea, select"))
  );
}

/**
 * The scrolling machinery, outside React: it reads and writes the DOM on
 * scroll, resize and animation frames, where re-rendering would be both too
 * slow and pointless. React only attaches it and feeds it props.
 */
function createConversationEngine() {
  const registry = createItemRegistry();
  const items: ConversationItems = {
    get: registry.get,
    ids: registry.ids,
    subscribe: registry.subscribe,
  };
  let scroller: HTMLElement | null = null;
  let spacer: HTMLElement | null = null;
  let policy: ConversationScrollPolicy = "settle";
  let reducedMotion = false;
  /** The view tracks the end. Both policies start here, so history that
   * arrives after mount still opens at the latest; `settle` leaves it at the
   * first send or the reader's first scroll away, `stick` whenever the reader
   * scrolls away and back. */
  let following = true;
  let anchor: ConversationAnchor = { candidates: [] };
  /** `scrollTop` when `anchor` was captured. */
  let anchorTop = 0;
  /** The last `scrollTop` this engine wrote, until its scroll event lands. */
  let written: number | null = null;
  /** The reader's gesture is open until then; only their input moves it. */
  let gestureUntil = 0;
  /** A finger or the scrollbar is down: the gesture stays open meanwhile. */
  let pointerHeld = false;
  let touchHeld = false;
  /** The momentum phase after a touch lifts or a wheel tick ends then. */
  let momentumUntil = 0;
  let resizedAt = Number.NEGATIVE_INFINITY;
  let reserved = 0;
  let settledId: string | null = null;
  let glideToken = 0;
  let gliding = false;
  /** Where the glide in flight eases from; moves with the content under it. */
  let glideStart = 0;
  let frame = 0;
  let atBottom = true;
  const atBottomListeners = new Set<() => void>();
  const scrollListeners = new Set<
    (snapshot: ConversationScrollSnapshot) => void
  >();
  /** Scroll listeners are owed a snapshot at the next frame. */
  let scrolled = false;
  let scrolledByReader = false;
  let notifiedTop: number | null = null;
  let sentSeeded = false;
  let lastSent: string | undefined;

  const write = (value: number) => {
    if (scroller === null) return;
    const before = scroller.scrollTop;
    scroller.scrollTop = value;
    if (scroller.scrollTop !== before) written = scroller.scrollTop;
  };

  const distance = () =>
    scroller === null
      ? 0
      : distanceFromEnd({
          scrollHeight: scroller.scrollHeight,
          scrollTop: scroller.scrollTop,
          clientHeight: scroller.clientHeight,
          reserved,
        });

  const endTop = () =>
    scroller === null
      ? 0
      : clampScrollTop(
          scroller.scrollHeight - reserved - scroller.clientHeight,
          scroller.scrollHeight,
          scroller.clientHeight,
        );

  const inset = () => {
    if (scroller === null) return 0;
    const value = Number.parseFloat(
      getComputedStyle(scroller).scrollPaddingTop,
    );
    return Number.isFinite(value) ? value : 0;
  };

  const itemTarget = (id: string): number | null => {
    const element = registry.get(id);
    if (scroller === null || element === undefined) return null;
    return clampScrollTop(
      settleTarget({
        scrollTop: scroller.scrollTop,
        viewportTop: scroller.getBoundingClientRect().top,
        itemTop: element.getBoundingClientRect().top,
        inset: inset(),
      }),
      scroller.scrollHeight,
      scroller.clientHeight,
    );
  };

  const capture = () => {
    if (scroller === null) return;
    const view = scroller.getBoundingClientRect();
    anchorTop = scroller.scrollTop;
    anchor = captureAnchor(view, registry.ids(), (id) =>
      registry.get(id)?.getBoundingClientRect(),
    );
  };

  /** Content moved under the glide in flight: move the view and the glide's
   * start with it, so the glide keeps its path and its target. */
  const rebase = () => {
    if (scroller === null) return;
    const shift = anchorShift(
      anchor,
      {
        viewportTop: scroller.getBoundingClientRect().top,
        scrollTop: scroller.scrollTop,
        capturedTop: anchorTop,
      },
      (id) => registry.get(id)?.getBoundingClientRect().top,
    );
    if (Math.abs(shift) <= 0.5) return;
    const next = rebaseGlide({
      start: glideStart,
      capturedTop: anchorTop,
      shift,
    });
    glideStart = next.start;
    write(next.scrollTop);
    capture();
  };

  const restore = () => {
    if (scroller === null) return;
    if (gliding) {
      rebase();
      return;
    }
    if (following) {
      write(endTop());
      return;
    }
    const correction = anchorCorrection(
      anchor,
      scroller.getBoundingClientRect().top,
      (id) => registry.get(id)?.getBoundingClientRect().top,
    );
    if (Math.abs(correction) > 0.5) write(scroller.scrollTop + correction);
  };

  const updateReserve = () => {
    if (scroller === null || spacer === null) return;
    let next: number;
    const element = settledId === null ? undefined : registry.get(settledId);
    if (policy === "settle" && element !== undefined) {
      const view = scroller.getBoundingClientRect();
      const offset = scroller.scrollTop - view.top;
      const toScroll = (top: number) => top + offset;
      next = reservedSpace({
        viewportHeight: scroller.clientHeight - inset(),
        itemTop: toScroll(element.getBoundingClientRect().top),
        contentEnd: toScroll(spacer.getBoundingClientRect().top),
      });
    } else {
      // The settled item was removed or the policy changed: release the
      // reserve, keeping only what holds the view where it is.
      settledId = null;
      next = releasedReserve({
        scrollTop: scroller.scrollTop,
        distanceFromEnd: distance(),
      });
    }
    if (Math.abs(next - reserved) <= 0.5) return;
    reserved = next;
    spacer.style.height = `${next}px`;
  };

  const notifyScroll = () => {
    const byReader = scrolledByReader;
    scrolled = false;
    scrolledByReader = false;
    if (scroller === null) return;
    const scrollTop = scroller.scrollTop;
    const previousTop = notifiedTop;
    notifiedTop = scrollTop;
    if (scrollListeners.size === 0) return;
    const snapshot: ConversationScrollSnapshot = {
      scrollTop,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
      distanceFromEnd: distance(),
      delta: previousTop === null ? 0 : scrollTop - previousTop,
      byReader,
    };
    notifyAll(scrollListeners, (listener) => listener(snapshot));
  };

  /** The one per-frame pass over scroll-derived state: `atBottom`, and the
   * snapshot owed to scroll listeners. */
  const scheduleAtBottom = () => {
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (scrolled) notifyScroll();
      const next = distance() <= CONVERSATION_END_THRESHOLD;
      if (next === atBottom) return;
      atBottom = next;
      notifyAll(atBottomListeners, (listener) => listener());
    });
  };

  const cancelGlide = () => {
    glideToken += 1;
    gliding = false;
  };

  /** One eased motion towards a target measured afresh every frame; instant
   * under reduced motion. The reader's input or scroll, or another glide,
   * cancels it. Content that moves above the view mid-glide carries the glide
   * with it (`rebase`). */
  const glide = (target: () => number | null) => {
    if (scroller === null) return;
    const token = glideToken + 1;
    glideToken = token;
    const first = target();
    if (first === null) {
      gliding = false;
      return;
    }
    gliding = true;
    const arrive = () => {
      if (token !== glideToken) return;
      gliding = false;
      if (policy === "stick") {
        following = distance() <= CONVERSATION_END_THRESHOLD;
      }
      capture();
      scheduleAtBottom();
    };
    const start = scroller.scrollTop;
    if (reducedMotion || Math.abs(first - start) <= 1) {
      write(first);
      arrive();
      return;
    }
    glideStart = start;
    capture();
    const duration = glideDuration(first - start);
    const begin = performance.now();
    const step = (now: number) => {
      if (token !== glideToken) return;
      // Content may have moved since the last frame with no resize callback
      // yet (this frame's runs after it).
      rebase();
      const progress = Math.min((now - begin) / duration, 1);
      const aim = target();
      if (aim !== null) write(glidePosition(glideStart, aim, progress));
      capture();
      if (progress < 1) requestAnimationFrame(step);
      else arrive();
    };
    requestAnimationFrame(step);
  };

  const openGesture = () => {
    gestureUntil = performance.now() + CONVERSATION_GESTURE_QUIET_MS;
    cancelGlide();
  };

  const onScroll = () => {
    if (scroller === null) return;
    const now = performance.now();
    const cause = classifyScroll({
      scrollTop: scroller.scrollTop,
      written,
      now,
      gestureUntil:
        pointerHeld || touchHeld ? Number.POSITIVE_INFINITY : gestureUntil,
    });
    // This event reports where the view is now: any write before it has
    // either landed or been overtaken.
    written = null;
    scrolled = true;
    if (cause === "reader") scrolledByReader = true;
    scheduleAtBottom();
    if (gliding) {
      // The reader's scroll (momentum already running when the glide began)
      // stops the glide, as their input does; any other leaves it in charge.
      if (cause !== "reader") return;
      cancelGlide();
    }
    if (cause === "reader") {
      gestureUntil = extendGesture({ now, gestureUntil, momentumUntil });
      const atEnd = distance() <= CONVERSATION_END_THRESHOLD;
      if (policy === "stick") following = atEnd;
      else if (!atEnd) following = false;
      capture();
      return;
    }
    if (cause === "self") {
      capture();
      return;
    }
    // The layout moved the view. A scroll right after a resize is the
    // resize's clamp, already corrected by the resize callback, and must not
    // become the anchor; following, the end wins over it, and over any scroll
    // that stays at the end. Any other is the page moving the view on purpose
    // (find in page, focus) and is kept: away from the end, it breaks a follow
    // as the reader's own scroll would.
    const afterResize = now - resizedAt <= 100;
    if (following) {
      if (afterResize || distance() <= CONVERSATION_END_THRESHOLD) {
        write(endTop());
        return;
      }
      following = false;
    }
    if (!afterResize) capture();
  };

  const onResize = () => {
    resizedAt = performance.now();
    updateReserve();
    restore();
    scheduleAtBottom();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (SCROLL_KEYS.has(event.key) && !isEditable(event.target)) openGesture();
  };

  const onPointerDown = (event: PointerEvent) => {
    // Only the container itself (its scrollbar): a click on a control inside
    // an item is not a scroll.
    if (event.target !== scroller) return;
    pointerHeld = true;
    openGesture();
  };

  const onPointerUp = () => {
    if (!pointerHeld) return;
    pointerHeld = false;
    gestureUntil = performance.now() + CONVERSATION_GESTURE_QUIET_MS;
  };

  const onTouchStart = () => {
    touchHeld = true;
    openGesture();
  };

  const onTouchEnd = () => {
    if (!touchHeld) return;
    touchHeld = false;
    const now = performance.now();
    gestureUntil = now + CONVERSATION_GESTURE_QUIET_MS;
    momentumUntil = now + CONVERSATION_MOMENTUM_MS;
  };

  const onWheel = () => {
    openGesture();
    momentumUntil = performance.now() + CONVERSATION_MOMENTUM_MS;
  };

  return {
    items,
    registry,
    attach(element: HTMLElement, content: HTMLElement, reserve: HTMLElement) {
      scroller = element;
      spacer = reserve;
      // A new spacer starts empty, whatever the last one held.
      reserved = 0;
      const observer = new ResizeObserver(onResize);
      observer.observe(content);
      observer.observe(element);
      const stopListening = registry.subscribe(updateReserve);
      element.addEventListener("scroll", onScroll, { passive: true });
      element.addEventListener("wheel", onWheel, { passive: true });
      element.addEventListener("touchstart", onTouchStart, { passive: true });
      element.addEventListener("touchmove", openGesture, { passive: true });
      element.addEventListener("touchend", onTouchEnd, { passive: true });
      element.addEventListener("touchcancel", onTouchEnd, { passive: true });
      element.addEventListener("keydown", onKeyDown);
      element.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
      updateReserve();
      if (following) write(endTop());
      capture();
      notifiedTop = null;
      scrolled = true;
      scheduleAtBottom();
      return () => {
        observer.disconnect();
        stopListening();
        element.removeEventListener("scroll", onScroll);
        element.removeEventListener("wheel", onWheel);
        element.removeEventListener("touchstart", onTouchStart);
        element.removeEventListener("touchmove", openGesture);
        element.removeEventListener("touchend", onTouchEnd);
        element.removeEventListener("touchcancel", onTouchEnd);
        element.removeEventListener("keydown", onKeyDown);
        element.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        cancelAnimationFrame(frame);
        frame = 0;
        cancelGlide();
        pointerHeld = false;
        touchHeld = false;
        momentumUntil = 0;
        scrolled = false;
        scrolledByReader = false;
        scroller = null;
        spacer = null;
      };
    },
    setPolicy(next: ConversationScrollPolicy) {
      if (next === policy) return;
      policy = next;
      if (policy === "stick")
        following = distance() <= CONVERSATION_END_THRESHOLD;
      updateReserve();
    },
    setReducedMotion(next: boolean) {
      reducedMotion = next;
    },
    /** The host's latest sent item. The first value seen is history, not a
     * send; each change after it to a registered item's id is one. */
    sent(id: string | undefined) {
      if (!sentSeeded) {
        sentSeeded = true;
        lastSent = id;
        return;
      }
      if (id === lastSent) return;
      lastSent = id;
      if (id === undefined || registry.get(id) === undefined) return;
      if (policy === "stick") {
        following = true;
        glide(endTop);
        return;
      }
      following = false;
      settledId = id;
      // Reserve first, so the target is clamped against the room made for it.
      updateReserve();
      glide(() => itemTarget(id));
    },
    scrollToItem(id: string) {
      following = false;
      glide(() => itemTarget(id));
    },
    scrollToEnd() {
      glide(endTop);
    },
    captureAnchor: capture,
    restoreAnchor: restore,
    focus() {
      scroller?.focus({ preventScroll: true });
    },
    subscribeAtBottom(listener: () => void) {
      atBottomListeners.add(listener);
      return () => {
        atBottomListeners.delete(listener);
      };
    },
    getAtBottom: () => atBottom,
    scrollContainer: () => scroller,
    subscribeScroll(listener: (snapshot: ConversationScrollSnapshot) => void) {
      scrollListeners.add(listener);
      return () => {
        scrollListeners.delete(listener);
      };
    },
  };
}

type ConversationEngine = ReturnType<typeof createConversationEngine>;

const ConversationContext = createContext<ConversationEngine | null>(null);

function useEngine(component: string): ConversationEngine {
  const engine = useContext(ConversationContext);
  if (engine === null) {
    throw new Error(`${component} must be used within <Conversation>`);
  }
  return engine;
}

function useMergedRef<T>(own: RefCallback<T>, theirs: Ref<T> | undefined) {
  return useCallback(
    (node: T | null) => {
      const cleanup = own(node);
      if (typeof theirs === "function") theirs(node);
      else if (theirs !== null && theirs !== undefined) theirs.current = node;
      return () => {
        if (typeof cleanup === "function") cleanup();
        if (typeof theirs === "function") theirs(null);
        else if (theirs !== null && theirs !== undefined) theirs.current = null;
      };
    },
    [own, theirs],
  );
}

/**
 * The scroll state shared under a `Conversation`. The functions and `items`
 * keep their identity for the conversation's lifetime; `atBottom` is the only
 * value that changes, and a component calling this re-renders only when it
 * flips, never per scroll.
 *
 * For per-scroll work without re-rendering (a reading position, a history
 * window that loads near the top and holds still while the reader is up):
 *
 * - `scrollContainer()` returns the scroll container element (role `log`,
 *   whatever its `data-slot` or `ref`), or `null` while none is mounted.
 * - `subscribeScroll(listener)` returns an unsubscribe function. The listener
 *   gets a `ConversationScrollSnapshot` at most once per animation frame,
 *   from the same frame pass that updates `atBottom` (no listener of its own
 *   on the container): once after the container mounts, then after each
 *   frame with scroll events. `byReader` says whether any of those scrolls
 *   was the reader's own rather than the conversation's or the layout's;
 *   `delta` is the change in `scrollTop` since the previous snapshot.
 */
export function useConversation(): ConversationContextValue {
  const engine = useEngine("useConversation");
  const atBottom = useSyncExternalStore(
    engine.subscribeAtBottom,
    engine.getAtBottom,
    () => true,
  );
  return useMemo(
    () => ({
      atBottom,
      items: engine.items,
      scrollToItem: engine.scrollToItem,
      scrollToEnd: engine.scrollToEnd,
      captureAnchor: engine.captureAnchor,
      restoreAnchor: engine.restoreAnchor,
      scrollContainer: engine.scrollContainer,
      subscribeScroll: engine.subscribeScroll,
    }),
    [engine, atBottom],
  );
}

export type ConversationProps = ComponentProps<"div"> & {
  /** How the view moves as the conversation grows. Defaults to `settle`. */
  readonly scrollPolicy?: ConversationScrollPolicy;
  /**
   * The id of the reader's latest sent item. Each change to the `itemId` of a
   * mounted `ConversationItem` is a send: under `settle` that item glides to
   * the top of the view, under `stick` the view glides to the end and follows
   * again. Render the item in the same update that sets its id: an id with no
   * item changes nothing, and is not a send when the item appears later. The
   * value at mount is history.
   */
  readonly sentId?: string | undefined;
};

/**
 * Owns a conversation's scrolling and shares it through `useConversation()`.
 * It renders no messages: put a `ConversationContent` inside, with a
 * `ConversationItem` around each thing the host renders, and a
 * `ConversationScrollButton` beside it.
 *
 * Only the reader's own scrolling (wheel, touch, scroll keys, the scrollbar),
 * or the page moving the view away from the end (focus, find in page), breaks
 * a follow; content resizing never scrolls what they are reading. Jumps are
 * one glide, instant under reduced motion.
 */
export function Conversation({
  scrollPolicy = "settle",
  sentId,
  className,
  children,
  ...props
}: ConversationProps) {
  const [engine] = useState(createConversationEngine);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    engine.setReducedMotion(reducedMotion);
  }, [engine, reducedMotion]);
  useLayoutEffect(() => {
    engine.setPolicy(scrollPolicy);
  }, [engine, scrollPolicy]);
  useLayoutEffect(() => {
    engine.sent(sentId);
  }, [engine, sentId]);

  return (
    <ConversationContext.Provider value={engine}>
      <div
        data-slot="conversation"
        data-scroll-policy={scrollPolicy}
        className={cn("relative flex min-h-0 flex-1 flex-col", className)}
        {...props}
      >
        {children}
      </div>
    </ConversationContext.Provider>
  );
}

export type ConversationContentProps = ComponentProps<"div">;

/**
 * The scrolling log, and the part's root: `ref`, `id`, `className`, the ARIA
 * naming props and every other prop go to the scroll container (role `log`).
 * The log is named "Conversation" unless the host passes `aria-label` or
 * `aria-labelledby`.
 *
 * Children render in a content column inside it (`data-slot`
 * `conversation-column`, `flex flex-col gap-4 p-4`). Restyle the column from
 * this part's `className` through its slot, e.g.
 * `[&>[data-slot=conversation-column]]:gap-6`.
 *
 * The container is focusable so the keyboard can scroll it, turns off the
 * browser's scroll anchoring (the conversation anchors for itself), and keeps
 * an empty block after the content: the room a settled item needs to reach
 * the top of the view.
 */
export function ConversationContent({
  "aria-label": label,
  "aria-labelledby": labelledBy,
  className,
  children,
  ref,
  ...props
}: ConversationContentProps) {
  const engine = useEngine("ConversationContent");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const ownScroller = useCallback((node: HTMLDivElement | null) => {
    scrollerRef.current = node;
    return () => {
      scrollerRef.current = null;
    };
  }, []);
  const mergedRef = useMergedRef(ownScroller, ref);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const column = columnRef.current;
    const spacer = spacerRef.current;
    if (scroller === null || column === null || spacer === null) return;
    return engine.attach(scroller, column, spacer);
  }, [engine]);

  return (
    <div
      ref={mergedRef}
      role="log"
      aria-label={
        label ?? (labelledBy === undefined ? "Conversation" : undefined)
      }
      aria-labelledby={labelledBy}
      tabIndex={0}
      data-slot="conversation-content"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto [overflow-anchor:none] focus-visible:-outline-offset-2",
        className,
      )}
      {...props}
    >
      <div
        ref={columnRef}
        data-slot="conversation-column"
        className="flex flex-col gap-4 p-4"
      >
        {children}
      </div>
      <div ref={spacerRef} aria-hidden data-slot="conversation-reserve" />
    </div>
  );
}

export type ConversationItemProps = ComponentProps<"div"> & {
  /** The registry key: what `scrollToItem`, `sentId` and anchors refer to. */
  readonly itemId: string;
};

/**
 * One entry in the conversation, registered by `itemId` so the conversation
 * can find it, settle it and anchor on it. Wrap whatever the host renders.
 */
export function ConversationItem({
  itemId,
  ref,
  ...props
}: ConversationItemProps) {
  const engine = useEngine("ConversationItem");
  // React 19 runs the cleanup `register` returns. React 18 ignores that
  // return and detaches by calling the ref with null, so release there too.
  const release = useRef<(() => void) | null>(null);
  const register = useCallback(
    (element: HTMLDivElement | null) => {
      release.current?.();
      release.current = null;
      if (element === null) return;
      const cleanup = engine.registry.register(itemId, element);
      release.current = cleanup;
      return cleanup;
    },
    [engine, itemId],
  );
  const mergedRef = useMergedRef(register, ref);
  return (
    <div
      ref={mergedRef}
      data-slot="conversation-item"
      data-item-id={itemId}
      {...props}
    />
  );
}

export type ConversationScrollButtonProps = ComponentProps<"button">;

/**
 * Appears when the end of the conversation is out of view and glides back to
 * it. Focus moves to the conversation as it does, and whenever the button
 * leaves while it holds focus, however the end came into view.
 */
export function ConversationScrollButton(props: ConversationScrollButtonProps) {
  const { atBottom } = useConversation();
  return atBottom ? null : <ScrollToLatest {...props} />;
}

/** The button itself, mounted only while the end is out of view. */
function ScrollToLatest({
  "aria-label": label = "Scroll to latest",
  className,
  children,
  onClick,
  ref,
  ...props
}: ConversationScrollButtonProps) {
  const engine = useEngine("ConversationScrollButton");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ownButton = useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node;
  }, []);
  const mergedRef = useMergedRef(ownButton, ref);
  // A layout effect's cleanup runs while the leaving button is still in the
  // document, so it can tell whether it held focus.
  useLayoutEffect(() => {
    const button = buttonRef.current;
    return () => {
      if (button !== null && button === document.activeElement) engine.focus();
    };
  }, [engine]);
  return (
    <button
      ref={mergedRef}
      type="button"
      data-slot="conversation-scroll-button"
      aria-label={label}
      {...props}
      className={cn(
        "absolute bottom-4 left-1/2 inline-flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-border-strong bg-background text-foreground shadow-surface transition-colors hover:bg-muted [&_svg]:size-4",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        engine.focus();
        engine.scrollToEnd();
      }}
    >
      {children ?? <ArrowDown aria-hidden />}
    </button>
  );
}

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  readonly title?: string;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
};

/** No items yet. Children replace the default title, description and icon. */
export function ConversationEmptyState({
  title = "No messages yet",
  description,
  icon,
  className,
  children,
  ...props
}: ConversationEmptyStateProps) {
  return (
    <div
      data-slot="conversation-empty-state"
      className={cn(
        "flex min-h-0 flex-1 flex-col items-center justify-center",
        className,
      )}
      {...props}
    >
      {children ?? (
        <EmptyState title={title} description={description} icon={icon} />
      )}
    </div>
  );
}
