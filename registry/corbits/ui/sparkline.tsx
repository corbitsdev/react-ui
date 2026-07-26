import { linePath, scaleLinear } from "@/registry/corbits/lib/chart-geometry";
import { seriesColor } from "@/registry/corbits/lib/chart-palette";
import { cn } from "@/registry/corbits/lib/utils";

export type SparklineProps = {
  readonly values: readonly number[];
  /**
   * What the shape means, in words — "Up 12% over 30 days". Without it the
   * sparkline is invisible to anyone not looking at it, and a shape with no
   * axes and no labels cannot be inferred from its markup.
   */
  readonly summary: string;
  readonly className?: string;
};

const WIDTH = 96;
const HEIGHT = 24;

/**
 * A trend, at the size of a word.
 *
 * No axes, no ticks, no labels — that is the form, not an omission. A sparkline
 * says "rising", "flat", "spiky" beside a number that says exactly how much; the
 * moment it needs a scale it has outgrown itself and wants to be a chart.
 *
 * It is scaled between the series' own minimum and maximum rather than from
 * zero. This is the one place a non-zero baseline is right: the shape is the
 * only message, and anchoring to zero flattens every real series into a
 * horizontal line near the top of a 24px box.
 *
 * `role="img"` with the caller's summary as its name. The summary is required
 * for the same reason `alt` is: a picture with no text alternative is simply
 * missing for some readers, and this one has no fallback content to fall back to.
 */
export function Sparkline({ values, summary, className }: SparklineProps) {
  if (values.length < 2) {
    return <span className={cn("inline-block", className)} role="img" aria-label={summary} />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const stepX = WIDTH / (values.length - 1);

  const points = values.map((value, index) => ({
    x: index * stepX,
    // A flat series has no span to scale against; centre it rather than
    // dividing by zero.
    y: span === 0 ? HEIGHT / 2 : HEIGHT - scaleLinear(value - min, span, HEIGHT - 4) - 2,
  }));
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("h-6 w-24", className)}
      role="img"
      aria-label={summary}
      focusable="false"
    >
      <path d={linePath(points)} fill="none" stroke={seriesColor(0)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {last === undefined ? null : (
        // The end dot marks "now" — which end is the current period is
        // otherwise ambiguous on a shape with no axis.
        <circle cx={last.x} cy={last.y} r={2.5} fill={seriesColor(0)} stroke="var(--card)" strokeWidth={2} />
      )}
    </svg>
  );
}
