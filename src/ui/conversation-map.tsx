"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ComponentProps, KeyboardEvent } from "react";

import { useReadingPosition } from "../hooks/use-reading-position.js";
import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion.js";
import { cn } from "../lib/utils.js";
import { useConversation } from "./conversation.js";

export type ConversationMapTurn = {
  /** The id of the `ConversationItem` that starts the turn. */
  readonly id: string;
  /** What was said, as plain text: the tick's accessible name. */
  readonly label: string;
  /** The reply, as plain text, shown under the label when previewed. */
  readonly preview?: string;
};

export type ConversationMapProps = Omit<
  ComponentProps<"nav">,
  "children" | "onSelect"
> & {
  /** Turns in document order. Each spans its items up to the next turn.
   * Each turn's `ConversationItem` must be mounted: under a history window,
   * pass the turns of the windowed items, not the whole conversation. */
  readonly turns: readonly ConversationMapTurn[];
  /** Called after a tick starts the jump to its turn. */
  readonly onSelect?: ((id: string) => void) | undefined;
};

/** The previewed turn, and where its tick's middle sits in the map. */
type Preview = { readonly id: string; readonly center: number };

const MAP = "[data-slot='conversation-map']";
const TICK = "[data-slot='conversation-map-tick']";
const KEYS = ["ArrowUp", "ArrowDown", "Home", "End"];

/** Where a tick's middle sits, measured from the top of the map. */
function centerOf(tick: HTMLElement, nav: HTMLElement): number {
  const box = tick.getBoundingClientRect();
  return box.top + box.height / 2 - nav.getBoundingClientRect().top;
}

/** The rail's `scrollTop` that brings `tick` fully into view by the shortest
 * move, or `null` when it is in view already. */
function nearestTop(rail: HTMLElement, tick: HTMLElement): number | null {
  const view = rail.getBoundingClientRect();
  const box = tick.getBoundingClientRect();
  if (box.top < view.top) return rail.scrollTop + box.top - view.top;
  if (box.bottom > view.bottom) {
    return rail.scrollTop + box.bottom - view.bottom;
  }
  return null;
}

/** Scrolls the rail alone to bring `tick` into view: scrollIntoView would
 * also scroll every ancestor, pulling the page to a conversation below the
 * fold. */
function keepInView(
  rail: HTMLElement,
  tick: HTMLElement,
  behavior: ScrollBehavior,
): void {
  const top = nearestTop(rail, tick);
  if (top !== null) rail.scrollTo({ top, behavior });
}

/**
 * A rail of ticks, one per turn, for finding your way around a long
 * conversation. Ticks are faint, longer and darker for turns on screen, and
 * longest in the primary colour for the turn being read. Pointing at or
 * focusing a tick previews its turn; clicking it glides there.
 *
 * Place it inside `Conversation` but outside `ConversationContent` (the log
 * is a live region, and the rail must not scroll with it). It sits over the
 * content's left edge, so give the content column room, e.g.
 * `[&>[data-slot=conversation-column]]:pl-12` on `ConversationContent`.
 *
 * Map only mounted turns. A tick for a turn whose item is not mounted (a
 * windowed or virtualised list) does not jump, even when `onSelect` mounts it.
 *
 * The rail is one tab stop; the arrow keys, Home and End move along it, and
 * Escape dismisses the preview. When the rail overflows, it scrolls to keep
 * the current tick in view; only the rail moves, never the page. Renders
 * nothing for fewer than two turns.
 */
export const ConversationMap = forwardRef<HTMLElement, ConversationMapProps>(
  function ConversationMap(
    {
      turns,
      onSelect,
      "aria-label": label = "Conversation map",
      className,
      onKeyDown,
      onPointerLeave,
      onBlur,
      ...props
    },
    ref,
  ) {
    const turnIds = useMemo(() => turns.map((turn) => turn.id), [turns]);
    const { currentId, visibleIds, jumpTo } = useReadingPosition(turnIds);
    const { scrollContainer } = useConversation();
    const currentRef = useRef<HTMLButtonElement>(null);
    const railRef = useRef<HTMLDivElement>(null);
    const placedRef = useRef(false);
    const reducedMotion = usePrefersReducedMotion();
    const hidden = turns.length < 2;
    const cardRef = useRef<HTMLDivElement>(null);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const previewTextId = useId();

    // Clamped once the card has a height, so it stays beside the rail.
    useLayoutEffect(() => {
      const card = cardRef.current;
      const nav = card?.closest<HTMLElement>(MAP);
      if (
        preview === null ||
        card === null ||
        nav === null ||
        nav === undefined
      )
        return;
      const half = card.offsetHeight / 2;
      const top = Math.min(
        Math.max(preview.center, half),
        nav.clientHeight - half,
      );
      card.style.top = `${top}px`;
    }, [preview]);

    useEffect(() => {
      const rail = railRef.current;
      const tick = currentRef.current;
      if (rail === null) {
        placedRef.current = false;
        return;
      }
      if (tick === null) return;
      // The first placement is instant; later ones glide unless reduced.
      keepInView(
        rail,
        tick,
        placedRef.current && !reducedMotion ? "smooth" : "auto",
      );
      placedRef.current = true;
    }, [currentId, hidden, reducedMotion]);

    // The focused tick's turn left `turns` (a history window trimmed it, the
    // host deleted it), or the rail hid with it: its button is gone, focus fell
    // to the body, and React reports no blur for it. Hand focus to the rail's
    // tab stop, or to the log once the rail itself is gone.
    useLayoutEffect(() => {
      if (focusedId === null || (!hidden && turnIds.includes(focusedId))) {
        return;
      }
      setFocusedId(null);
      const active = document.activeElement;
      if (active !== null && active !== document.body) return;
      const stop = [
        ...(railRef.current?.querySelectorAll<HTMLElement>(TICK) ?? []),
      ].find((tick) => tick.tabIndex === 0);
      (stop ?? scrollContainer())?.focus({ preventScroll: true });
    }, [focusedId, hidden, turnIds, scrollContainer]);

    // Escape dismisses a preview wherever focus is: one the mouse opened
    // covers the content while focus stays in the composer or the log.
    const previewing = preview !== null;
    useEffect(() => {
      if (!previewing) return;
      const onKeyDown = (event: globalThis.KeyboardEvent) => {
        if (event.key === "Escape") setPreview(null);
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [previewing]);

    // A rail that shrinks (the host's layout, the window) can clip the current
    // tick: bring it back at once.
    useEffect(() => {
      const rail = railRef.current;
      if (rail === null) return;
      const observer = new ResizeObserver(() => {
        const tick = currentRef.current;
        if (tick !== null) keepInView(rail, tick, "auto");
      });
      observer.observe(rail);
      return () => observer.disconnect();
    }, [hidden]);

    if (hidden) return null;

    const visible = new Set(visibleIds);
    const has = (id: string | null) =>
      id !== null && turns.some((turn) => turn.id === id);
    const stopId = has(focusedId)
      ? focusedId
      : has(currentId)
        ? currentId
        : (turns[0]?.id ?? null);
    const previewed =
      preview === null
        ? undefined
        : turns.find((turn) => turn.id === preview.id);

    const show = (id: string, tick: HTMLElement) => {
      const nav = tick.closest<HTMLElement>(MAP);
      if (nav === null) return;
      setPreview({ id, center: centerOf(tick, nav) });
    };

    // Focus moving along the rail and keep-in-view both scroll it: the card
    // follows its tick, and closes once the tick has scrolled out of the rail.
    const follow = () => {
      const rail = railRef.current;
      const nav = rail?.closest<HTMLElement>(MAP);
      if (
        preview === null ||
        rail === null ||
        nav === null ||
        nav === undefined
      )
        return;
      const { id } = preview;
      const tick = [...rail.querySelectorAll<HTMLElement>(TICK)].find(
        (element) => element.dataset["turnId"] === id,
      );
      let measured: Preview | null = null;
      if (tick !== undefined) {
        const view = rail.getBoundingClientRect();
        const box = tick.getBoundingClientRect();
        if (box.bottom > view.top && box.top < view.bottom) {
          measured = { id, center: centerOf(tick, nav) };
        }
      }
      // An updater, so a close queued by a wheel this frame is not undone.
      setPreview((previous) => (previous?.id === id ? measured : previous));
    };

    const move = (event: KeyboardEvent<HTMLElement>) => {
      if (!KEYS.includes(event.key)) return;
      const ticks = [
        ...(railRef.current?.querySelectorAll<HTMLElement>(TICK) ?? []),
      ];
      const index = ticks.findIndex((tick) => tick === event.target);
      if (index === -1) return;
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? ticks.length - 1
            : index + (event.key === "ArrowDown" ? 1 : -1);
      // Also at either end, so the keys never scroll the rail or the page.
      event.preventDefault();
      const rail = railRef.current;
      const target = ticks[next];
      if (rail === null || target === undefined) return;
      // Focus alone would scroll every ancestor to reveal a clipped tick.
      keepInView(rail, target, "auto");
      target.focus({ preventScroll: true });
    };

    return (
      <nav
        ref={ref}
        aria-label={label}
        data-slot="conversation-map"
        className={cn(
          // Only the rail and the card take the pointer: the rest of the box
          // passes wheel and clicks through to the conversation beneath.
          "pointer-events-none absolute inset-y-4 left-2 z-10 flex items-center",
          className,
        )}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (event.key === "Escape" && preview !== null) {
            event.stopPropagation();
            setPreview(null);
            return;
          }
          move(event);
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event);
          setPreview(null);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          if (
            event.relatedTarget instanceof Node &&
            event.currentTarget.contains(event.relatedTarget)
          ) {
            return;
          }
          setFocusedId(null);
          setPreview(null);
        }}
        {...props}
      >
        <div
          ref={railRef}
          data-slot="conversation-map-rail"
          className="pointer-events-auto flex max-h-full w-6 flex-col overflow-y-auto py-2 [scrollbar-width:none]"
          // The pointer scrolling the rail leaves the card behind its tick.
          onWheel={() => setPreview(null)}
          onTouchMove={() => setPreview(null)}
          onScroll={follow}
        >
          {turns.map((turn) => {
            const current = turn.id === currentId;
            const onScreen = visible.has(turn.id);
            const described =
              preview?.id === turn.id && turn.preview !== undefined;
            return (
              <button
                key={turn.id}
                ref={current ? currentRef : undefined}
                type="button"
                data-slot="conversation-map-tick"
                data-turn-id={turn.id}
                data-visible={onScreen ? "" : undefined}
                aria-label={turn.label}
                aria-current={current ? "location" : undefined}
                aria-describedby={described ? previewTextId : undefined}
                tabIndex={turn.id === stopId ? 0 : -1}
                // A mouse gets the dense rail, the whole conversation at a
                // glance, with ticks under the 24px of WCAG 2.5.8. That rests on
                // its "equivalent" exception: scrolling the conversation reaches
                // every turn a tick jumps to. A finger gets the 24px target, so
                // on a touch screen each tick keeps that height and the rail
                // scrolls.
                className="group flex min-h-1.5 w-full shrink grow-0 basis-3.5 cursor-pointer items-center rounded-sm focus-visible:-outline-offset-2 pointer-coarse:min-h-6 pointer-coarse:shrink-0 pointer-coarse:basis-6"
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") {
                    show(turn.id, event.currentTarget);
                  }
                }}
                onFocus={(event) => {
                  setFocusedId(turn.id);
                  show(turn.id, event.currentTarget);
                }}
                onClick={() => {
                  jumpTo(turn.id);
                  onSelect?.(turn.id);
                }}
              >
                <span
                  aria-hidden
                  // Length and thickness carry the state as well as colour;
                  // only transforms move, so pointing never lays anything out.
                  className={cn(
                    "h-0.5 w-6 origin-left rounded-full transition-[transform,background-color] duration-micro ease-out",
                    current
                      ? "scale-y-200 bg-primary"
                      : cn(
                          "group-hover:scale-x-100 group-hover:bg-foreground/70 group-focus-visible:scale-x-100 group-focus-visible:bg-foreground/70",
                          onScreen
                            ? "scale-x-75 bg-muted-foreground/70"
                            : "scale-x-50 bg-muted-foreground/30",
                        ),
                  )}
                />
              </button>
            );
          })}
        </div>
        {previewed === undefined ? null : (
          <div
            ref={cardRef}
            role="tooltip"
            data-slot="conversation-map-preview"
            className="pointer-events-auto absolute left-full -translate-y-1/2 pl-2"
            style={{ top: preview?.center }}
          >
            <div className="w-60 rounded-lg border border-border bg-popover px-3 py-2.5 text-popover-foreground shadow-surface motion-safe:animate-[corbits-fade-in_120ms_ease-out]">
              <p className="line-clamp-2 text-sm font-medium">
                {previewed.label}
              </p>
              {previewed.preview === undefined ? null : (
                <p
                  id={previewTextId}
                  className="mt-1 line-clamp-3 text-sm text-muted-foreground"
                >
                  {previewed.preview}
                </p>
              )}
            </div>
          </div>
        )}
      </nav>
    );
  },
);
