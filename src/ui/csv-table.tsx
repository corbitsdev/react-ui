import { useMemo } from "react";

import { capCsv, isTabular, parseCsv } from "../lib/csv.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table.js";

/**
 * CSV text, rendered as a table when that is honest and as raw text when it is
 * not.
 *
 * Three outcomes, in order of preference: a grid, the source text, or a refusal.
 * The order is not about effort — it is about truthfulness. A grid is the most
 * useful and the most capable of lying, so it is only used once the parse is
 * provably rectangular; otherwise the source text is shown verbatim, where a
 * ragged row is visibly ragged instead of silently shifting cells under the
 * wrong headers.
 *
 * The parse is memoised on the text. Without it, any parent re-render — a hover,
 * a filter's own state — re-walks every row of the file.
 *
 * Columns and rows are keyed by index, never by content. CSV rows duplicate
 * freely and headers are routinely empty or repeated ("", two "Name" columns);
 * a content key would collide and drop data.
 */
export function CsvTable({ text, caption = "CSV contents" }: { readonly text: string; readonly caption?: string }) {
  const parsed = useMemo(() => parseCsv(text), [text]);

  if (parsed === null) {
    return (
      <p className="rounded-md border border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
        This file is too large to preview — download it to see the whole thing.
      </p>
    );
  }

  if (!isTabular(parsed)) {
    // Height-capped with its own scroll: a multi-thousand-line file as one
    // <pre> is the same DOM freeze the size guard exists to prevent.
    return (
      <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted p-3 font-mono text-xs">{text}</pre>
    );
  }

  const capped = capCsv(parsed);
  const notes: string[] = [];
  if (capped.rowsTruncated) {
    notes.push(`${capped.rows.length.toLocaleString()} of ${capped.totalRows.toLocaleString()} rows`);
  }
  if (capped.columnsTruncated) {
    notes.push(`${capped.headers.length.toLocaleString()} of ${capped.totalColumns.toLocaleString()} columns`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="max-h-[32rem] overflow-auto rounded-md border border-border">
        <Table aria-label={caption}>
          <TableHeader>
            <TableRow>
              {capped.headers.map((header, index) => (
                <TableHead key={index} scope="col">
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {capped.rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {capped.headers.map((_, cellIndex) => (
                  <TableCell key={cellIndex} className="font-mono text-xs">
                    {row[cellIndex] ?? ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {notes.length === 0 ? null : (
        <p className="text-xs text-muted-foreground">Showing {notes.join(" and ")} — download for the full file.</p>
      )}
    </div>
  );
}
