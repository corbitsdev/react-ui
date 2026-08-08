import { buildMosaic, formatCompact } from "../lib/metrics.js";
import { seriesColor } from "../lib/chart-palette.js";
import { cn } from "../lib/utils.js";

export type TokenMosaicProps = {
  /** Shares of one whole, in a stable order — colour is assigned by position. */
  readonly parts: readonly { readonly label: string; readonly value: number }[];
  /** What the whole is — "Token usage by class". */
  readonly label: string;
  readonly className?: string;
};

/**
 * Shares of a whole as one stacked strip, with a legend that names and
 * quantifies every segment.
 *
 * Segments are painted from the fixed series ramp by position, never cycled:
 * past the last slot a segment goes muted, which honestly says "lumped
 * together" — fold small parts into an "Other" entry before rendering rather
 * than asking a reader to track more hues. The legend is the accessible half:
 * the strip itself is one `role="img"` and each legend entry carries the
 * segment's label and compact value.
 */
export function TokenMosaic({ parts, label, className }: TokenMosaicProps) {
  const segments = buildMosaic(parts);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-[3px] bg-muted" role="img" aria-label={label}>
        <svg className="h-full w-full" viewBox="0 0 100 10" preserveAspectRatio="none">
          {renderSegmentRects(segments)}
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((segment, index) => (
          <span
            key={segment.label}
            className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.08em] uppercase text-muted-foreground"
          >
            <span aria-hidden className="size-2 rounded-[1px]" style={{ backgroundColor: seriesColor(index) }} />
            {segment.label} {formatCompact(segment.value)}
          </span>
        ))}
      </div>
    </div>
  );
}

function renderSegmentRects(segments: readonly { label: string; pct: number }[]) {
  let x = 0;
  return segments.map((segment, index) => {
    const rect = (
      <rect key={segment.label} x={x} y={0} width={segment.pct} height={10} fill={seriesColor(index)} />
    );
    x += segment.pct;
    return rect;
  });
}
