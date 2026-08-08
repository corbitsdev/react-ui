import type * as React from "react";
import type { ReactNode } from "react";

import { useCollectionState } from "../hooks/use-collection-state.js";
import type { CollectionRequest } from "../lib/data-port.js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table.js";

export type Column<T> = {
  readonly header: string;
  readonly cell: (row: T) => ReactNode;
};

export type DataTableProps<T> = {
  readonly caption: string;
  readonly request: CollectionRequest<T>;
  readonly columns: readonly Column<T>[];
  readonly rowKey: (row: T) => string;
  readonly empty?: ReactNode;
  /**
   * Row activation — a detail view, an inspector. Rows become focusable and
   * keyboard-activatable (Enter and Space), so the pointer is never the only
   * way in. Keep per-cell interactive elements out of clickable rows: a link
   * inside a button-role row is two targets in one hit area.
   */
  readonly onRowClick?: (row: T) => void;
};

/** A table fed by whatever DataPort is in scope — the port is the only data seam. */
export function DataTable<T>({ caption, request, columns, rowKey, empty, onRowClick }: DataTableProps<T>) {
  const { state, isFetching } = useCollectionState(request);

  const body = (): ReactNode => {
    if (state.status === "loading") return <Status colSpan={columns.length}>Loading…</Status>;
    if (state.status === "error") return <Status colSpan={columns.length}>{state.error.message}</Status>;
    if (state.status === "empty") return <Status colSpan={columns.length}>{empty ?? "Nothing here yet."}</Status>;
    return state.items.map((row) => (
      <TableRow
        key={rowKey(row)}
        {...(onRowClick === undefined
          ? {}
          : {
              role: "button" as const,
              tabIndex: 0,
              className: "cursor-pointer",
              onClick: () => onRowClick(row),
              onKeyDown: (event: React.KeyboardEvent<HTMLTableRowElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onRowClick(row);
                }
              },
            })}
      >
        {columns.map((column) => (
          <TableCell key={column.header}>{column.cell(row)}</TableCell>
        ))}
      </TableRow>
    ));
  };

  return (
    // isFetching, not isLoading: a refetch over cached rows is still busy.
    <Table aria-label={caption} aria-busy={isFetching}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.header} scope="col">
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{body()}</TableBody>
    </Table>
  );
}

function Status({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}
