/**
 * The data side of the interactive CSV grid: everything that walks every row
 * of the file, kept out of the component so it runs once per file, once per
 * sort change, or once per query, and never once per keystroke of navigation.
 */
import type { SortDirection } from "../ui/sort-header-button.js";
import type { ParsedCsv } from "./csv.js";

/** Rows past this stay out of the DOM; search, sort and filters still cover every row. */
export const CSV_GRID_ROW_CAP = 1000;
/** A column with more distinct values than this is not a category worth a filter. */
export const CSV_FILTER_MAX_VALUES = 12;
/** A value longer than this is prose, not a category label. */
export const CSV_FILTER_MAX_LENGTH = 24;
/**
 * The filter value for "the cell is blank". A NUL never appears in a CSV a
 * person edits, and `FilterBar` reserves the empty string for "no filter".
 */
export const CSV_BLANK_FILTER = "\u0000";

export type CsvSort = {
  readonly column: number;
  readonly direction: SortDirection;
};

export type CsvColumn = {
  /** Every non-blank cell parses as a number, and at least one is non-blank. */
  readonly numeric: boolean;
  /** The parsed value per row for a numeric column, `null` for a blank. */
  readonly numbers: readonly (number | null)[] | null;
  /** Distinct non-blank values, sorted, when the column reads as a category. */
  readonly choices: readonly string[] | null;
  readonly hasBlank: boolean;
};

export type CsvSheet = {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly columns: readonly CsvColumn[];
  /** Each row's cells, lowercased and joined, so a search is one `includes`. */
  readonly haystacks: readonly string[];
};

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

const NUMBER =
  /^([-+]?)[$€£¥]?([-+]?)((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:[eE][-+]?\d+)?|\.\d+)%?$/;

/**
 * A cell's numeric value, reading it the way a spreadsheet would display it:
 * thousands separators, a currency mark on either side of the sign, a trailing
 * percent worth a hundredth, and accounting negatives written in parentheses.
 */
export function cellNumber(raw: string): number | null {
  let text = raw.trim();
  let negative = false;
  if (text.startsWith("(") && text.endsWith(")")) {
    negative = true;
    text = text.slice(1, -1).trim();
  }
  const match = NUMBER.exec(text);
  if (match === null) return null;
  const [, outerSign = "", innerSign = "", digits = ""] = match;
  const sign = outerSign || innerSign;
  if ((outerSign && innerSign) || (negative && sign)) return null;
  const value =
    Number(digits.replaceAll(",", "")) / (text.endsWith("%") ? 100 : 1);
  return negative || sign === "-" ? -value : value;
}

const isBlank = (cell: string) => cell.trim() === "";

function describeColumn(rows: ParsedCsv["rows"], column: number): CsvColumn {
  let hasBlank = false;
  let numbers: (number | null)[] | null = [];
  let distinct: Set<string> | null = new Set();
  for (const row of rows) {
    const cell = row[column] ?? "";
    if (isBlank(cell)) {
      hasBlank = true;
      numbers?.push(null);
      continue;
    }
    const value = numbers === null ? null : cellNumber(cell);
    if (value === null) numbers = null;
    else numbers?.push(value);
    distinct?.add(cell);
    if (
      distinct !== null &&
      (distinct.size > CSV_FILTER_MAX_VALUES ||
        cell.length > CSV_FILTER_MAX_LENGTH)
    ) {
      distinct = null;
    }
    if (numbers === null && distinct === null && hasBlank) break;
  }
  const numeric = numbers?.some((value) => value !== null) ?? false;
  const choices =
    distinct !== null && distinct.size >= 2 && distinct.size <= rows.length / 2
      ? [...distinct].sort(collator.compare)
      : null;
  return { numeric, numbers: numeric ? numbers : null, choices, hasBlank };
}

/**
 * Walks the file once for everything search, sort and filters need later,
 * over the first `columnCount` columns only: a match in a column that is not
 * on screen would show a row with no visible reason for being there.
 */
export function prepareSheet(parsed: ParsedCsv, columnCount: number): CsvSheet {
  return {
    headers: parsed.headers,
    rows: parsed.rows,
    columns: parsed.headers
      .slice(0, columnCount)
      .map((_, column) => describeColumn(parsed.rows, column)),
    haystacks: parsed.rows.map((row) =>
      row.slice(0, columnCount).join("\n").toLowerCase(),
    ),
  };
}

/**
 * Row indices in display order. Blanks go last in either direction, as a
 * spreadsheet places them, and ties keep file order.
 */
export function sortRows(sheet: CsvSheet, sort: CsvSort | null): number[] {
  const order = sheet.rows.map((_, index) => index);
  if (sort === null) return order;
  const sign = sort.direction === "asc" ? 1 : -1;
  const numbers = sheet.columns[sort.column]?.numbers ?? null;
  const cell = (index: number) => sheet.rows[index]?.[sort.column] ?? "";
  return order.sort((a, b) => {
    const left = cell(a);
    const right = cell(b);
    const blanks = Number(isBlank(left)) - Number(isBlank(right));
    if (blanks !== 0) return blanks;
    if (isBlank(left)) return 0;
    return (
      sign *
      (numbers === null
        ? collator.compare(left, right)
        : (numbers[a] ?? 0) - (numbers[b] ?? 0))
    );
  });
}

/** The rows of `order` that match the query and every column filter. */
export function filterRows(
  sheet: CsvSheet,
  order: readonly number[],
  query: string,
  filters: ReadonlyMap<number, string>,
): readonly number[] {
  const needle = query.trim().toLowerCase();
  if (needle === "" && filters.size === 0) return order;
  return order.filter((index) => {
    const row = sheet.rows[index] ?? [];
    for (const [column, value] of filters) {
      const cell = row[column] ?? "";
      if (value === CSV_BLANK_FILTER ? !isBlank(cell) : cell !== value) {
        return false;
      }
    }
    return needle === "" || (sheet.haystacks[index] ?? "").includes(needle);
  });
}

const tsvCell = (cell: string) =>
  /[\t\n\r"]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;

/** Tab-separated text, quoted where a spreadsheet's paste needs it. */
export function toTsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(tsvCell).join("\t")).join("\n");
}
