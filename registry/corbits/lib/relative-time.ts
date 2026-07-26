const UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/**
 * "3 min ago" / "in 2 days", localised, from an ISO timestamp.
 *
 * `now` is a parameter rather than a `Date.now()` call inside so the output is
 * a pure function of its inputs — otherwise every list that renders a timestamp
 * is untestable and re-renders to a different string than the server produced.
 * Pass the server's render time when hydrating.
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";

  const delta = then - now;
  const magnitude = Math.abs(delta);
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "narrow" });

  for (const [unit, ms] of UNITS) {
    if (magnitude >= ms) return format.format(Math.round(delta / ms), unit);
  }
  return format.format(Math.round(delta / 1000), "second");
}
