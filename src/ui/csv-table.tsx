"use client";

import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

import { useControllableState } from "../hooks/use-controllable-state.js";
import { useCopy } from "../hooks/use-copy.js";
import {
  CSV_BLANK_FILTER,
  CSV_GRID_ROW_CAP,
  columnLetter,
  filterRows,
  prepareSheet,
  sortRows,
  summarizeRange,
  toTsv,
} from "../lib/csv-grid.js";
import type { CsvColumn, CsvSheet, CsvSort } from "../lib/csv-grid.js";
import { CSV_COLUMN_CAP, capCsv, isTabular, parseCsv } from "../lib/csv.js";
import type { ParsedCsv } from "../lib/csv.js";
import { cn } from "../lib/utils.js";
import type { FilterSpec } from "./filter-bar.js";
import { SortHeaderButton, ariaSort } from "./sort-header-button.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table.js";

export type { CsvSort } from "../lib/csv-grid.js";

export type CsvTableLabels = {
  readonly tooLarge: string;
  readonly partial: (notes: readonly string[]) => string;
  readonly rowsOf: (shown: number, total: number) => string;
  readonly columnsOf: (shown: number, total: number) => string;
  readonly anyValue: string;
  readonly blank: string;
  readonly untitledColumn: (position: number) => string;
  readonly selectAll: string;
  readonly nameBox: string;
  readonly cellContents: string;
  readonly count: (rows: number, columns: number) => string;
  readonly filteredCount: (
    matching: number,
    total: number,
    columns: number,
  ) => string;
  readonly rendered: (shown: number) => string;
  readonly empty: string;
  readonly noMatches: string;
  readonly selected: (rows: number, columns: number) => string;
  readonly average: (value: number) => string;
  readonly cellCount: (cells: number) => string;
  readonly sum: (value: number) => string;
  readonly copied: string;
  readonly copyFailed: string;
};

const counted = (count: number, one: string, many: string) =>
  `${count.toLocaleString()} ${count === 1 ? one : many}`;

const LABELS: CsvTableLabels = {
  tooLarge:
    "This file is too large to preview — download it to see the whole thing.",
  partial: (notes) =>
    `Showing ${notes.join(" and ")} — download for the full file.`,
  rowsOf: (shown, total) =>
    `${shown.toLocaleString()} of ${total.toLocaleString()} rows`,
  columnsOf: (shown, total) =>
    `${shown.toLocaleString()} of ${total.toLocaleString()} columns`,
  anyValue: "Any",
  blank: "(blank)",
  untitledColumn: (position) => `Column ${position.toLocaleString()}`,
  selectAll: "Select all",
  nameBox: "Selected cell",
  cellContents: "Cell contents",
  count: (rows, columns) =>
    `${counted(rows, "row", "rows")} · ${counted(columns, "column", "columns")}`,
  filteredCount: (matching, total, columns) =>
    `${matching.toLocaleString()} of ${counted(total, "row", "rows")} · ${counted(columns, "column", "columns")}`,
  rendered: (shown) => `showing the first ${shown.toLocaleString()}`,
  empty: "This file has no rows.",
  noMatches: "No rows match.",
  selected: (rows, columns) =>
    `${counted(rows, "row", "rows")} × ${counted(columns, "column", "columns")} selected`,
  average: (value) => `Average: ${value.toLocaleString()}`,
  cellCount: (cells) => `Count: ${cells.toLocaleString()}`,
  sum: (value) => `Sum: ${value.toLocaleString()}`,
  copied: "Copied",
  copyFailed: "Couldn't copy. Your browser blocked the clipboard.",
};

/**
 * A rectangular selection of every matching row it spans, rendered or not.
 * `toTsv` builds the text on demand: a select-all over a large file is a
 * string the host may never ask for, and a host that owns the copy action
 * copies this.
 */
export type CsvSelection = {
  readonly rows: number;
  readonly columns: number;
  readonly toTsv: () => string;
};

/** Column filters keyed by the column's zero-based index, as `FilterSpec.id`. */
export type CsvFilters = Readonly<Record<string, string>>;

export type CsvTableProps = {
  readonly text: string;
  readonly caption?: string | undefined;
  /**
   * A compact spreadsheet grid that sorts, selects and copies, and applies the
   * host's `query` and `filters`. Off, the table is the plain read-only
   * preview.
   */
  readonly interactive?: boolean | undefined;
  /**
   * The search query. The grid has no search, filter or copy controls of its
   * own: the host renders them, from `csvFilterSpecs` and the selection's
   * `toTsv`, and drives `query`, `filters` and `sort`.
   */
  readonly query?: string | undefined;
  readonly filters?: CsvFilters | undefined;
  readonly sort?: CsvSort | null | undefined;
  readonly onSortChange?: ((sort: CsvSort | null) => void) | undefined;
  readonly labels?: Partial<CsvTableLabels> | undefined;
  readonly onSelectionChange?:
    | ((selection: CsvSelection | null) => void)
    | undefined;
};

const NO_FILTERS: CsvFilters = {};

const columnTitle = (
  sheet: CsvSheet,
  column: number,
  wording: CsvTableLabels,
) => sheet.headers[column] || wording.untitledColumn(column + 1);

function filterSpecsOf(
  sheet: CsvSheet,
  filters: CsvFilters,
  wording: CsvTableLabels,
): FilterSpec[] {
  return sheet.columns.flatMap((column, index) =>
    column.choices === null
      ? []
      : [
          {
            id: String(index),
            label: columnTitle(sheet, index, wording),
            options: [
              ...column.choices.map((value) => ({ value, label: value })),
              ...(column.hasBlank
                ? [{ value: CSV_BLANK_FILTER, label: wording.blank }]
                : []),
            ],
            value: filters[String(index)] ?? null,
            anyLabel: wording.anyValue,
          },
        ],
  );
}

/**
 * The filters `CsvTable` offers for `text`, for a host that renders them in
 * its own bar: pass them to `FilterBar`, and its changes back as `filters`.
 * Parses the text, so memoise it on the text and the filters.
 */
export function csvFilterSpecs(
  text: string,
  filters: CsvFilters = NO_FILTERS,
  labels?: Partial<CsvTableLabels>,
): FilterSpec[] {
  const parsed = parseCsv(text);
  if (parsed === null || !isTabular(parsed)) return [];
  const sheet = prepareSheet(
    parsed,
    Math.min(parsed.headers.length, CSV_COLUMN_CAP),
  );
  return filterSpecsOf(sheet, filters, { ...LABELS, ...labels });
}

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
export function CsvTable({
  text,
  caption = "CSV contents",
  interactive = false,
  labels,
  ...grid
}: CsvTableProps) {
  const parsed = useMemo(() => parseCsv(text), [text]);
  const wording = { ...LABELS, ...labels };

  if (parsed === null) {
    return <Notice>{wording.tooLarge}</Notice>;
  }

  if (!isTabular(parsed)) {
    // Height-capped with its own scroll: a multi-thousand-line file as one
    // <pre> is the same DOM freeze the size guard exists to prevent.
    return (
      <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted p-3 font-mono text-xs">
        {text}
      </pre>
    );
  }

  if (interactive) {
    // Keyed on the text so a new file never inherits the old one's
    // selection or, unless the host owns them, sort, filters and query.
    return (
      <CsvGrid
        {...grid}
        key={text}
        parsed={parsed}
        caption={caption}
        wording={wording}
      />
    );
  }

  const capped = capCsv(parsed);
  const notes: string[] = [];
  if (capped.rowsTruncated) {
    notes.push(wording.rowsOf(capped.rows.length, capped.totalRows));
  }
  if (capped.columnsTruncated) {
    notes.push(wording.columnsOf(capped.headers.length, capped.totalColumns));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col overflow-hidden rounded-md border border-border">
        {/* Focusable so the keyboard can scroll it. */}
        <div
          role="group"
          aria-label={caption}
          tabIndex={0}
          className="max-h-[32rem] overflow-auto focus-visible:-outline-offset-2"
        >
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
                    <TableCell key={cellIndex} className="text-xs">
                      {row[cellIndex] ?? ""}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {notes.length === 0 ? null : (
        <p className="text-xs text-muted-foreground">
          {wording.partial(notes)}
        </p>
      )}
    </div>
  );
}

function Notice({ children }: { readonly children: ReactNode }) {
  return (
    <p className="rounded-md border border-border bg-muted px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

/** Row -1 is the CSV header row and column -1 the row numbers. */
type Cell = { readonly row: number; readonly column: number };
type Range = {
  readonly view: readonly number[];
  readonly anchor: Cell;
  readonly focus: Cell;
  /** Picked by row numbers or column letters, and addressed as such: `3:5`, `B:D`. */
  readonly whole?: "rows" | "columns";
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const spanOf = (a: number, b: number) =>
  [Math.min(a, b), Math.max(a, b)] as const;

const nextSort = (sort: CsvSort | null, column: number): CsvSort | null =>
  sort?.column !== column
    ? { column, direction: "asc" }
    : sort.direction === "asc"
      ? { column, direction: "desc" }
      : null;

const ARROWS: Record<string, Cell> = {
  ArrowUp: { row: -1, column: 0 },
  ArrowDown: { row: 1, column: 0 },
  ArrowLeft: { row: 0, column: -1 },
  ArrowRight: { row: 0, column: 1 },
};

const keepTextUnselected = (event: MouseEvent) => {
  if (event.shiftKey) event.preventDefault();
};

/**
 * Selection positions index the sorted, filtered view, so a copy is what the
 * person sees, and it spans every matching row, including those past the
 * render cap. A selection remembers the view it was made in: once a new query,
 * filter or sort lands, it no longer applies.
 *
 * Rows are numbered as a spreadsheet numbers them: the header is row 1 and a
 * sort renumbers, while a filter hides rows and leaves gaps, so a number is
 * the row's place in the sorted, unfiltered sheet and an address names the
 * same rectangle the person sees.
 */
function CsvGrid({
  parsed,
  caption,
  wording,
  query = "",
  filters = NO_FILTERS,
  sort: sortProp,
  onSortChange,
  onSelectionChange,
}: Omit<CsvTableProps, "text" | "caption" | "interactive" | "labels"> & {
  readonly parsed: ParsedCsv;
  readonly caption: string;
  readonly wording: CsvTableLabels;
}) {
  const columnCount = Math.min(parsed.headers.length, CSV_COLUMN_CAP);
  const lastColumn = columnCount - 1;
  const sheet = useMemo(
    () => prepareSheet(parsed, columnCount),
    [parsed, columnCount],
  );
  const [sort, setSort] = useControllableState<CsvSort | null>({
    value: sortProp,
    defaultValue: null,
    onChange: onSortChange,
    name: "CsvTable sort",
  });
  const [range, setRange] = useState<Range | null>(null);
  const [active, setActive] = useState<Cell>({ row: -1, column: 0 });
  const [failedCopy, setFailedCopy] = useState<Range | null>(null);
  const { copied, copy } = useCopy();
  const deferredQuery = useDeferredValue(query);
  const scroller = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const hadFocus = useRef(false);
  const refocus = useRef(false);

  const filterMap = useMemo(
    () =>
      new Map(
        Object.entries(filters).map(([column, value]) => [
          Number(column),
          value,
        ]),
      ),
    [filters],
  );
  const order = useMemo(() => sortRows(sheet, sort), [sheet, sort]);
  const view = useMemo(
    () => filterRows(sheet, order, deferredQuery, filterMap),
    [sheet, order, deferredQuery, filterMap],
  );
  const shown = useMemo(() => view.slice(0, CSV_GRID_ROW_CAP), [view]);
  const rank = useMemo(() => {
    const places = new Int32Array(order.length);
    order.forEach((index, place) => {
      places[index] = place;
    });
    return places;
  }, [order]);
  const lastShown = shown.length - 1;
  const selection = range?.view === view ? range : null;
  // Tied to the range it failed for, so moving the selection clears it.
  const copyFailed = failedCopy !== null && failedCopy === selection;
  const at = {
    row: clamp(active.row, -1, lastShown),
    column: clamp(active.column, -1, lastColumn),
  };
  const [rowFrom, rowTo] =
    selection === null
      ? [-1, -1]
      : spanOf(selection.anchor.row, selection.focus.row);
  const [columnFrom, columnTo] =
    selection === null
      ? [-1, -1]
      : spanOf(selection.anchor.column, selection.focus.column);

  const rangeTsv = useCallback(
    ({ anchor, focus }: Range) => {
      const [top, bottom] = spanOf(anchor.row, focus.row);
      const [left, right] = spanOf(anchor.column, focus.column);
      return toTsv(
        view
          .slice(top, bottom + 1)
          .map((index) => (sheet.rows[index] ?? []).slice(left, right + 1)),
      );
    },
    [sheet, view],
  );

  const summary = useMemo(
    () =>
      rowFrom === -1
        ? null
        : summarizeRange(sheet, view, [rowFrom, rowTo], [columnFrom, columnTo]),
    [sheet, view, rowFrom, rowTo, columnFrom, columnTo],
  );

  const reportRef = useRef(onSelectionChange);
  reportRef.current = onSelectionChange;
  const reported = useRef<Range | null>(null);
  useEffect(() => {
    const report = reportRef.current;
    if (report === undefined || reported.current === selection) return;
    reported.current = selection;
    if (selection === null) {
      report(null);
      return;
    }
    const [top, bottom] = spanOf(selection.anchor.row, selection.focus.row);
    const [left, right] = spanOf(
      selection.anchor.column,
      selection.focus.column,
    );
    report({
      rows: bottom - top + 1,
      columns: right - left + 1,
      toTsv: () => rangeTsv(selection),
    });
  }, [selection, rangeTsv]);
  useEffect(
    () => () => {
      if (reported.current !== null) reportRef.current?.(null);
    },
    [],
  );

  // A filter that drops the focused row moves focus to the nearest row left,
  // in sheet order, rather than losing it to the page.
  const shownBefore = useRef(view);
  useLayoutEffect(() => {
    const before = shownBefore.current;
    shownBefore.current = view;
    if (before === view || active.row < 0) return;
    const index = before[active.row];
    if (index === undefined) return;
    let row = view.indexOf(index);
    if (row === -1) {
      const place = rank[index] ?? 0;
      row = view.findIndex((candidate) => (rank[candidate] ?? 0) >= place);
      if (row === -1) row = view.length - 1;
    }
    if (row === -1) return;
    refocus.current = hadFocus.current;
    setActive({
      row: Math.min(row, CSV_GRID_ROW_CAP - 1),
      column: active.column,
    });
  }, [view]);
  useLayoutEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    scroller.current
      ?.querySelector<HTMLElement>(`[data-cell="${at.row}:${at.column}"]`)
      ?.focus();
  });

  // One outline around the whole range, drawn over the cells rather than as
  // per-cell borders, which would also outline every inner edge.
  useLayoutEffect(() => {
    const box = overlay.current;
    const frame = box?.parentElement;
    if (box === null || frame === null || frame === undefined) return;
    const first = frame.querySelector(`[data-cell="${rowFrom}:${columnFrom}"]`);
    const last = frame.querySelector(
      `[data-cell="${Math.min(rowTo, lastShown)}:${columnTo}"]`,
    );
    box.hidden = rowFrom === -1 || first === null || last === null;
    if (box.hidden || first === null || last === null) return;
    const origin = frame.getBoundingClientRect();
    const start = first.getBoundingClientRect();
    const end = last.getBoundingClientRect();
    box.style.left = `${start.left - origin.left}px`;
    box.style.top = `${start.top - origin.top}px`;
    box.style.width = `${end.right - start.left}px`;
    box.style.height = `${end.bottom - start.top}px`;
  }, [rowFrom, rowTo, columnFrom, columnTo, lastShown, shown]);

  const selectCell = useCallback(
    (cell: Cell, extend: boolean) => {
      setActive(cell);
      setRange((current) => ({
        view,
        anchor: extend && current?.view === view ? current.anchor : cell,
        focus: cell,
      }));
    },
    [view],
  );

  const selectRow = useCallback(
    (row: number, extend: boolean) => {
      setActive({ row, column: -1 });
      setRange((current) => ({
        view,
        anchor: {
          row: extend && current?.view === view ? current.anchor.row : row,
          column: 0,
        },
        focus: { row, column: lastColumn },
        whole: "rows",
      }));
    },
    [view, lastColumn],
  );

  function selectColumn(column: number, extend: boolean) {
    if (view.length === 0) return;
    setActive({ row: 0, column });
    setRange((current) => ({
      view,
      anchor: {
        row: 0,
        column:
          extend && current?.view === view ? current.anchor.column : column,
      },
      focus: { row: view.length - 1, column },
      whole: "columns",
    }));
  }

  function selectAll() {
    if (view.length === 0) return;
    setRange({
      view,
      anchor: { row: 0, column: 0 },
      focus: { row: view.length - 1, column: lastColumn },
    });
  }

  function moveTo(cell: Cell, extend: boolean) {
    const target = {
      row: clamp(cell.row, -1, lastShown),
      column: clamp(cell.column, -1, lastColumn),
    };
    const inBody = (cell: Cell) => cell.row >= 0 && cell.column >= 0;
    setActive(target);
    if (extend) {
      const anchor = selection?.anchor ?? (inBody(at) ? at : null);
      if (anchor !== null) {
        setRange({
          view,
          anchor,
          focus: {
            row: Math.max(0, target.row),
            column: Math.max(0, target.column),
          },
        });
      }
    } else if (inBody(target)) {
      setRange({ view, anchor: target, focus: target });
    }
    scroller.current
      ?.querySelector<HTMLElement>(
        `[data-cell="${target.row}:${target.column}"]`,
      )
      ?.focus();
  }

  function pageRows() {
    const height =
      scroller.current?.querySelector<HTMLElement>('[data-cell="0:0"]')
        ?.offsetHeight ?? 0;
    if (height === 0 || scroller.current === null) return 10;
    return Math.max(1, Math.floor(scroller.current.clientHeight / height) - 2);
  }

  async function copyRange(selected: Range) {
    const written = await copy(rangeTsv(selected));
    setFailedCopy(written ? null : selected);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const command = event.metaKey || event.ctrlKey;
    // Lowercased so Caps Lock or Shift does not turn Ctrl+C into a no-op.
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

    if (command && key === "a") {
      event.preventDefault();
      selectAll();
      return;
    }
    if (command && key === "c" && selection !== null) {
      event.preventDefault();
      void copyRange(selection);
      return;
    }
    if (command && key === " " && at.column >= 0) {
      event.preventDefault();
      selectColumn(at.column, event.shiftKey);
      return;
    }
    if (key === "Escape" && selection !== null) {
      event.preventDefault();
      setRange(null);
      return;
    }
    if ((key === " " || key === "Enter") && at.row >= 0) {
      if (at.column === -1 || (key === " " && event.shiftKey)) {
        event.preventDefault();
        selectRow(at.row, at.column === -1 && event.shiftKey);
      }
      return;
    }

    const arrow = ARROWS[key];
    const edgeRow = (step: number) => (step < 0 ? 0 : lastShown);
    const edgeColumn = (step: number) => (step < 0 ? 0 : lastColumn);
    let next: Cell | null = null;
    if (arrow !== undefined) {
      next = command
        ? {
            row: arrow.row === 0 ? at.row : edgeRow(arrow.row),
            column: arrow.column === 0 ? at.column : edgeColumn(arrow.column),
          }
        : { row: at.row + arrow.row, column: at.column + arrow.column };
    } else if (key === "Home") {
      next = { row: command ? 0 : at.row, column: 0 };
    } else if (key === "End") {
      next = { row: command ? lastShown : at.row, column: lastColumn };
    } else if (key === "PageUp" || key === "PageDown") {
      const step = pageRows();
      next = {
        row: at.row + (key === "PageUp" ? -step : step),
        column: at.column,
      };
    }
    if (next === null) return;
    event.preventDefault();
    moveTo(next, event.shiftKey);
  }

  const rowLabel = (position: number) =>
    position === -1 ? 1 : (rank[view[position] ?? 0] ?? 0) + 2;
  const address = (cell: Cell) =>
    `${columnLetter(cell.column)}${rowLabel(cell.row)}`;
  const nameBox =
    selection === null
      ? at.column >= 0
        ? address(at)
        : ""
      : selection.whole === "rows"
        ? `${rowLabel(rowFrom)}:${rowLabel(rowTo)}`
        : selection.whole === "columns"
          ? `${columnLetter(columnFrom)}:${columnLetter(columnTo)}`
          : rowFrom === rowTo && columnFrom === columnTo
            ? address({ row: rowFrom, column: columnFrom })
            : `${address({ row: rowFrom, column: columnFrom })}:${address({ row: rowTo, column: columnTo })}`;
  const contents =
    at.column < 0
      ? ""
      : at.row === -1
        ? (sheet.headers[at.column] ?? "")
        : (sheet.rows[view[at.row] ?? -1]?.[at.column] ?? "");

  const notes = [
    view.length === sheet.rows.length
      ? wording.count(sheet.rows.length, parsed.headers.length)
      : wording.filteredCount(
          view.length,
          sheet.rows.length,
          parsed.headers.length,
        ),
    ...(view.length > shown.length ? [wording.rendered(shown.length)] : []),
    ...(columnCount < parsed.headers.length
      ? [wording.columnsOf(columnCount, parsed.headers.length)]
      : []),
  ];
  const totals =
    summary === null
      ? []
      : [
          ...(summary.numbers > 0
            ? [wording.average(summary.sum / summary.numbers)]
            : []),
          wording.cellCount(summary.count),
          ...(summary.numbers > 0 ? [wording.sum(summary.sum)] : []),
        ];

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-md border border-border bg-background text-xs">
        <div className="flex items-stretch overflow-hidden rounded-t-md border-b border-border">
          <input
            readOnly
            value={nameBox}
            aria-label={wording.nameBox}
            className="h-8 w-24 shrink-0 border-r border-border bg-background px-2 tabular-nums focus-visible:-outline-offset-2"
          />
          <textarea
            readOnly
            rows={1}
            value={contents}
            aria-label={wording.cellContents}
            className="field-sizing-content max-h-20 min-h-8 min-w-0 flex-1 resize-none bg-background px-2 py-2 leading-4 break-words focus-visible:-outline-offset-2"
          />
        </div>
        <div ref={scroller} className="min-h-0 flex-[1_1_32rem] overflow-auto">
          <div className="relative isolate w-max min-w-full">
            <table
              role="grid"
              aria-label={caption}
              aria-multiselectable="true"
              aria-rowcount={view.length + 2}
              className="min-w-full border-separate border-spacing-0 [&_td]:max-w-80"
              onKeyDown={onKeyDown}
              onFocus={() => {
                hadFocus.current = true;
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  hadFocus.current = false;
                }
              }}
            >
              <thead className="sticky top-0 z-3">
                <tr aria-rowindex={1}>
                  <th
                    scope="col"
                    className="sticky left-0 z-1 h-6 border-r border-b border-border bg-card p-0"
                  >
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={wording.selectAll}
                      onClick={selectAll}
                      className="relative block size-full hover:bg-muted"
                    >
                      <span
                        aria-hidden
                        className="absolute right-1 bottom-1 size-2 bg-border-strong [clip-path:polygon(100%_0,100%_100%,0_100%)]"
                      />
                    </button>
                  </th>
                  {sheet.columns.map((_, index) => (
                    <th
                      key={index}
                      scope="col"
                      onMouseDown={keepTextUnselected}
                      onClick={(event) => selectColumn(index, event.shiftKey)}
                      className={cn(
                        "h-6 cursor-default border-r border-b border-border bg-card px-1 text-center font-normal text-muted-foreground",
                        index >= columnFrom &&
                          index <= columnTo &&
                          "bg-accent font-semibold text-accent-foreground shadow-[inset_0_-2px_0_var(--ring)]",
                      )}
                    >
                      {columnLetter(index)}
                    </th>
                  ))}
                </tr>
                <tr aria-rowindex={2}>
                  <th
                    scope="row"
                    data-cell="-1:-1"
                    tabIndex={at.row === -1 && at.column === -1 ? 0 : -1}
                    onFocus={() => setActive({ row: -1, column: -1 })}
                    className="sticky left-0 z-1 h-8 border-r border-b border-border bg-card px-2 text-right font-normal text-muted-foreground tabular-nums focus-visible:-outline-offset-2"
                  >
                    1
                  </th>
                  {sheet.columns.map((column, index) => {
                    const direction =
                      sort?.column === index ? sort.direction : null;
                    return (
                      <th
                        key={index}
                        scope="col"
                        aria-sort={ariaSort(direction)}
                        className="h-8 border-r border-b border-border bg-card p-0 text-left font-semibold"
                      >
                        <SortHeaderButton
                          direction={direction}
                          data-cell={`-1:${index}`}
                          tabIndex={
                            at.row === -1 && at.column === index ? 0 : -1
                          }
                          onFocus={() => setActive({ row: -1, column: index })}
                          onClick={() => setSort(nextSort(sort, index))}
                          className={cn(
                            "flex h-8 w-full min-w-0 rounded-none px-2 whitespace-nowrap focus-visible:-outline-offset-2 [&>svg]:shrink-0",
                            column.numeric && "justify-end",
                          )}
                        >
                          <span className="truncate">
                            {columnTitle(sheet, index, wording)}
                          </span>
                        </SortHeaderButton>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="select-none">
                {shown.map((index, position) => {
                  const inRange = position >= rowFrom && position <= rowTo;
                  return (
                    <GridRow
                      key={index}
                      position={position}
                      label={rowLabel(position)}
                      cells={sheet.rows[index] ?? []}
                      columns={sheet.columns}
                      selectedFrom={inRange ? columnFrom : -1}
                      selectedTo={inRange ? columnTo : -1}
                      activeColumn={position === at.row ? at.column : -2}
                      onSelectCell={selectCell}
                      onSelectRow={selectRow}
                    />
                  );
                })}
              </tbody>
            </table>
            <div
              ref={overlay}
              hidden
              aria-hidden
              className="pointer-events-none absolute z-1 border-2 border-ring"
            />
          </div>
          {view.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              {sheet.rows.length === 0 ? wording.empty : wording.noMatches}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-b-md border-t border-border bg-card px-2 py-1.5 text-muted-foreground">
          <p role="status">{notes.join(" · ")}</p>
          <p role="status" className={cn(copyFailed && "text-destructive")}>
            {copyFailed ? wording.copyFailed : copied ? wording.copied : ""}
          </p>
          {summary === null ? null : (
            <p className="ms-auto flex flex-wrap gap-x-4 tabular-nums">
              <span className="sr-only">
                {wording.selected(
                  rowTo - rowFrom + 1,
                  columnTo - columnFrom + 1,
                )}
              </span>
              {totals.map((total) => (
                <span key={total} data-total>
                  {total}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const GridRow = memo(function GridRow({
  position,
  label,
  cells,
  columns,
  selectedFrom,
  selectedTo,
  activeColumn,
  onSelectCell,
  onSelectRow,
}: {
  readonly position: number;
  readonly label: number;
  readonly cells: readonly string[];
  readonly columns: readonly CsvColumn[];
  readonly selectedFrom: number;
  readonly selectedTo: number;
  readonly activeColumn: number;
  readonly onSelectCell: (cell: Cell, extend: boolean) => void;
  readonly onSelectRow: (row: number, extend: boolean) => void;
}) {
  return (
    <tr aria-rowindex={position + 3}>
      <th
        scope="row"
        data-cell={`${position}:-1`}
        tabIndex={activeColumn === -1 ? 0 : -1}
        className={cn(
          "sticky left-0 z-2 h-7 border-r border-b border-border bg-card px-2 text-right font-normal text-muted-foreground tabular-nums focus-visible:-outline-offset-2",
          selectedFrom !== -1 &&
            "bg-accent font-semibold text-accent-foreground shadow-[inset_-2px_0_0_var(--ring)]",
        )}
        onMouseDown={keepTextUnselected}
        onClick={(event) => onSelectRow(position, event.shiftKey)}
      >
        {label.toLocaleString()}
      </th>
      {columns.map((column, index) => {
        const selected = index >= selectedFrom && index <= selectedTo;
        return (
          <td
            key={index}
            data-cell={`${position}:${index}`}
            aria-selected={selected}
            tabIndex={index === activeColumn ? 0 : -1}
            className={cn(
              "h-7 truncate border-r border-b border-border px-2 py-0 focus-visible:-outline-offset-2",
              column.numeric && "text-right tabular-nums",
              selected && index !== activeColumn && "bg-accent/60",
            )}
            onMouseDown={keepTextUnselected}
            onClick={(event) =>
              onSelectCell({ row: position, column: index }, event.shiftKey)
            }
          >
            {cells[index] ?? ""}
          </td>
        );
      })}
    </tr>
  );
});
