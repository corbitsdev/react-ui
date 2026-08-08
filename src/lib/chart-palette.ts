/**
 * Series colour, assigned by position and never by value.
 *
 * The five `--chart-*` tokens are a *fixed order*, not a pool. Slot 1 is always
 * the first series in the data, slot 2 the second, and so on — so filtering a
 * series out never repaints the survivors. A chart whose colours move when the
 * legend changes destroys the one thing colour is doing here, which is identity.
 *
 * The ramp is blue, green, deep green, deep blue, red — and never orange.
 * Orange is the reserved action accent: it marks the one thing on a screen a
 * user can act on, so it must never paint a passive data series, where it would
 * read as a call to action that is not there. Each step holds ≥3:1 against both
 * the page and the card in both modes (the theme's contrast gate re-checks that
 * on every build). Colour-vision safety comes from the ordering: green- and
 * red-family slots never neighbour each other — under deuteranopia adjacent
 * green/red collapse into one hue — and adjacent same-family steps differ by
 * lightness, a channel colour-vision deficiency preserves. That separation is
 * legal **only** alongside a second, non-colour channel — which is why every
 * chart in this registry ships a legend, direct labels, a per-slot dash and a
 * data table rather than treating them as polish.
 */

/** How many distinct series the palette can carry. Past this, fold. */
export const CHART_SERIES_SLOTS = 5;

export type ChartSeriesSlot = {
  /** Stable slot key — a readable name for the token family, and a React key. */
  readonly key: string;
  /** CSS colour for strokes, fills, and legend swatches. */
  readonly color: string;
  /** SVG `stroke-dasharray` — the second channel. `undefined` means solid. */
  readonly dash: string | undefined;
};

/**
 * The ramp itself, in slot order, for callers that lay out a legend or paint a
 * stacked mosaic and need the whole sequence rather than one slot. Same rules
 * as `seriesColor`: fixed order, never cycled, orange never appears.
 */
export const CHART_SERIES: readonly ChartSeriesSlot[] = [
  { key: "blue", color: "var(--chart-1)", dash: undefined },
  { key: "green", color: "var(--chart-2)", dash: "6 3" },
  { key: "green-deep", color: "var(--chart-3)", dash: "2 3" },
  { key: "blue-deep", color: "var(--chart-4)", dash: "10 3 2 3" },
  { key: "red", color: "var(--chart-5)", dash: "1 3" },
] as const;

/**
 * The CSS colour for series `index`.
 *
 * Out-of-range indices get the muted ink, not a sixth invented hue and not slot
 * 1 again. Cycling would give two different series the same colour — a silent
 * misread — and generating a hue would put an unvalidated colour on screen.
 * Grey says "these are lumped together", which is the truth once you are past
 * five; use `foldSeries` so the label says so too.
 */
export function seriesColor(index: number): string {
  return CHART_SERIES[index]?.color ?? "var(--muted-foreground)";
}

/**
 * The stroke pattern for series `index` — the second channel, so a line chart
 * is not read by colour alone.
 *
 * Colour carries identity; the dash carries it again for anyone who cannot
 * separate two of the five hues, and for anyone printing this in grey. Slot 1
 * is solid because the commonest chart has one series and a dashed lone line
 * reads as "projected". The patterns get longer as the slots go on, so adjacent
 * slots differ in period as well as in rhythm.
 *
 * Returned as an SVG `stroke-dasharray`; `undefined` means solid. Out-of-range
 * indices are solid too, matching `seriesColor`'s grey — past five, the tail is
 * one lumped-together thing and does not need a pattern of its own.
 */
export function seriesDash(index: number): string | undefined {
  return CHART_SERIES[index]?.dash;
}

export type FoldedSeries<T> = {
  readonly named: readonly T[];
  /** Everything past the last slot. Empty when it all fit. */
  readonly rest: readonly T[];
};

/**
 * Splits a series list into the ones that get their own colour and the tail.
 *
 * Five is not a styling limit, it is a reading limit: nobody tracks nine hues
 * against a legend, and the sixth colour would have to be either a repeat or an
 * unvalidated one. Sum `rest` into an "Other" series, or facet into small
 * multiples — both are better charts than a nine-colour one.
 */
export function foldSeries<T>(series: readonly T[]): FoldedSeries<T> {
  return {
    named: series.slice(0, CHART_SERIES_SLOTS),
    rest: series.slice(CHART_SERIES_SLOTS),
  };
}
