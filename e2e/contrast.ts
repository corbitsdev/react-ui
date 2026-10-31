// WCAG contrast for text that axe leaves "incomplete": the stories sweep reads
// an element's resolved colours in the browser and judges them here, so the
// maths runs (and is tested) outside the page.

/** sRGB channels 0-255 and alpha 0-1. */
export type RGBA = readonly [number, number, number, number];

/**
 * One thing an ancestor paints under or applies to the text: its background
 * colour; its `opacity`, which fades everything inside it (the text and every
 * background between) as one group; or paint no colour stands for (an image,
 * a gradient, a backdrop filter), which only matters where it shows through.
 * A background or unresolved paint names its `box`: how many ancestors out
 * from the text element (0) the element painting it is. It lies under a point
 * only where that box does, so text spilling past a card is not measured
 * against the card. Without a `box` it lies under every point. Opacity fades
 * the whole group, overflow included, so it has none.
 */
export type ContrastLayer =
  | { readonly kind: "background"; readonly color: RGBA; readonly box?: number }
  | { readonly kind: "opacity"; readonly value: number }
  | { readonly kind: "unresolved"; readonly box?: number };

/**
 * One element the browser hit-tests at a point on the text, top first: the
 * text element itself, one of its ancestors (whose paint is in the layers),
 * or any other element. Its paint there is nothing, a solid surface (an
 * opaque background nothing fades), or something else (an image, a
 * translucent wash, glyphs, a border, a painting pseudo-element).
 */
export type PaintEntry = {
  readonly role: "text" | "ancestor" | "other";
  readonly paint: "none" | "solid" | "some";
  /**
   * For the text element or an ancestor whose own box is under the point:
   * its `box` in the layers. Absent, the element is hit without its box
   * holding the point (text overflowing its own box), and it paints nothing
   * there. Only an entry with a box can be "solid".
   */
  readonly box?: number;
};

/** What one hit-tested point says about the text there. */
export type PointReading = "clear" | "hidden" | "unresolved";

/**
 * Whether the text at one point shows over its own layers alone ("clear"),
 * is not painted there at all ("hidden": covered by a solid surface, or
 * clipped so the text is not hit), or shares the point with paint the layers
 * do not hold ("unresolved").
 */
export function readPoint(stack: readonly PaintEntry[]): PointReading {
  const text = stack.findIndex((entry) => entry.role === "text");
  if (text === -1) return "hidden";
  const above = stack.slice(0, text);
  // A solid surface over the text hides it, whatever else paints above.
  if (above.some((entry) => entry.role === "other" && entry.paint === "solid"))
    return "hidden";
  if (above.some((entry) => entry.role !== "other" || entry.paint !== "none"))
    return "unresolved";
  for (const entry of stack.slice(text)) {
    // A solid ground in the text's own layers hides everything under it.
    if (
      entry.role !== "other" &&
      entry.paint === "solid" &&
      entry.box !== undefined
    )
      return "clear";
    if (entry.role === "other" && entry.paint !== "none") return "unresolved";
  }
  return "clear";
}

/**
 * The element's own background where `background-clip: text` paints it
 * inside the glyphs: its colour and, under the text colour, its gradient's
 * colour stops in order.
 */
export type ClippedBackground = {
  readonly color: RGBA;
  readonly stops: readonly RGBA[];
};

/** What the browser reports for one text element. */
export type ContrastSample = {
  /** The computed `color`. */
  readonly text: RGBA;
  /**
   * The computed `-webkit-text-fill-color`, which paints the glyphs: it
   * computes to `color` unless set, and set transparent it lets a clipped
   * background show as the glyphs' colour.
   */
  readonly fill?: RGBA;
  /** `-webkit-text-stroke`, which paints an outline over the glyphs. */
  readonly stroke?: { readonly width: number; readonly color: RGBA };
  readonly clip?: ClippedBackground;
  /**
   * For a field whose own glyphs are transparent: elements draw glyphs
   * under it (a mirror painting the words), and each is judged in its own
   * right, by axe or by the fallback sampling the ones axe skips.
   */
  readonly mirrored?: boolean;
  /** The element's and every ancestor's layers, from the element out to the root. */
  readonly layers: readonly ContrastLayer[];
  /** The hit-test stack at each point sampled across the text. */
  readonly points: readonly (readonly PaintEntry[])[];
  readonly fontSizePx: number;
  readonly fontWeight: number;
};

export type ContrastVerdict =
  | {
      readonly kind: "measured";
      readonly ratio: number;
      readonly floor: number;
      readonly pass: boolean;
    }
  | { readonly kind: "mirrored" }
  | { readonly kind: "unmeasured" };

/** `top` painted over `bottom` (source-over). */
export function over(top: RGBA, bottom: RGBA): RGBA {
  const alpha = top[3] + bottom[3] * (1 - top[3]);
  if (alpha === 0) return [0, 0, 0, 0];
  const channel = (index: 0 | 1 | 2) =>
    (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha;
  return [channel(0), channel(1), channel(2), alpha];
}

/** `from` blended toward `to` by `t`, premultiplied, as a CSS gradient does in sRGB. */
function mix(from: RGBA, to: RGBA, t: number): RGBA {
  const alpha = from[3] * (1 - t) + to[3] * t;
  if (alpha === 0) return [0, 0, 0, 0];
  const channel = (index: 0 | 1 | 2) =>
    (from[index] * from[3] * (1 - t) + to[index] * to[3] * t) / alpha;
  return [channel(0), channel(1), channel(2), alpha];
}

/**
 * Every colour a gradient through `stops` passes, sampled `steps` times
 * between each pair: the darkest or lightest can fall between two stops.
 */
export function gradientColors(
  stops: readonly RGBA[],
  steps = 8,
): readonly RGBA[] {
  const [first, ...rest] = stops;
  if (first === undefined) return [];
  const colors: RGBA[] = [first];
  let from = first;
  for (const to of rest) {
    for (let step = 1; step <= steps; step++)
      colors.push(mix(from, to, step / steps));
    from = to;
  }
  return colors;
}

/** `color` with its alpha scaled, as an ancestor's `opacity` does. */
function fade(color: RGBA, opacity: number): RGBA {
  return [color[0], color[1], color[2], color[3] * opacity];
}

// Alpha that compositing left a rounding error short of 1 is opaque.
function opaque(color: RGBA): boolean {
  return color[3] > 1 - 1e-9;
}

/**
 * The text pixel and the background pixel beside it, painted through every
 * layer from the element out to the root. `null` when unresolved paint shows
 * through, or when the background is still not opaque at the root.
 */
export function flatten(
  text: RGBA,
  layers: readonly ContrastLayer[],
): { readonly text: RGBA; readonly background: RGBA } | null {
  let ink = text;
  let ground: RGBA = [0, 0, 0, 0];
  for (const layer of layers) {
    switch (layer.kind) {
      case "background":
        ink = over(ink, layer.color);
        ground = over(ground, layer.color);
        break;
      case "opacity":
        ink = fade(ink, layer.value);
        ground = fade(ground, layer.value);
        break;
      case "unresolved":
        if (!opaque(ground)) return null;
        break;
    }
  }
  // The text pixel is at least as opaque as the ground under it.
  return opaque(ground) ? { text: ink, background: ground } : null;
}

function luminance([r, g, b]: RGBA): number {
  const linear = (value: number) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio of two opaque colours. */
export function contrastRatio(a: RGBA, b: RGBA): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

/** 3:1 for large text (24px, or 18.66px bold), 4.5:1 for the rest, as axe does. */
export function contrastFloor(fontSizePx: number, fontWeight: number): number {
  const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeight >= 700);
  return large ? 3 : 4.5;
}

/**
 * Every colour the glyphs can paint: the text colour, over the background
 * the glyphs clip when there is one.
 */
export function inks(sample: ContrastSample): readonly RGBA[] {
  const glyph = sample.fill ?? sample.text;
  if (sample.clip === undefined) return [glyph];
  const { color, stops } = sample.clip;
  const fills =
    stops.length > 0 ? gradientColors(stops) : [[0, 0, 0, 0] as const];
  return fills.map((fill) => over(glyph, over(fill, color)));
}

/** The layers under one clear point: those whose box holds the point. */
export function layersAt(
  layers: readonly ContrastLayer[],
  stack: readonly PaintEntry[],
): readonly ContrastLayer[] {
  const boxes = new Set(stack.flatMap((entry) => entry.box ?? []));
  return layers.filter(
    (layer) =>
      layer.kind === "opacity" ||
      layer.box === undefined ||
      boxes.has(layer.box),
  );
}

/**
 * Text is unmeasured when paint the layers do not hold shares a point with
 * it, or when a stroke outlines its glyphs. Fully transparent ink paints
 * nothing: its words are "mirrored" when the elements drawing them (an
 * overlay mirroring a textarea, say) are judged in their own right, and
 * unmeasured otherwise. Each clear point is measured on the layers under it,
 * and the text is held to its worst point and, for clipped gradient text,
 * its worst colour. Text hidden at every point is measured on all its
 * layers, as it shows once scrolled or uncovered.
 */
export function judgeContrast(sample: ContrastSample | null): ContrastVerdict {
  if (sample === null) return { kind: "unmeasured" };
  if (
    sample.stroke !== undefined &&
    sample.stroke.width > 0 &&
    sample.stroke.color[3] > 0
  )
    return { kind: "unmeasured" };
  const colors = inks(sample);
  if (colors.every((ink) => ink[3] === 0))
    return sample.mirrored === true
      ? { kind: "mirrored" }
      : { kind: "unmeasured" };
  const readings = sample.points.map(readPoint);
  if (readings.includes("unresolved")) return { kind: "unmeasured" };
  const clear = sample.points.filter((_, index) => readings[index] === "clear");
  const grounds =
    clear.length > 0
      ? clear.map((stack) => layersAt(sample.layers, stack))
      : [sample.layers];
  let ratio = Infinity;
  for (const layers of grounds)
    for (const ink of colors) {
      const painted = flatten(ink, layers);
      if (painted === null) return { kind: "unmeasured" };
      ratio = Math.min(ratio, contrastRatio(painted.text, painted.background));
    }
  const floor = contrastFloor(sample.fontSizePx, sample.fontWeight);
  return { kind: "measured", ratio, floor, pass: ratio >= floor };
}
