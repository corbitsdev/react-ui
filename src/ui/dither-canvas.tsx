import { useEffect, useRef } from "react";

import { cn } from "../lib/utils.js";

/**
 * 4×4 Bayer matrix, normalised to 0–1.
 *
 * Ordered dithering, not error diffusion. Error diffusion (Floyd–Steinberg and
 * friends) is serial — each pixel's error feeds the next — so it cannot be
 * recomputed cheaply every frame, and the pattern crawls when anything moves.
 * An ordered matrix is a pure function of position, so a frame costs one pass
 * and the texture stays locked to the surface instead of swimming.
 */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((value) => (value + 0.5) / 16));

export type DitherCanvasProps = {
  /** Edge of one dither cell, in CSS pixels. Larger reads as coarser grain. */
  readonly cell?: number;
  /** Ink colour for lit cells. Defaults to the theme's primary. */
  readonly color?: string;
  /** How far the pointer's influence reaches, in CSS pixels. `0` disables it. */
  readonly warpRadius?: number;
  readonly className?: string;
};

/**
 * A dithered field that reacts to the pointer — decoration for a full-bleed
 * panel, and nothing else.
 *
 * Drawn on a canvas rather than as a repeating background image because the
 * point is that it *moves*: a radial field drifts slowly, the pointer pushes a
 * bright spot through it, and both need per-frame recomputation. A CSS pattern
 * can be one of those things but not the other.
 *
 * `aria-hidden` and unfocusable, unconditionally. It carries no information;
 * anything a reader needs is in the content laid over it.
 *
 * Reduced motion is honoured by drawing exactly one frame and stopping — not by
 * slowing down and not by hiding it. The texture is the design; the animation is
 * the part that makes some people ill. The theme's global CSS override cannot
 * reach a `requestAnimationFrame` loop, so the check lives here.
 *
 * The canvas is sized in device pixels and scaled by `devicePixelRatio`. Without
 * that the grid is resampled by the compositor on a retina display and the
 * crisp dot pattern — the entire effect — turns to mush.
 */
export function DitherCanvas({ cell = 4, color, warpRadius = 160, className }: DitherCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (canvas === null) return;
    const context = canvas.getContext("2d");
    if (context === null) return;

    // Resolved once per mount: reading a custom property costs a style
    // recalculation, which is not something to do sixty times a second.
    const themeInk = getComputedStyle(canvas).getPropertyValue("--primary").trim();
    const ink = color ?? (themeInk === "" ? "#e98428" : themeInk);

    const pointer = { x: -1e6, y: -1e6 };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const box = canvas.getBoundingClientRect();
      width = box.width;
      height = box.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      context.fillStyle = ink;

      const drift = reduce ? 0 : time / 3000;
      const columns = Math.ceil(width / cell);
      const rows = Math.ceil(height / cell);

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const x = column * cell;
          const y = row * cell;

          // Base field: a soft diagonal gradient with a slow sine drift, so the
          // panel is darkest at one corner and the grain has somewhere to go.
          const across = (x / Math.max(width, 1) + y / Math.max(height, 1)) / 2;
          let intensity = 0.55 - across * 0.5 + Math.sin(across * 6 + drift) * 0.08;

          if (warpRadius > 0) {
            const dx = x - pointer.x;
            const dy = y - pointer.y;
            const distance = Math.hypot(dx, dy);
            if (distance < warpRadius) {
              // Squared falloff: a linear one leaves a visible disc edge.
              const falloff = 1 - distance / warpRadius;
              intensity += falloff * falloff * 0.55;
            }
          }

          // The threshold comparison *is* the dither: a cell is either on or
          // off, and the matrix decides which, so the average over a 4×4 block
          // approximates the continuous intensity.
          const threshold = BAYER[row % 4]?.[column % 4] ?? 0.5;
          if (intensity > threshold) {
            context.fillRect(x, y, cell - 1, cell - 1);
          }
        }
      }
    };

    const loop = (time: number) => {
      draw(time);
      frame = requestAnimationFrame(loop);
    };

    const onPointerMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
    };
    const onPointerLeave = () => {
      pointer.x = -1e6;
      pointer.y = -1e6;
    };

    resize();
    const observer = new ResizeObserver(() => {
      resize();
      if (reduce) draw(0);
    });
    observer.observe(canvas);

    if (reduce) {
      draw(0);
    } else {
      frame = requestAnimationFrame(loop);
      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [cell, color, warpRadius]);

  return <canvas ref={ref} aria-hidden className={cn("block size-full", className)} />;
}
