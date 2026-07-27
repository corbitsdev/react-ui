import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils.js";
import { EmptyState } from "./empty-state.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table.js";

export type SortDirection = "asc" | "desc";

export type SortableColumn<T> = {
  /** Stable id — the React key and the sort key. */
  readonly key: string;
  readonly header: string;
  readonly cell: (row: T) => ReactNode;
  /**
   * Makes the column sortable by returning its comparable value. Omit for
   * presentation-only columns such as a row-actions cell.
   */
  readonly sortValue?: (row: T) => string | number;
  readonly align?: "left" | "right";
  readonly className?: string;
};

export type SortableTableProps<T> = {
  readonly caption: string;
  readonly rows: readonly T[];
  readonly columns: readonly SortableColumn<T>[];
  readonly rowKey: (row: T) => string;
  readonly initialSort?: { readonly key: string; readonly direction: SortDirection };
  readonly empty?: ReactNode;
  readonly className?: string;
};

/**
 * A table you can sort by clicking a header.
 *
 * Rows are an array, not a `DataPort` collection — this sorts client-side over
 * rows it already has, which is only correct for a set small enough to hold in
 * full. Once the data is paginated, sorting has to happen at the source or the
 * user is sorting one page and being told it is the whole set; use `DataTable`
 * with a server-sorted request for that. The two are different tools and this
 * one does not pretend to be the other.
 *
 * `aria-sort` on the active header is the part that matters. A caret glyph is
 * invisible to a screen reader, and sort order is exactly the sort of state
 * that goes unnoticed without it. Inactive sortable headers show a neutral
 * affordance so it is discoverable which columns can be sorted at all.
 */
export function SortableTable<T>({
  caption,
  rows,
  columns,
  rowKey,
  initialSort,
  empty,
  className,
}: SortableTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(initialSort ?? null);

  const sorted = useMemo(() => {
    if (sort === null) return rows;
    const column = columns.find((candidate) => candidate.key === sort.key);
    if (column?.sortValue === undefined) return rows;
    const { sortValue } = column;

    // Sorts a copy: `rows` belongs to the caller and may be frozen.
    return [...rows].sort((a, b) => {
      const left = sortValue(a);
      const right = sortValue(b);
      const comparison =
        typeof left === "number" && typeof right === "number"
          ? left - right
          : // localeCompare so "Ä" sorts next to "A" rather than after "Z".
            String(left).localeCompare(String(right));
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }, [rows, columns, sort]);

  const toggle = (key: string) => {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  if (rows.length === 0) {
    return <>{empty ?? <EmptyState title="Nothing to show" />}</>;
  }

  return (
    <Table aria-label={caption} className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => {
            const active = sort?.key === column.key;
            const sortable = column.sortValue !== undefined;
            return (
              <TableHead
                key={column.key}
                scope="col"
                aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
                className={cn(column.align === "right" && "text-right", column.className)}
              >
                {sortable ? (
                  <button
                    type="button"
                    onClick={() => toggle(column.key)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground",
                      !active && "text-muted-foreground",
                    )}
                  >
                    {column.header}
                    {active ? (
                      sort.direction === "asc" ? (
                        <ChevronUp className="size-3.5" aria-hidden />
                      ) : (
                        <ChevronDown className="size-3.5" aria-hidden />
                      )
                    ) : (
                      <ChevronsUpDown className="size-3.5 opacity-50" aria-hidden />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={rowKey(row)}>
            {columns.map((column) => (
              <TableCell key={column.key} className={cn(column.align === "right" && "text-right", column.className)}>
                {column.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
