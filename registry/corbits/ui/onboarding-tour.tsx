"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/registry/corbits/lib/utils";
import { Button } from "@/registry/corbits/ui/button";

export type TourStep = {
  readonly id: string;
  /** CSS selector for the element to spotlight. Omit to centre the card. */
  readonly target?: string;
  readonly title: string;
  readonly body: string;
};

export type OnboardingTourProps = {
  readonly steps: readonly TourStep[];
  readonly open: boolean;
  /** Fired on finish and on skip alike — the host records "seen" either way. */
  readonly onClose: () => void;
  readonly className?: string;
};

type Rect = { top: number; left: number; width: number; height: number };

const PADDING = 8;
const CARD_WIDTH = 320;
const GAP = 12;

/**
 * A guided walkthrough: dim the page, cut a hole around one element, explain it.
 *
 * The spotlight is a single fixed div sized to the target with a very large
 * spread `box-shadow`, so the "hole" is the element's own box and the dimming
 * is the shadow around it. That beats an SVG mask or four dimming rectangles:
 * one element, no seams between panels, and the browser handles the geometry.
 *
 * The hole has `pointer-events: none` so the highlighted control stays usable —
 * a tour that says "click here" and then blocks the click is worse than no tour.
 * Escape ends it at any point, because a walkthrough the user cannot leave is a
 * trap, and so does a click on the dimmed area — in both branches, anchored and
 * not, since "click outside to dismiss" that works on some steps and silently
 * does nothing on others teaches the user the tour is stuck. `onClose` fires
 * for finishing and skipping alike so the host records "seen" without caring
 * which happened.
 *
 * Steps whose `target` matches nothing still render, centred. A tour that
 * silently drops steps when a selector goes stale is a tour that quietly stops
 * explaining half the product.
 */
export function OnboardingTour({ steps, open, onClose, className }: OnboardingTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Reset to the first step whenever the tour is reopened. Adjusted during
  // render rather than in an effect: an effect would paint step 3 of the last
  // run for one frame before snapping back to step 1.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setIndex(0);
  }

  const step = steps[index];
  const target = step?.target;
  const isLast = index === steps.length - 1;

  const measure = useCallback(() => {
    if (!open || target === undefined) {
      setRect(null);
      return;
    }
    const element = document.querySelector(target);
    if (element === null) {
      setRect(null);
      return;
    }
    element.scrollIntoView({ block: "center", behavior: "smooth" });
    const box = element.getBoundingClientRect();
    setRect({
      top: box.top - PADDING,
      left: box.left - PADDING,
      width: box.width + PADDING * 2,
      height: box.height + PADDING * 2,
    });
  }, [open, target]);

  // Measuring the DOM is the one legitimate reason to set state from an effect:
  // the rect cannot be known until the element is laid out, and this has to run
  // before paint or the card renders once at the wrong position.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useLayoutEffect(measure, [measure]);

  useEffect(() => {
    if (!open) return;
    // `true` on scroll: the target may sit inside a scrolling pane, and a
    // listener on window alone never hears those.
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || step === undefined) return null;

  // Below the target if it fits, above if not, centred when unanchored.
  const cardStyle: React.CSSProperties =
    rect === null
      ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
      : rect.top + rect.height + GAP + 180 < window.innerHeight
        ? { top: rect.top + rect.height + GAP, left: Math.max(GAP, Math.min(rect.left, window.innerWidth - CARD_WIDTH - GAP)) }
        : { bottom: window.innerHeight - rect.top + GAP, left: Math.max(GAP, Math.min(rect.left, window.innerWidth - CARD_WIDTH - GAP)) };

  return (
    <div className={cn("fixed inset-0 z-90", className)}>
      {rect === null ? (
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      ) : (
        <>
          {/* Click-out, cut into four strips around the spotlight rather than
              one sheet over the page. A single `inset-0` catcher would end the
              tour when the user clicked the very control it is pointing at;
              these leave that rectangle alone, so "click anywhere else to
              leave" is true in both branches without taking the target back. */}
          {[
            { top: 0, left: 0, width: "100%", height: Math.max(0, rect.top) },
            { top: rect.top + rect.height, left: 0, width: "100%", bottom: 0 },
            { top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height },
            { top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height },
          ].map((style, index) => (
            <div key={index} className="absolute" style={style} onClick={onClose} />
          ))}
          <div
            aria-hidden
            className="pointer-events-none absolute rounded-md ring-2 ring-primary transition-all duration-200"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
            }}
          />
        </>
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-label={step.title}
        tabIndex={-1}
        style={{ ...cardStyle, position: "absolute", width: CARD_WIDTH }}
        className="flex flex-col gap-3 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg"
      >
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            Step {index + 1} of {steps.length}
          </p>
          <h3 className="text-sm font-semibold">{step.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Skip
          </Button>
          <div className="ml-auto flex gap-2">
            {index > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setIndex((value) => value - 1)}>
                Back
              </Button>
            ) : null}
            <Button size="sm" onClick={() => (isLast ? onClose() : setIndex((value) => value + 1))}>
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
