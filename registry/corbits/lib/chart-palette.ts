/**
 * Series colour, assigned by position and never by value.
 *
 * The five `--chart-*` tokens are a *fixed order*, not a pool. Slot 1 is always
 * the first series in the data, slot 2 the second, and so on — so filtering a
 * series out never repaints the survivors. A chart whose colours move when the
 * legend changes destroys the one thing colour is doing here, which is identity.
 *
 * The steps behind those tokens were chosen against the data-visualisation
 * standard rather than picked to look nice: each sits inside its mode's
 * lightness band, clears the chroma floor, holds ≥3:1 against both the page and
 * a card, and the *ordering* — blue, orange, violet, green, red — was selected
 * by enumerating orders and keeping the ones whose worst neighbouring pair
 * survives simulated protanopia and deuteranopia. Light mode clears the ΔE 8
 * target outright (worst adjacent pair 10.5). Dark mode lands at 7.2, inside the
 * 6–8 floor band, which is legal **only** alongside a second, non-colour channel
 * — which is why every chart in this registry ships a legend, direct labels and
 * a data table rather than treating them as polish.
 *
 * The theme's contrast gate re-checks the 3:1 half of that on every build. The
 * colour-vision half cannot be re-derived from hex pairs; if you re-step these
 * tokens, re-run the standard's palette validator.
 */

/** How many distinct series the palette can carry. Past this, fold. */
export const CHART_SERIES_SLOTS = 5;

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
  if (index < 0 || index >= CHART_SERIES_SLOTS) return "var(--muted-foreground)";
  return `var(--chart-${index + 1})`;
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
  const patterns = [undefined, "6 3", "2 3", "10 3 2 3", "1 3"] as const;
  if (index < 0 || index >= CHART_SERIES_SLOTS) return undefined;
  return patterns[index];
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
