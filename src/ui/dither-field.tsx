"use client";

import { useLayoutEffect, useRef } from "react";

import { usePrefersReducedMotion } from "../hooks/use-prefers-reduced-motion.js";
import {
  DITHER_GRAIN_STEPS,
  createDitherFieldFrame,
  ditherFieldFrame,
} from "../lib/dither-field.js";
import { cn } from "../lib/utils.js";

/** Edge of one grain cell, in CSS pixels. */
const GRAIN_PX = 4;

/** How often a running field re-reads its colours, so a theme switch reaches it. */
const COLOR_REFRESH_MS = 1000;

export type DitherFieldReveal = {
  /** Wait this long before the edge starts, so a grid can cascade. */
  readonly delayMs: number;
  /** Called once every cell is cleared, or at once when there is nothing to animate. */
  readonly onDone: () => void;
};

export type DitherFieldProps = {
  readonly seed: number;
  /** Clear the field away over whatever is beneath it. */
  readonly reveal?: DitherFieldReveal | undefined;
  readonly className?: string;
};

type Colors = { ground: string; field: string; band: string };

/** The theme's colours read off the canvas, so the grain follows light and dark. */
function readColors(canvas: HTMLCanvasElement): Colors {
  const computed = getComputedStyle(canvas);
  const token = (name: string) =>
    computed.getPropertyValue(name).trim() || computed.color;
  return {
    ground: token("--muted"),
    field: token("--foreground"),
    band: token("--primary"),
  };
}

/** Sizes the canvas in device pixels, so the grain stays crisp on a dense screen. */
function fitCanvas(canvas: HTMLCanvasElement) {
  const ratio = window.devicePixelRatio || 1;
  const box = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(box.width * ratio));
  const height = Math.max(1, Math.round(box.height * ratio));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  return { width, height, ratio };
}

/**
 * Something being made, as a live dither: a slow interference field in the
 * foreground colour and a band of the primary sweeping across, over the
 * muted ground. It claims no progress; it says only that something is forming.
 *
 * Time is the page clock, not the component's, so a field that remounts (a
 * placeholder becoming its image) carries on mid-motion with the same `seed`.
 *
 * With `reveal`, the band makes one last pass as an edge that cuts cells out
 * of the field, in dither order, so whatever is beneath shows through.
 *
 * Off screen the field stops drawing, and a reveal off screen completes at
 * once. Reduced motion draws one still frame, and a reveal completes at once.
 */
export function DitherField({ seed, reveal, className }: DitherFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = usePrefersReducedMotion();
  const revealing = reveal !== undefined;
  const delayMs = reveal?.delayMs ?? 0;
  const onDoneRef = useRef(reveal?.onDone);
  // A layout effect declared before the drawing one, so the latest callback
  // is in place when a reveal completes on the same commit.
  useLayoutEffect(() => {
    onDoneRef.current = reveal?.onDone;
  });

  // A layout effect, so a fresh canvas is drawn before it is painted and
  // never flashes empty.
  useLayoutEffect(() => {
    const finish = () => onDoneRef.current?.();
    const canvas = ref.current;
    const context = canvas?.getContext("2d") ?? null;
    if (canvas === null || context === null) {
      if (revealing) finish();
      return;
    }
    if (reduce && revealing) {
      finish();
      return;
    }

    let colors = readColors(canvas);
    let colorsAt = performance.now();
    const frame = createDitherFieldFrame();
    const revealStartMs = revealing ? performance.now() + delayMs : null;

    // Returns whether there is anything left to draw.
    const draw = (timeMs: number): boolean => {
      const { width, height, ratio } = fitCanvas(canvas);
      const cell = GRAIN_PX * ratio;
      ditherFieldFrame(
        {
          cols: Math.ceil(width / cell),
          rows: Math.ceil(height / cell),
          seed,
          timeMs,
          revealStartMs,
        },
        frame,
      );
      const fill = (cells: readonly number[], size: number) => {
        context.beginPath();
        for (let at = 0; at < cells.length; at += 2) {
          context.rect(
            (cells[at] ?? 0) * cell,
            (cells[at + 1] ?? 0) * cell,
            size,
            size,
          );
        }
        context.fill();
      };
      // A one-device-pixel gutter between cells is the grain.
      const lit = cell - ratio;
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
      context.fillStyle = colors.ground;
      context.fillRect(0, 0, width, height);
      for (let step = 0; step < DITHER_GRAIN_STEPS; step += 1) {
        const strength = (step + 1) / DITHER_GRAIN_STEPS;
        context.globalAlpha = strength * 0.3;
        context.fillStyle = colors.field;
        fill(frame.ink[step] ?? [], lit);
        context.globalAlpha = strength * 0.85;
        context.fillStyle = colors.band;
        fill(frame.band[step] ?? [], lit);
      }
      // Cleared cells are cut out whole, so what is beneath shows through.
      context.globalAlpha = 1;
      context.globalCompositeOperation = "destination-out";
      fill(frame.cleared, cell);
      context.globalCompositeOperation = "source-over";
      return !frame.done;
    };

    if (reduce) {
      const still = () => draw(seed * 700);
      still();
      const resize =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(still);
      resize?.observe(canvas);
      return () => resize?.disconnect();
    }

    let animationFrame = 0;
    let visible = true;
    let finished = false;
    const complete = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(animationFrame);
      finish();
    };
    const loop = (now: number) => {
      if (now - colorsAt > COLOR_REFRESH_MS) {
        colorsAt = now;
        colors = readColors(canvas);
      }
      if (!draw(now)) {
        complete();
        return;
      }
      if (visible) animationFrame = requestAnimationFrame(loop);
    };
    draw(performance.now());
    const watch =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            const next = entry?.isIntersecting ?? true;
            if (!next && revealing) {
              visible = false;
              complete();
              return;
            }
            if (next && !visible && !finished) {
              animationFrame = requestAnimationFrame(loop);
            }
            visible = next;
          });
    watch?.observe(canvas);
    animationFrame = requestAnimationFrame(loop);
    return () => {
      finished = true;
      cancelAnimationFrame(animationFrame);
      watch?.disconnect();
    };
  }, [seed, reduce, revealing, delayMs]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      data-slot="dither-field"
      className={cn("absolute inset-0 block size-full", className)}
    />
  );
}
