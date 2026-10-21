"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useId, useLayoutEffect, useRef } from "react";
import type { ComponentProps } from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { cn } from "../lib/utils.js";
import { useMessageContext } from "./message.js";

/** Answers longer than this many characters (about a thousand words) fold. */
export const MESSAGE_FOLD_THRESHOLD = 6_000;

export type MessageFoldProps = ComponentProps<"div"> & {
  /** The answer's length in characters, e.g. `text.length`. */
  readonly length: number;
  /** Folds only past this length. Default `MESSAGE_FOLD_THRESHOLD`. */
  readonly threshold?: number;
  /**
   * The answer is still arriving: it never folds. Defaults to whether the
   * enclosing `Message` is `streaming`.
   */
  readonly streaming?: boolean | undefined;
  /** Controlled open flag. Pair with `onOpenChange`. */
  readonly open?: boolean | undefined;
  /** Seeds the open flag when `open` is not supplied. Default `false`. */
  readonly defaultOpen?: boolean;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
};

function scrollContainerOf(element: HTMLElement): HTMLElement | null {
  for (
    let node = element.parentElement;
    node !== null;
    node = node.parentElement
  ) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
  }
  const page = document.scrollingElement;
  return page instanceof HTMLElement ? page : null;
}

/**
 * Folds a very long answer to its opening, with a control to show the rest.
 * Under `threshold`, or while streaming, it renders its children as they are.
 * Folded by default, except an answer that was streaming when it mounted,
 * which stays open once it finishes.
 *
 * Open, the "Show less" control rides the bottom of the view while the answer
 * is read. Folding from there keeps the reader's place: the control stays
 * where it was on screen and the nearest scroll container moves instead.
 * Moving focus into the folded part (a link, by Tab) unfolds it, so focus is
 * never hidden.
 */
export function MessageFold({
  length,
  threshold = MESSAGE_FOLD_THRESHOLD,
  streaming: streamingProp,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  onFocus,
  ...props
}: MessageFoldProps) {
  const message = useMessageContext();
  const streaming = streamingProp ?? message?.status === "streaming";
  const [open, setOpen] = useControllableState({
    value: openProp,
    // An answer the reader watched arrive starts open: it must not fold
    // under them the moment it finishes.
    defaultValue: defaultOpen || streaming,
    onChange: onOpenChange,
    name: "MessageFold",
  });
  const toggleRef = useRef<HTMLButtonElement>(null);
  const foldedFrom = useRef<number | null>(null);
  const bodyId = useId();
  const foldable = !streaming && length > threshold;

  useLayoutEffect(() => {
    const before = foldedFrom.current;
    const toggle = toggleRef.current;
    if (before === null || open || toggle === null) return;
    foldedFrom.current = null;
    const scroller = scrollContainerOf(toggle);
    if (scroller === null) return;
    const delta = toggle.getBoundingClientRect().top - before;
    scroller.scrollTop += delta;
  }, [open]);

  const folded = foldable && !open;

  // One element shape in every state, so the children are never remounted
  // when the answer becomes foldable (streaming ends, or it grows past the
  // threshold): only attributes change and the toggle comes and goes beside
  // the body.
  return (
    <div
      data-slot="message-fold"
      data-state={foldable ? (open ? "open" : "folded") : undefined}
      className={cn("flex min-w-0 flex-col", className)}
      onFocus={(event) => {
        onFocus?.(event);
        if (folded && toggleRef.current?.contains(event.target) !== true) {
          setOpen(true);
        }
      }}
      {...props}
    >
      <div
        id={bodyId}
        data-slot="message-fold-body"
        className={cn(folded && "max-h-96 overflow-hidden mask-b-from-60%")}
      >
        {children}
      </div>
      {foldable ? (
        <div className={cn("z-10 mt-2 flex", open && "sticky bottom-3")}>
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            data-slot="message-fold-toggle"
            className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-background px-3 text-xs font-medium text-muted-foreground shadow-surface transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-3.5"
            onClick={() => {
              if (open) {
                foldedFrom.current =
                  toggleRef.current?.getBoundingClientRect().top ?? null;
                // A controlled host may keep it open: drop the offset after
                // this frame so a later close does not apply it.
                requestAnimationFrame(() => {
                  foldedFrom.current = null;
                });
              }
              setOpen(!open);
            }}
          >
            {open ? (
              <>
                <ChevronUp aria-hidden /> Show less
              </>
            ) : (
              <>
                <ChevronDown aria-hidden /> Show full answer
              </>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
