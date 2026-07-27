/**
 * A CSV parser sized for previewing a file in a browser tab, not for ingesting
 * one.
 *
 * The distinction matters and drives every decision here. A preview has a
 * hostile input (a user's arbitrary file), a hard latency budget (the tab must
 * stay responsive), and a low cost of being approximate (the user can always
 * download the original). So this refuses oversized input up front instead of
 * streaming it, caps what it hands back instead of virtualising, and reports
 * "not tabular" instead of guessing — a ragged file rendered as a grid puts
 * cells under the wrong headers, which is a worse failure than showing raw text.
 */

/** Rows past this are dropped; the caller must say so in the UI. */
export const CSV_ROW_CAP = 500;
/** Columns past this are dropped; the caller must say so in the UI. */
export const CSV_COLUMN_CAP = 40;
/**
 * Refuse to parse beyond this. 2 MiB of CSV is roughly 20k rows — already far
 * past what anyone reads on screen, and enough DOM to lock the tab.
 */
export const CSV_MAX_PREVIEW_BYTES = 2 * 1024 * 1024;

export type ParsedCsv = {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
};

/**
 * True UTF-8 length, not `string.length`.
 *
 * `"é".length` is 1 but it costs 2 bytes, and a file of CJK text is three times
 * its character count — sizing the guard by character count would let a file
 * three times over budget through.
 */
export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/**
 * Splits one CSV line, honouring RFC 4180 quoting: `"a,b"` is one field, and a
 * doubled `""` inside quotes is a literal quote.
 *
 * Line-at-a-time, so a quoted field containing a newline will split across two
 * records. That is a deliberate limit rather than an oversight: handling it
 * needs a character-level state machine over the whole document, and embedded
 * newlines show up as an extra ragged row here — which `isTabular` catches and
 * degrades to raw text, the honest outcome.
 */
function splitLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}

/**
 * Parses CSV text, or returns `null` when it is too large to parse safely.
 *
 * `null` rather than a throw: "too big to preview" is an expected outcome of
 * showing a user their own file, not an exceptional one, and the caller's
 * response is to render a different surface rather than to catch.
 */
export function parseCsv(text: string): ParsedCsv | null {
  if (utf8ByteLength(text) > CSV_MAX_PREVIEW_BYTES) return null;

  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  const [headerLine, ...bodyLines] = lines;
  return {
    headers: splitLine(headerLine ?? ""),
    rows: bodyLines.map(splitLine),
  };
}

/**
 * Whether the parse is rectangular enough to render as a grid.
 *
 * Requires at least two columns and every row to match the header width. A
 * single-column "CSV" is prose that happens to have no commas, and a ragged one
 * has no reliable column alignment — in both cases raw text tells the truth and
 * a table does not.
 */
export function isTabular(parsed: ParsedCsv): boolean {
  if (parsed.headers.length < 2) return false;
  return parsed.rows.every((row) => row.length === parsed.headers.length);
}

export type CappedCsv = {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly totalRows: number;
  readonly totalColumns: number;
  readonly rowsTruncated: boolean;
  readonly columnsTruncated: boolean;
};

/** Trims a parse to the caps, keeping the original totals so the UI can say so. */
export function capCsv(parsed: ParsedCsv): CappedCsv {
  const totalRows = parsed.rows.length;
  const totalColumns = parsed.headers.length;
  const columnsTruncated = totalColumns > CSV_COLUMN_CAP;
  const rowsTruncated = totalRows > CSV_ROW_CAP;

  return {
    headers: columnsTruncated ? parsed.headers.slice(0, CSV_COLUMN_CAP) : parsed.headers,
    rows: (rowsTruncated ? parsed.rows.slice(0, CSV_ROW_CAP) : parsed.rows).map((row) =>
      columnsTruncated ? row.slice(0, CSV_COLUMN_CAP) : row,
    ),
    totalRows,
    totalColumns,
    rowsTruncated,
    columnsTruncated,
  };
}
