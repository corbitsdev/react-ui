/**
 * 4×4 Bayer thresholds, 0–1: the brand's ordered dither. A pure function of
 * position, so the grain stays locked to its surface while the field under it
 * moves. `DitherCanvas` keeps its own private copy of the same matrix.
 */
export const BAYER_4: readonly (readonly number[])[] = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((value) => (value + 0.5) / 16));

/** Alpha steps a cell fades through, so cells ease in and out instead of blinking. */
export const DITHER_GRAIN_STEPS = 6;

/** How long the reveal's edge takes to cross the field. */
export const DITHER_REVEAL_MS = 700;

/** Width of the reveal's edge, as a share of the diagonal. Cells inside it
 * clear in Bayer order, so the edge itself is grain. */
const REVEAL_EDGE = 0.16;

/** How long the ambient band takes to give way once the reveal starts. */
const AMBIENT_FADE_MS = 300;

export type DitherFieldInput = {
  readonly cols: number;
  readonly rows: number;
  /** Offsets the field and band, so neighbouring fields never move in step. */
  readonly seed: number;
  /** The page clock, in ms. */
  readonly timeMs: number;
  /** When the reveal starts on the same clock; `null` while still forming. */
  readonly revealStartMs: number | null;
};

/**
 * One frame, as flat `[x, y, x, y, …]` cell coordinates. `ink[step]` and
 * `band[step]` hold the lit cells at each alpha step (0 faintest) in the
 * field colour and the band colour; `cleared` holds the cells the reveal has
 * passed, which show what is underneath.
 */
export type DitherFieldFrame = {
  readonly ink: number[][];
  readonly band: number[][];
  readonly cleared: number[];
  /** The reveal has crossed the whole field: every cell is cleared. */
  done: boolean;
};

export function createDitherFieldFrame(): DitherFieldFrame {
  return {
    ink: Array.from({ length: DITHER_GRAIN_STEPS }, (): number[] => []),
    band: Array.from({ length: DITHER_GRAIN_STEPS }, (): number[] => []),
    cleared: [],
    done: false,
  };
}

function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * The forming grain: a slow interference field and a band sweeping corner to
 * corner, each cell lit by comparing the field against its Bayer threshold.
 * With a reveal, the band makes one last pass as the reveal's edge: behind it
 * cells clear (in Bayer order, so the boundary is grain too), ahead of it the
 * grain thickens.
 *
 * Writes into `out` (cleared first) and returns it, so a draw loop can reuse
 * one frame's arrays instead of allocating a fresh set sixty times a second.
 */
export function ditherFieldFrame(
  input: DitherFieldInput,
  out: DitherFieldFrame = createDitherFieldFrame(),
): DitherFieldFrame {
  const { cols, rows, seed, timeMs, revealStartMs } = input;
  for (const cells of out.ink) cells.length = 0;
  for (const cells of out.band) cells.length = 0;
  out.cleared.length = 0;

  const t = timeMs / 1000;
  const phase = (seed * 0.37) % 1;
  const ambient = ((t / 5.5 + phase) % 1) * 1.6 - 0.3;
  const progress =
    revealStartMs === null
      ? 0
      : clamp01((timeMs - revealStartMs) / DITHER_REVEAL_MS);
  // The edge travels from just off one corner to just past the other.
  const front =
    revealStartMs === null || timeMs < revealStartMs
      ? null
      : easeInOutCubic(progress) * (1 + 2 * REVEAL_EDGE) - REVEAL_EDGE;
  const ambientWeight =
    revealStartMs === null
      ? 1
      : 1 - clamp01((timeMs - revealStartMs) / AMBIENT_FADE_MS);

  // The diagonal waves split into per-column and per-row terms
  // (sin(a + b) = sin a cos b + cos a sin b), so a cell costs a few
  // multiplies rather than three trig calls.
  const colWave = new Float32Array(cols);
  const colSin = new Float32Array(cols);
  const colCos = new Float32Array(cols);
  for (let x = 0; x < cols; x += 1) {
    const u = x / cols;
    colWave[x] = Math.sin(u * 7.1 + t * 0.55 + seed);
    colSin[x] = Math.sin(u * 11 - t * 0.9 + seed * 2);
    colCos[x] = Math.cos(u * 11 - t * 0.9 + seed * 2);
  }
  const rowWave = new Float32Array(rows);
  const rowSin = new Float32Array(rows);
  const rowCos = new Float32Array(rows);
  for (let y = 0; y < rows; y += 1) {
    const v = y / rows;
    rowWave[y] = Math.cos(v * 5.3 - t * 0.4);
    rowSin[y] = Math.sin(v * 11);
    rowCos[y] = Math.cos(v * 11);
  }

  let remaining = 0;
  for (let y = 0; y < rows; y += 1) {
    const thresholds = BAYER_4[y % 4];
    for (let x = 0; x < cols; x += 1) {
      const threshold = thresholds?.[x % 4] ?? 0.5;
      const diagonal = (x / cols + y / rows) / 2;
      let band = 0;
      let charge = 0;
      if (front !== null) {
        if ((front - diagonal) / REVEAL_EDGE > threshold) {
          out.cleared.push(x, y);
          continue;
        }
        // Just ahead of the edge the band rides it and the grain thickens.
        const ahead = diagonal - front;
        band = Math.exp(-(ahead * ahead) / 0.004);
        charge = 0.35 * Math.exp(-(ahead * ahead) / 0.03);
      }
      remaining += 1;
      const drift = diagonal - ambient;
      band = Math.max(band, ambientWeight * Math.exp(-(drift * drift) / 0.01));
      const field =
        0.3 +
        charge +
        0.22 * (colWave[x] ?? 0) * (rowWave[y] ?? 0) +
        0.12 *
          ((colSin[x] ?? 0) * (rowCos[y] ?? 0) +
            (colCos[x] ?? 0) * (rowSin[y] ?? 0));
      const level = (field + band * 0.5 - threshold) / 0.14 + 0.5;
      if (level <= 0) continue;
      const step = Math.min(
        DITHER_GRAIN_STEPS - 1,
        Math.floor(level * DITHER_GRAIN_STEPS),
      );
      (band > 0.3 ? out.band : out.ink)[step]?.push(x, y);
    }
  }
  out.done = front !== null && progress >= 1 && remaining === 0;
  return out;
}
