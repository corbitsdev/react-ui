"use client";

import { useMemo, useState } from "react";

import { cn } from "../../lib/utils.js";
import { Badge } from "../badge.js";
import { formatCost, formatDuration, formatTokens } from "./format.js";
import { observationRows, type ObservationRow } from "./metrics.js";
import type { Trace } from "./model.js";
import { stepTitle } from "./wording.js";

export type ObservationsProps = {
  readonly traces: readonly Trace[];
  readonly onOpen: (traceId: string, spanId: string) => void;
};

const LEVEL_TONE = {
  Default: "neutral",
  Warning: "warning",
  Error: "danger",
  Debug: "info",
} as const;

export function Observations({ traces, onOpen }: ObservationsProps) {
  const rows = useMemo(() => observationRows(traces), [traces]);
  const [level, setLevel] = useState<"all" | "Error" | "Warning">("all");
  const shown = rows.filter((row) => level === "all" || row.level === level);

  return (
    <section className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Steps</h1>
          <p className="text-sm text-muted-foreground">
            Every step, across runs.
          </p>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {shown.length} shown
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Filter
          label="Level"
          value={level}
          options={[
            ["all", "All levels"],
            ["Error", "Error"],
            ["Warning", "Warning"],
          ]}
          onChange={setLevel}
        />
      </div>
      <div className="overflow-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-2 py-2 font-medium">Run</th>
              <th className="px-2 py-2 font-medium">Type</th>
              <th className="px-2 py-2 font-medium">Name</th>
              <th className="px-2 py-2 font-medium">Model</th>
              <th className="px-2 py-2 font-medium">Level</th>
              <th className="px-2 py-2 text-right font-medium">Latency</th>
              <th className="px-2 py-2 text-right font-medium">Tokens</th>
              <th className="px-2 py-2 text-right font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr
                key={`${row.traceId}:${row.spanId}`}
                className="border-b border-border hover:bg-muted/60"
              >
                <td className="px-2 py-2">
                  <button
                    type="button"
                    className="text-left font-medium"
                    onClick={() => onOpen(row.traceId, row.spanId)}
                  >
                    {row.traceName}
                  </button>
                </td>
                <td className="px-2 py-2 text-xs text-muted-foreground">
                  {row.type}
                </td>
                <td className="px-2 py-2">{rowTitle(traces, row)}</td>
                <td className="px-2 py-2 font-mono text-xs">{row.model}</td>
                <td className="px-2 py-2">
                  <Badge tone={LEVEL_TONE[row.level]}>{row.level}</Badge>
                </td>
                <td className="px-2 py-2 text-right font-mono">
                  {formatDuration(row.latencyMs)}
                </td>
                <td className="px-2 py-2 text-right font-mono">
                  {row.tokens === 0 ? "—" : formatTokens(row.tokens)}
                </td>
                <td className="px-2 py-2 text-right font-mono">
                  {row.costUsd === 0 ? "—" : formatCost(row.costUsd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function rowTitle(traces: readonly Trace[], row: ObservationRow): string {
  const trace = traces.find((item) => item.id === row.traceId);
  const span = trace?.spans.find((item) => item.id === row.spanId);
  return span === undefined ? row.name : stepTitle(span);
}

function Filter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      {label}
      <select
        className={cn(
          "rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground",
        )}
        value={value}
        aria-label={label}
        onChange={(event) => {
          const next = options.find(
            (option) => option[0] === event.target.value,
          );
          if (next !== undefined) onChange(next[0]);
        }}
      >
        {options.map(([id, text]) => (
          <option key={id} value={id}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
