import { formatCompact, scaleLinear } from "../lib/chart-geometry.js";
import { seriesColor } from "../lib/chart-palette.js";
import { cn } from "../lib/utils.js";
import { EmptyState } from "./empty-state.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table.js";

export type CountRow = {
  readonly label: string;
  readonly count: number;
};

export type CountTableProps = {
  /** Names the table. A count of *what* is the first thing a reader needs. */
  readonly caption: string;
  readonly rows: readonly CountRow[];
  /** Header for the count column. */
  readonly countLabel?: string;
  readonly format?: (value: number) => string;
  readonly className?: string;
};

/**
 * A ranked tally: what, how many, and how the tail compares to the head.
 *
 * A table rather than a chart, with the bar as a *secondary* encoding behind the
 * number. The exact count is the answer here — "412 runs", not "roughly this
 * long" — so the number is the content and the bar is what lets the eye rank
 * fifteen rows without reading fifteen numbers. That is the opposite of a bar
 * chart's priority, and it is why this is not one.
 *
 * The bar is a background layer inside the label cell, not its own column. Its
 * own column would either squeeze the labels or push the counts off the right of
 * a narrow card, and the comparison reads better when the bar sits directly
 * under the thing it measures.
 *
 * The bar is `aria-hidden` and scaled to the largest row rather than to a round
 * axis: it carries no value a reader needs, since the count is right there in
 * text, and against the maximum the ranking is as legible as it can be.
 *
 * Rows are rendered in the order given. Sorting here would fight whatever
 * ranking the caller computed — which is usually the point of the table.
 */
export function CountTable({ caption, rows, countLabel = "Count", format = formatCompact, className }: CountTableProps) {
  if (rows.length === 0) {
    return <EmptyState className={className} title={`No ${caption.toLowerCase()} recorded`} />;
  }

  const max = Math.max(...rows.map((row) => row.count));

  return (
    <Table aria-label={caption} className={className}>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{caption}</TableHead>
          <TableHead scope="col" className="text-right">
            {countLabel}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell className="relative">
              <span
                aria-hidden
                className="absolute inset-y-1 left-0 rounded-xs opacity-15"
                style={{ width: `${scaleLinear(row.count, max, 100)}%`, backgroundColor: seriesColor(0) }}
              />
              <span className={cn("relative")}>{row.label}</span>
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">{format(row.count)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
