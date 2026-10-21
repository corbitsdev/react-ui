import { describe, expect, test } from "bun:test";

import {
  BAYER_4,
  DITHER_REVEAL_MS,
  createDitherFieldFrame,
  ditherFieldFrame,
  type DitherFieldFrame,
} from "./dither-field.js";

const SIZE = 32;
const START = 10_000;

function frameAt(timeMs: number, revealStartMs: number | null) {
  return ditherFieldFrame({
    cols: SIZE,
    rows: SIZE,
    seed: 7,
    timeMs,
    revealStartMs,
  });
}

function clearedSet(frame: DitherFieldFrame): Set<string> {
  const cells = new Set<string>();
  for (let at = 0; at < frame.cleared.length; at += 2) {
    cells.add(`${frame.cleared[at]},${frame.cleared[at + 1]}`);
  }
  return cells;
}

function threshold(x: number, y: number): number {
  const value = BAYER_4[y % 4]?.[x % 4];
  if (value === undefined) throw new Error("outside the matrix");
  return value;
}

describe("ditherFieldFrame", () => {
  test("before the reveal no cell is cleared", () => {
    const forming = frameAt(START, null);
    expect(forming.cleared).toEqual([]);
    expect(forming.done).toBe(false);
    expect(forming.ink.some((cells) => cells.length > 0)).toBe(true);

    const scheduled = frameAt(START - 1, START);
    expect(scheduled.cleared).toEqual([]);
    expect(scheduled.done).toBe(false);
  });

  test("at the end every cell is cleared and nothing is lit", () => {
    const frame = frameAt(START + DITHER_REVEAL_MS, START);
    expect(clearedSet(frame).size).toBe(SIZE * SIZE);
    expect(frame.ink.every((cells) => cells.length === 0)).toBe(true);
    expect(frame.band.every((cells) => cells.length === 0)).toBe(true);
    expect(frame.done).toBe(true);
  });

  test("inside the edge, cells clear in Bayer order", () => {
    let partialDiagonals = 0;
    for (let elapsed = 50; elapsed < DITHER_REVEAL_MS; elapsed += 50) {
      const cleared = clearedSet(frameAt(START + elapsed, START));
      // With a square grid, cells on one anti-diagonal sit at the same
      // distance from the edge, so only their thresholds decide.
      for (let sum = 0; sum <= 2 * (SIZE - 1); sum += 1) {
        let highestCleared = -1;
        let lowestKept = 2;
        for (
          let x = Math.max(0, sum - SIZE + 1);
          x <= Math.min(sum, SIZE - 1);
          x += 1
        ) {
          const y = sum - x;
          const value = threshold(x, y);
          if (cleared.has(`${x},${y}`)) {
            highestCleared = Math.max(highestCleared, value);
          } else {
            lowestKept = Math.min(lowestKept, value);
          }
        }
        expect(highestCleared).toBeLessThan(lowestKept);
        if (highestCleared >= 0 && lowestKept <= 1) partialDiagonals += 1;
      }
    }
    // The edge really is dithered: some diagonals are part cleared.
    expect(partialDiagonals).toBeGreaterThan(0);
  });

  test("the reveal only ever clears more", () => {
    let previous = new Set<string>();
    for (let elapsed = 0; elapsed <= DITHER_REVEAL_MS; elapsed += 35) {
      const cleared = clearedSet(frameAt(START + elapsed, START));
      for (const cell of previous) expect(cleared.has(cell)).toBe(true);
      previous = cleared;
    }
  });

  test("a reused frame is emptied before it is filled", () => {
    const out = createDitherFieldFrame();
    ditherFieldFrame(
      {
        cols: SIZE,
        rows: SIZE,
        seed: 1,
        timeMs: START + 400,
        revealStartMs: START,
      },
      out,
    );
    expect(out.cleared.length).toBeGreaterThan(0);
    ditherFieldFrame(
      { cols: SIZE, rows: SIZE, seed: 1, timeMs: START, revealStartMs: null },
      out,
    );
    expect(out.cleared).toEqual([]);
    expect(out.done).toBe(false);
  });
});
