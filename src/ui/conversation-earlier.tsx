"use client";

import { LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { ComponentProps } from "react";

import { cn } from "../lib/utils.js";
import { Button } from "./button.js";
import { useConversation } from "./conversation.js";

export type ConversationEarlierProps = ComponentProps<"div"> & {
  /** Older items exist; without them the marker renders nothing. */
  readonly hasEarlier: boolean;
  /** Older items are on their way. */
  readonly loading?: boolean | undefined;
  /** The last load brought nothing: stop asking on scroll and show a button
   * that asks again. */
  readonly stalled?: boolean | undefined;
  /** The marker came within `distance` of the view: show more. */
  readonly onReachStart: () => void;
  /** How far above the view, in pixels, the marker starts asking, so older
   * items arrive before the reader reaches the top. Defaults to 1200. */
  readonly distance?: number | undefined;
};

/**
 * Sits first in `ConversationContent` while older items exist, and asks for
 * them (`onReachStart`) as it nears the view, so history loads as the reader
 * scrolls up. It asks again whenever the conversation's items change or a
 * load ends, in case it is still in reach. Wire it to `useHistoryWindow`.
 *
 * It shows "Loading earlier messages…" while a load is in flight, and a
 * "Load earlier messages" button once a load comes back empty. Children
 * replace the text. Its height is the same in every state, so a change never
 * moves the reader. Pressing the button moves focus to the marker while the
 * load runs, and back to the button if it stalls again.
 */
export function ConversationEarlier({
  hasEarlier,
  loading = false,
  stalled = false,
  onReachStart,
  distance = 1200,
  className,
  children,
  ref,
  onFocus,
  onBlur,
  ...props
}: ConversationEarlierProps) {
  const { items, scrollContainer } = useConversation();
  const markerRef = useRef<HTMLDivElement | null>(null);
  const reach = useRef(onReachStart);
  useLayoutEffect(() => {
    reach.current = onReachStart;
  });
  /** The retry button had focus when pressed, and is about to unmount. */
  const retried = useRef(false);

  // A retry swaps the button for the loading text: hold focus on the marker
  // rather than let it fall to the body, and hand it back to the button if
  // the retry stalls again.
  useLayoutEffect(() => {
    const element = markerRef.current;
    if (element === null) return;
    if (stalled) {
      if (document.activeElement === element) {
        element.querySelector("button")?.focus();
      }
      return;
    }
    if (!retried.current) return;
    retried.current = false;
    const active = document.activeElement;
    if (active === null || active === document.body) {
      element.focus({ preventScroll: true });
    }
  }, [stalled]);

  // Once the last page has landed the marker goes away; if it held focus,
  // hand focus to the log so it doesn't fall to the body.
  const focused = useRef(false);
  useLayoutEffect(() => {
    if (hasEarlier || !focused.current) return;
    focused.current = false;
    const active = document.activeElement;
    if (active === null || active === document.body) {
      scrollContainer()?.focus({ preventScroll: true });
    }
  }, [hasEarlier, scrollContainer]);

  const setMarker = useCallback(
    (element: HTMLDivElement | null) => {
      markerRef.current = element;
      if (typeof ref === "function") ref(element);
      else if (ref !== null && ref !== undefined) ref.current = element;
    },
    [ref],
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!hasEarlier || loading || stalled || marker === null) return;
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) reach.current();
      },
      {
        root: scrollContainer(),
        rootMargin: `${distance}px 0px 0px 0px`,
      },
    );
    observer.observe(marker);
    // Observing afresh reports where the marker is now: still in reach after
    // a page of items went in above the reader means ask again.
    const stop = items.subscribe(() => {
      observer.unobserve(marker);
      observer.observe(marker);
    });
    return () => {
      stop();
      observer.disconnect();
    };
  }, [hasEarlier, loading, stalled, distance, items, scrollContainer]);

  if (!hasEarlier) return null;
  return (
    <div
      ref={setMarker}
      tabIndex={-1}
      data-slot="conversation-earlier"
      data-state={loading ? "loading" : stalled ? "stalled" : "idle"}
      aria-busy={loading || undefined}
      onFocus={(event) => {
        focused.current = true;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          focused.current = false;
        }
        onBlur?.(event);
      }}
      className={cn(
        "flex h-8 shrink-0 items-center justify-center gap-1.5 text-xs text-muted-foreground focus-visible:-outline-offset-2 [&_svg]:size-3.5",
        className,
      )}
      {...props}
    >
      {stalled ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            retried.current = document.activeElement === event.currentTarget;
            onReachStart();
          }}
        >
          Load earlier messages
        </Button>
      ) : (
        (children ?? (
          <>
            {loading ? (
              <LoaderCircle aria-hidden className="motion-safe:animate-spin" />
            ) : null}
            {loading ? "Loading earlier messages…" : "Earlier messages"}
          </>
        ))
      )}
    </div>
  );
}
