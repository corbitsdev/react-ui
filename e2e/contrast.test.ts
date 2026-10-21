import { describe, expect, test } from "bun:test";

import {
  contrastFloor,
  contrastRatio,
  flatten,
  gradientColors,
  inks,
  judgeContrast,
  layersAt,
  over,
  readPoint,
  type ContrastLayer,
  type PaintEntry,
  type RGBA,
} from "./contrast.js";

const WHITE: RGBA = [255, 255, 255, 1];
const BLACK: RGBA = [0, 0, 0, 1];

function background(color: RGBA): ContrastLayer {
  return { kind: "background", color };
}

const TEXT: PaintEntry = { role: "text", paint: "none", box: 0 };
const ANCESTOR: PaintEntry = { role: "ancestor", paint: "none", box: 1 };
const GROUND: PaintEntry = { role: "ancestor", paint: "solid", box: 2 };
const EMPTY: PaintEntry = { role: "other", paint: "none" };
const COVER: PaintEntry = { role: "other", paint: "solid" };
const PAINT: PaintEntry = { role: "other", paint: "some" };

describe("contrast", () => {
  test("black on white is 21:1, and order does not matter", () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 5);
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 5);
  });

  test("a translucent layer blends into what is under it", () => {
    expect(over([0, 0, 0, 0.5], WHITE)).toEqual([127.5, 127.5, 127.5, 1]);
    expect(over([0, 0, 0, 0], WHITE)).toEqual(WHITE);
    expect(over([0, 0, 0, 0], [0, 0, 0, 0])).toEqual([0, 0, 0, 0]);
  });

  test("layers flatten from the opaque bottom up", () => {
    // 12% orange over white, as the attention wash sits on the light ground.
    const wash: RGBA = [233, 132, 40, 0.12];
    const painted = flatten(BLACK, [background(wash), background(WHITE)]);
    const [r, g, b, a] = painted?.background ?? [0, 0, 0, 0];
    expect(a).toBeCloseTo(1, 9);
    expect(r).toBeCloseTo(252.36, 2);
    expect(g).toBeCloseTo(240.24, 2);
    expect(b).toBeCloseTo(229.2, 2);
    expect(painted?.text).toEqual(BLACK);
    expect(flatten(BLACK, [background(wash)])).toBeNull();
    expect(flatten(BLACK, [])).toBeNull();
  });

  test("an ancestor's opacity above the opaque ground fades text and ground", () => {
    // Black on a white card at 50% over a black page: grey on black.
    const painted = flatten(BLACK, [
      background(WHITE),
      { kind: "opacity", value: 0.5 },
      background(BLACK),
    ]);
    expect(painted?.text).toEqual([0, 0, 0, 1]);
    expect(painted?.background).toEqual([127.5, 127.5, 127.5, 1]);
    const verdict = judgeContrast({
      text: BLACK,
      layers: [
        background(WHITE),
        { kind: "opacity", value: 0.3 },
        background(BLACK),
      ],
      points: [],
      fontSizePx: 14,
      fontWeight: 400,
    });
    expect(verdict).toMatchObject({ kind: "measured", pass: false });
    // The same ancestor at full opacity passes.
    expect(
      judgeContrast({
        text: BLACK,
        layers: [background(WHITE), background(BLACK)],
        points: [],
        fontSizePx: 14,
        fontWeight: 400,
      }),
    ).toMatchObject({ kind: "measured", pass: true });
  });

  test("unresolved paint only matters where it shows through", () => {
    const hidden = flatten(BLACK, [
      background(WHITE),
      { kind: "unresolved" },
      background(BLACK),
    ]);
    expect(hidden?.background).toEqual(WHITE);
    expect(
      flatten(BLACK, [
        background([255, 255, 255, 0.5]),
        { kind: "unresolved" },
        background(WHITE),
      ]),
    ).toBeNull();
    // Faded, the opaque ground lets an image behind it show through.
    expect(
      flatten(BLACK, [
        background(WHITE),
        { kind: "opacity", value: 0.5 },
        { kind: "unresolved" },
        background(WHITE),
      ]),
    ).toBeNull();
  });

  test("large text gets the 3:1 floor", () => {
    expect(contrastFloor(16, 400)).toBe(4.5);
    expect(contrastFloor(24, 400)).toBe(3);
    expect(contrastFloor(19, 700)).toBe(3);
    expect(contrastFloor(19, 600)).toBe(4.5);
  });

  test("judges text on a translucent background", () => {
    const wash: RGBA = [233, 132, 40, 0.12];
    const ink: RGBA = [43, 38, 39, 1];
    const verdict = judgeContrast({
      text: ink,
      layers: [background(wash), background(WHITE)],
      points: [],
      fontSizePx: 14,
      fontWeight: 400,
    });
    expect(verdict.kind).toBe("measured");
    if (verdict.kind === "measured") {
      expect(verdict.pass).toBe(true);
      expect(verdict.ratio).toBeGreaterThan(12);
    }
  });

  test("translucent text is composited before it is measured", () => {
    const verdict = judgeContrast({
      text: [0, 0, 0, 0.2],
      layers: [background(WHITE)],
      points: [],
      fontSizePx: 14,
      fontWeight: 400,
    });
    expect(verdict).toMatchObject({ kind: "measured", pass: false });
  });

  test("no opaque ground, no sample or invisible text is unmeasured", () => {
    expect(
      judgeContrast({
        text: BLACK,
        layers: [background([255, 255, 255, 0.5])],
        points: [],
        fontSizePx: 14,
        fontWeight: 400,
      }),
    ).toEqual({ kind: "unmeasured" });
    expect(judgeContrast(null)).toEqual({ kind: "unmeasured" });
    expect(
      judgeContrast({
        text: [0, 0, 0, 0],
        layers: [background(WHITE)],
        points: [],
        fontSizePx: 14,
        fontWeight: 400,
      }),
    ).toEqual({ kind: "unmeasured" });
  });

  test("a point reads clear when only empty boxes overlap the text", () => {
    // A transparent stretched button over a tile's label.
    expect(readPoint([EMPTY, TEXT, ANCESTOR, GROUND])).toBe("clear");
    expect(readPoint([TEXT, ANCESTOR])).toBe("clear");
  });

  test("a solid surface over the text hides that point", () => {
    // A later tile in a stack covers an earlier tile's label.
    expect(readPoint([EMPTY, COVER, PAINT, TEXT, GROUND])).toBe("hidden");
    // The covering tile's own label paints on the tile, not on the text.
    expect(readPoint([PAINT, EMPTY, COVER, TEXT, GROUND])).toBe("hidden");
    // Clipped by an overflow ancestor: the text is not hit at all.
    expect(readPoint([GROUND])).toBe("hidden");
    expect(readPoint([])).toBe("hidden");
  });

  test("paint over the text, or under it above its ground, is unresolved", () => {
    expect(readPoint([PAINT, TEXT, GROUND])).toBe("unresolved");
    // An ancestor above its own text paints through a pseudo-element.
    expect(readPoint([ANCESTOR, TEXT, GROUND])).toBe("unresolved");
    // An image beside the text's own wrappers but above the card it sits on.
    expect(readPoint([TEXT, ANCESTOR, PAINT, GROUND])).toBe("unresolved");
    expect(readPoint([TEXT, ANCESTOR, COVER, GROUND])).toBe("unresolved");
  });

  test("anything under a solid ground in the text's layers is hidden by it", () => {
    expect(readPoint([TEXT, GROUND, PAINT])).toBe("clear");
    // The text's own opaque chip is its ground.
    expect(readPoint([{ role: "text", paint: "solid", box: 0 }, PAINT])).toBe(
      "clear",
    );
    // A solid ancestor hit without its box under the point grounds nothing.
    expect(readPoint([TEXT, { role: "ancestor", paint: "solid" }, PAINT])).toBe(
      "unresolved",
    );
  });

  test("an unresolved point leaves the text unmeasured", () => {
    const sample = {
      text: BLACK,
      layers: [background(WHITE)],
      fontSizePx: 14,
      fontWeight: 400,
    };
    expect(
      judgeContrast({
        ...sample,
        points: [
          [TEXT, GROUND],
          [PAINT, TEXT],
        ],
      }),
    ).toEqual({ kind: "unmeasured" });
    // Hidden everywhere, it is held to the layers it shows on once uncovered.
    expect(
      judgeContrast({ ...sample, points: [[COVER, TEXT], [GROUND]] }),
    ).toMatchObject({ kind: "measured", pass: true });
  });

  test("a gradient passes through every colour between its stops", () => {
    const colors = gradientColors([BLACK, WHITE], 4);
    expect(colors).toEqual([
      BLACK,
      [63.75, 63.75, 63.75, 1],
      [127.5, 127.5, 127.5, 1],
      [191.25, 191.25, 191.25, 1],
      WHITE,
    ]);
    // Premultiplied: fading to transparent keeps the colour, not grey.
    expect(gradientColors([WHITE, [0, 0, 0, 0]], 2)[1]).toEqual([
      255, 255, 255, 0.5,
    ]);
    expect(gradientColors([])).toEqual([]);
  });

  test("text clipping a gradient is held to its worst colour", () => {
    const grey: RGBA = [150, 150, 150, 1];
    const shimmer = (stops: readonly RGBA[]) =>
      judgeContrast({
        text: [0, 0, 0, 0],
        clip: { color: [0, 0, 0, 0], stops },
        layers: [background(WHITE)],
        points: [],
        fontSizePx: 14,
        fontWeight: 400,
      });
    expect(shimmer([BLACK, BLACK])).toMatchObject({
      kind: "measured",
      pass: true,
    });
    const verdict = shimmer([BLACK, grey, BLACK]);
    expect(verdict).toMatchObject({ kind: "measured", pass: false });
    if (verdict.kind === "measured")
      expect(verdict.ratio).toBeCloseTo(contrastRatio(grey, WHITE), 5);
    // Opaque text colour paints over the clipped gradient.
    expect(
      judgeContrast({
        text: BLACK,
        clip: { color: [0, 0, 0, 0], stops: [grey] },
        layers: [background(WHITE)],
        points: [],
        fontSizePx: 14,
        fontWeight: 400,
      }),
    ).toMatchObject({ kind: "measured", pass: true });
    expect(shimmer([[0, 0, 0, 0]])).toEqual({ kind: "unmeasured" });
  });

  test("transparent glyphs defer to a mirror that is judged itself", () => {
    const field = {
      text: [0, 0, 0, 0] as const,
      layers: [background(WHITE)],
      // The mirror's words sit under the field at every point.
      points: [[TEXT, PAINT, GROUND]],
      fontSizePx: 14,
      fontWeight: 400,
    };
    expect(judgeContrast({ ...field, mirrored: true })).toEqual({
      kind: "mirrored",
    });
    expect(judgeContrast({ ...field, mirrored: false })).toEqual({
      kind: "unmeasured",
    });
    // Visible ink is measured, mirror or not.
    expect(
      judgeContrast({ ...field, text: BLACK, points: [], mirrored: true }),
    ).toMatchObject({ kind: "measured" });
  });

  test("each point is measured on the boxes under it, worst point wins", () => {
    // #555 text on a white card (box 1) inside a black section (box 2); its
    // later lines spill past the card onto the section.
    const grey: RGBA = [85, 85, 85, 1];
    const section: ContrastLayer = { kind: "background", color: BLACK, box: 2 };
    const layers: ContrastLayer[] = [
      { kind: "background", color: WHITE, box: 1 },
      section,
      { kind: "background", color: WHITE, box: 3 },
    ];
    const onCard: PaintEntry[] = [
      TEXT,
      { role: "ancestor", paint: "solid", box: 1 },
      { role: "ancestor", paint: "solid", box: 2 },
    ];
    const offCard: PaintEntry[] = [
      TEXT,
      { role: "ancestor", paint: "solid", box: 2 },
    ];
    expect(layersAt(layers, offCard)).toEqual([section]);
    const sample = { text: grey, layers, fontSizePx: 14, fontWeight: 400 };
    expect(judgeContrast({ ...sample, points: [onCard] })).toMatchObject({
      kind: "measured",
      pass: true,
    });
    const spilled = judgeContrast({ ...sample, points: [onCard, offCard] });
    expect(spilled).toMatchObject({ kind: "measured", pass: false });
    if (spilled.kind === "measured")
      expect(spilled.ratio).toBeCloseTo(contrastRatio(grey, BLACK), 5);
    // Opacity fades the group wherever it paints, box or not.
    expect(
      layersAt([{ kind: "opacity", value: 0.5 }, ...layers], offCard)[0],
    ).toEqual({ kind: "opacity", value: 0.5 });
  });

  test("the glyphs paint in -webkit-text-fill-color, not color", () => {
    const base = {
      text: BLACK,
      layers: [background(WHITE)],
      points: [],
      fontSizePx: 14,
      fontWeight: 400,
    };
    // color:#000 with a transparent fill over a #ddd-#eee clipped gradient.
    const pale = judgeContrast({
      ...base,
      fill: [0, 0, 0, 0],
      clip: {
        color: [0, 0, 0, 0],
        stops: [
          [221, 221, 221, 1],
          [238, 238, 238, 1],
        ],
      },
    });
    expect(pale).toMatchObject({ kind: "measured", pass: false });
    if (pale.kind === "measured") expect(pale.ratio).toBeLessThan(1.5);
    // A set fill wins over color; unset, the fill computes to color.
    expect(inks({ ...base, fill: [200, 200, 200, 1] })).toEqual([
      [200, 200, 200, 1],
    ]);
    expect(inks(base)).toEqual([BLACK]);
    expect(judgeContrast({ ...base, fill: [0, 0, 0, 0], text: BLACK })).toEqual(
      { kind: "unmeasured" },
    );
  });

  test("a visible text stroke leaves the text unmeasured", () => {
    const base = {
      text: BLACK,
      layers: [background(WHITE)],
      points: [],
      fontSizePx: 14,
      fontWeight: 400,
    };
    expect(
      judgeContrast({ ...base, stroke: { width: 1, color: WHITE } }),
    ).toEqual({ kind: "unmeasured" });
    expect(
      judgeContrast({ ...base, stroke: { width: 0, color: WHITE } }),
    ).toMatchObject({ kind: "measured", pass: true });
    expect(
      judgeContrast({ ...base, stroke: { width: 2, color: [0, 0, 0, 0] } }),
    ).toMatchObject({ kind: "measured", pass: true });
  });
});
