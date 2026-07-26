import type { ReactNode } from "react";

import { cn } from "@/registry/corbits/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/registry/corbits/ui/table";

export type ChartLegendEntry = {
  readonly label: string;
  /** A CSS colour — normally `seriesColor(index)`. */
  readonly color: string;
  /**
   * An SVG `stroke-dasharray` — normally `seriesDash(index)`. Present when the
   * mark carries a second, non-colour channel; the swatch becomes a line
   * segment drawn with the same pattern, so the legend cross-references both
   * channels instead of only the hue. Omit for filled marks like bars.
   */
  readonly dash?: string;
};

export type ChartTable = {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly ReactNode[])[];
};

export type ChartFrameProps = {
  /** Names the chart. Becomes both the visible caption and the accessible name. */
  readonly title: string;
  readonly description?: string;
  /** Omit for a single series — one swatch restating the title is wasted space. */
  readonly legend?: readonly ChartLegendEntry[];
  /**
   * The same numbers as a table. Required, not optional: this is what makes a
   * chart readable to someone who cannot see it, and an escape hatch that only
   * appears when a developer remembers it is not an escape hatch.
   */
  readonly table: ChartTable;
  /** The plot itself — an `<svg>`. */
  readonly children: ReactNode;
  readonly className?: string;
};

/**
 * The frame every chart here sits in: a caption, a legend, the plot, and the
 * same data as a table.
 *
 * The table is the point. A chart is a picture of numbers, and a picture is not
 * available to a screen reader, a text browser, or anyone who needs the exact
 * value rather than the shape — so the numbers are always present, one
 * disclosure away, in DOM order right after the plot. `<details>` gives that a
 * keyboard-operable, correctly-announced control for free.
 *
 * `<figure>`/`<figcaption>` rather than a div and an h3: the caption is bound to
 * the figure by the element pair, which is what makes "Revenue by region" the
 * chart's name instead of a heading that happens to sit above it.
 *
 * The legend appears for two or more series and never for one, because with one
 * series the caption already says what is plotted. Each entry pairs a colour
 * swatch with text — the text is the identity channel, the swatch is the
 * cross-reference. Text never wears the series colour: a mid-lightness hue that
 * is correct for a 24px bar is unreadable at 12px.
 */
export function ChartFrame({ title, description, legend, table, children, className }: ChartFrameProps) {
  const showLegend = legend !== undefined && legend.length > 1;

  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <figcaption className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold">{title}</span>
        {description === undefined ? null : (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </figcaption>

      {showLegend ? (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {legend.map((entry) => (
            <li key={entry.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {entry.dash === undefined ? (
                <span aria-hidden className="size-2.5 shrink-0 rounded-xs" style={{ backgroundColor: entry.color }} />
              ) : (
                <svg aria-hidden viewBox="0 0 20 4" className="h-1 w-5 shrink-0 overflow-visible">
                  <line
                    x1={0}
                    y1={2}
                    x2={20}
                    y2={2}
                    stroke={entry.color}
                    strokeWidth={2.5}
                    strokeLinecap="butt"
                    strokeDasharray={entry.dash}
                  />
                </svg>
              )}
              {entry.label}
            </li>
          ))}
        </ul>
      ) : null}

      {children}

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Show the data</summary>
        <div className="mt-2">
          <Table aria-label={`${title} — data`}>
            <TableHeader>
              <TableRow>
                {table.columns.map((column, index) => (
                  <TableHead key={column} scope="col" className={index === 0 ? undefined : "text-right"}>
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <TableCell
                      key={cellIndex}
                      className={cellIndex === 0 ? undefined : "text-right font-mono tabular-nums"}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </figure>
  );
}
