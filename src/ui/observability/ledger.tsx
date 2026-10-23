"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../table.js";
import {
  formatCost,
  formatDuration,
  formatSpeed,
  formatTokens,
} from "./format.js";
import { measures, type MeasureSort } from "./metrics.js";
import type { Trace } from "./model.js";
import { stepTitle } from "./wording.js";

export function Ledger({
  trace,
  sort,
  selectedId,
  onSelect,
}: {
  readonly trace: Trace;
  readonly sort: MeasureSort;
  readonly selectedId?: string;
  readonly onSelect?: (id: string) => void;
}) {
  const rows = measures(trace, sort);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Step</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Tokens</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Speed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const span = trace.spans.find((item) => item.id === row.id);
          const title = span === undefined ? row.name : stepTitle(span);
          return (
            <TableRow
              key={row.id}
              className={row.id === selectedId ? "bg-muted/70" : undefined}
            >
              <TableCell>
                {onSelect === undefined ? (
                  title
                ) : (
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => onSelect(row.id)}
                  >
                    {title}
                  </button>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {row.provider === "—" ? "—" : `${row.provider}/${row.model}`}
              </TableCell>
              <TableCell className="font-mono">
                {row.tokens === 0 ? "—" : formatTokens(row.tokens)}
              </TableCell>
              <TableCell className="font-mono">
                {row.costUsd === 0 ? "—" : formatCost(row.costUsd)}
              </TableCell>
              <TableCell className="font-mono">
                {formatDuration(row.durationMs)}
              </TableCell>
              <TableCell className="font-mono">
                {formatSpeed(row.tokensPerSecond)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
