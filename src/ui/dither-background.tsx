import { useEffect, useRef } from "react";

import { cn } from "../lib/utils.js";

/**
 * 8×8 Bayer matrix. Twice the resolution of `DitherCanvas`'s 4×4: a
 * photographic source needs a finer threshold grid than a generated field to
 * avoid banding across broad tonal regions.
 */
// prettier-ignore
const BAYER = [
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];
const BAYER_DIM = 8;
const BAYER_DIVISOR = BAYER_DIM * BAYER_DIM;
const FRAME_MS = 1000 / 30;
const MOUSE_FALLOFF = 18;
const MOUSE_LERP = 0.1;
const STRENGTH_LERP = 0.08;

export type DitherBackgroundProps = {
  /** URL of the source image to dither. */
  readonly src: string;
  /** Edge of one dither cell, in device pixels once upscaled. */
  readonly cell?: number;
  /** Quantization levels per channel. */
  readonly levels?: number;
  /**
   * Ambient sine-warp amplitude, in source pixels. `0` or `false` disables
   * the warp (and the cursor displacement with it) entirely, leaving a
   * static dithered image.
   */
  readonly warp?: number | false;
  readonly className?: string;
};

/**
 * An image-sourced sibling of `DitherCanvas`: instead of a generated field,
 * a source image is drawn to an offscreen buffer, ordered-dithered with an
 * 8×8 Bayer matrix, and redrawn each frame with a slow ambient sine warp plus
 * a cursor-driven displacement.
 *
 * The `requestAnimationFrame` callback still fires at the display's native
 * rate; only the paint work inside it is gated to ~30fps by timestamp delta,
 * so a 120Hz display doesn't triple the redraw cost for no visual gain. The
 * loop is paused while the canvas is offscreen (`IntersectionObserver`) or
 * the tab is hidden (`visibilitychange`), and
 * reacts live to `prefers-reduced-motion` — a `MediaQueryList` `change`
 * listener, not a value read once at mount — by dropping to a single static
 * frame with the warp disabled.
 *
 * `aria-hidden`, unconditionally: it is decorative, and anything a reader
 * needs is in the content laid over it.
 */
export function DitherBackground({ src, cell = 4, levels = 4, warp = 1.6, className }: DitherBackgroundProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (canvas === null) return;
    const context = canvas.getContext("2d");
    if (context === null) return;

    const working = document.createElement("canvas");
    const workingContext = working.getContext("2d");
    if (workingContext === null) return;

    let disposed = false;
    let width = 1;
    let height = 1;
    let sourcePixels: Uint8ClampedArray | null = null;
    let dest: ImageData | null = null;
    let imageLoaded = false;
    let sinU = new Float32Array(1);
    let sinU2 = new Float32Array(1);
    let sinV = new Float32Array(1);
    let sinV2 = new Float32Array(1);

    const image = new Image();

    const resample = () => {
      if (!imageLoaded) return;
      working.width = width;
      working.height = height;
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const canvasRatio = width / height;
      let drawWidth = width;
      let drawHeight = height;
      if (canvasRatio > imageRatio) {
        drawHeight = width / imageRatio;
      } else {
        drawWidth = height * imageRatio;
      }
      workingContext.clearRect(0, 0, width, height);
      workingContext.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
      sourcePixels = workingContext.getImageData(0, 0, width, height).data;
      dest = context.createImageData(width, height);
    };

    const resize = () => {
      width = Math.max(1, Math.round(canvas.clientWidth / cell));
      height = Math.max(1, Math.round(canvas.clientHeight / cell));
      canvas.width = width;
      canvas.height = height;
      sinU = new Float32Array(width);
      sinU2 = new Float32Array(width);
      sinV = new Float32Array(height);
      sinV2 = new Float32Array(height);
      resample();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    let mouseX = 0.5;
    let mouseY = 0.5;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;
    let mouseStrength = 0;
    let targetStrength = 0;
    const onPointerMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      targetMouseX = (event.clientX - box.left) / box.width;
      targetMouseY = (event.clientY - box.top) / box.height;
      const inside = targetMouseX > -0.1 && targetMouseX < 1.1 && targetMouseY > -0.1 && targetMouseY < 1.1;
      targetStrength = inside ? 1 : 0;
    };
    // Disabled warp means the cursor displacement it drives is unused too —
    // skip the listener rather than paying a getBoundingClientRect per event
    // for a feature that's off.
    if (warp !== false) window.addEventListener("pointermove", onPointerMove, { passive: true });

    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduce = reduceQuery.matches;

    const render = (time: number) => {
      if (sourcePixels === null || dest === null) return;
      const data = dest.data;
      const aspect = width / height;
      const amplitude = reduce || warp === false ? 0 : warp;
      for (let x = 0; x < width; x += 1) {
        const u = x / width;
        sinU[x] = Math.sin(u * 6.2 + time * 0.6);
        sinU2[x] = Math.sin(u * 9.1 + time * 0.27);
      }
      for (let y = 0; y < height; y += 1) {
        const v = y / height;
        sinV[y] = Math.sin(v * 5.3 - time * 0.5);
        sinV2[y] = Math.sin(v * 8.4 + time * 0.4);
      }
      const useMouse = amplitude > 0 && mouseStrength > 0.01;
      for (let y = 0; y < height; y += 1) {
        const v = y / height;
        const rowBayer = (y % BAYER_DIM) * BAYER_DIM;
        const svy = sinV[y] ?? 0;
        const sv2y = sinV2[y] ?? 0;
        for (let x = 0; x < width; x += 1) {
          let warpX = ((sinU[x] ?? 0) + sv2y) * amplitude;
          let warpY = (svy + (sinU2[x] ?? 0)) * amplitude;
          if (useMouse) {
            const dx = x / width - mouseX;
            const dy = v - mouseY;
            const distance = Math.sqrt(dx * dx * aspect * aspect + dy * dy);
            const influence = Math.exp(-distance * distance * MOUSE_FALLOFF) * mouseStrength;
            const inverse = 1 / (distance + 1e-4);
            warpX += dx * inverse * influence * amplitude * 3;
            warpY += dy * inverse * influence * amplitude * 3;
          }
          let sourceX = x + Math.round(warpX);
          let sourceY = y + Math.round(warpY);
          if (sourceX < 0) sourceX = 0;
          else if (sourceX >= width) sourceX = width - 1;
          if (sourceY < 0) sourceY = 0;
          else if (sourceY >= height) sourceY = height - 1;
          const sourceIndex = (sourceY * width + sourceX) * 4;
          const destIndex = (y * width + x) * 4;
          const threshold = ((BAYER[rowBayer + (x % BAYER_DIM)] ?? 0) + 0.5) / BAYER_DIVISOR;
          for (let channel = 0; channel < 3; channel += 1) {
            const quantized = Math.floor(((sourcePixels[sourceIndex + channel] ?? 0) / 255) * (levels - 1) + threshold);
            data[destIndex + channel] = (quantized / (levels - 1)) * 255;
          }
          data[destIndex + 3] = 255;
        }
      }
      context.putImageData(dest, 0, 0);
    };

    let visible = true;
    const running = () => !disposed && !reduce && visible && !document.hidden;

    let frame = 0;
    let lastDraw = 0;
    const start = performance.now();
    const loop = (now: number) => {
      frame = 0;
      if (!running()) return;
      if (now - lastDraw >= FRAME_MS) {
        lastDraw = now;
        mouseX += (targetMouseX - mouseX) * MOUSE_LERP;
        mouseY += (targetMouseY - mouseY) * MOUSE_LERP;
        mouseStrength += (targetStrength - mouseStrength) * STRENGTH_LERP;
        render((now - start) / 1000);
      }
      schedule();
    };
    const schedule = () => {
      if (frame !== 0 || !running()) return;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (frame === 0) return;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) schedule();
        else stop();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else schedule();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const onReduceChange = () => {
      reduce = reduceQuery.matches;
      if (reduce) {
        stop();
        render(0);
      } else {
        schedule();
      }
    };
    reduceQuery.addEventListener("change", onReduceChange);

    image.onload = () => {
      if (disposed) return;
      imageLoaded = true;
      resample();
      render(0);
      schedule();
    };
    image.src = src;

    return () => {
      disposed = true;
      stop();
      image.onload = null;
      image.src = "";
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reduceQuery.removeEventListener("change", onReduceChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (warp !== false) window.removeEventListener("pointermove", onPointerMove);
    };
  }, [src, cell, levels, warp]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("block size-full", className)}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
