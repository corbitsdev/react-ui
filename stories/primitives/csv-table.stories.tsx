import { useEffect, useMemo, useRef, useState } from "react";

import { useCopy } from "../../src/hooks/use-copy.js";
import { CSV_MAX_PREVIEW_BYTES } from "../../src/lib/csv.js";
import { Button } from "../../src/ui/button.js";
import { CsvTable, csvFilterSpecs } from "../../src/ui/csv-table.js";
import type { CsvFilters, CsvSelection } from "../../src/ui/csv-table.js";
import { FilterBar } from "../../src/ui/filter-bar.js";
import { Input } from "../../src/ui/input.js";

export default { title: "Primitives / CSV Table" };

const statuses = ["Succeeded", "Running", "Failed", ""];
const owners = ["data-platform", "billing", "growth"];
const notes = [
  "Retried after a timeout fetching the source",
  "",
  "Manual run requested by the on-call engineer",
  "Backfill for the March gap",
];

const runsOf = (count: number) =>
  [
    "Run,Owner,Status,Cost,Duration (s),Notes",
    ...Array.from({ length: count }, (_, index) =>
      [
        `run-${String(index + 1).padStart(4, "0")}`,
        owners[index % owners.length],
        statuses[index % statuses.length],
        index % 7 === 0
          ? `"(${(index * 3).toLocaleString("en-US")}.50)"`
          : `$${index * 2}.25`,
        index % 11 === 0 ? "" : String((index * 37) % 900),
        notes[index % notes.length],
      ].join(","),
    ),
  ].join("\n");

// Enough rows to scroll the pane; a sheet past the row cap is covered by the
// unit tests, since thousands of rendered cells stall the accessibility sweep.
const runs = runsOf(40);

export const Static = () => (
  <CsvTable text={runsOf(1200)} caption="Workflow runs" />
);

export const Interactive = () => {
  const [selection, setSelection] = useState<CsvSelection | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <CsvTable
        text={runs}
        caption="Workflow runs"
        interactive
        onSelectionChange={setSelection}
      />
      <pre className="max-h-32 overflow-auto rounded-md bg-muted p-2 font-mono text-xs">
        {selection === null ? "No selection" : selection.toTsv()}
      </pre>
    </div>
  );
};

/** Clicks one cell, then shift-clicks another, as a person would. */
function useStartSelected(from: string, to: string) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cell = (at: string) =>
      host.current?.querySelector(`[data-cell="${at}"]`);
    cell(from)?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    cell(to)?.dispatchEvent(
      new MouseEvent("click", { bubbles: true, shiftKey: true }),
    );
  }, [from, to]);
  return host;
}

export const Selection = () => {
  const host = useStartSelected("2:3", "7:4");
  return (
    <div ref={host}>
      <CsvTable text={runs} caption="Workflow runs" interactive />
    </div>
  );
};

/**
 * The grid has no controls of its own: the host renders search, filters and
 * copy in its bar and drives the grid; the sheet fills the pane, flush.
 */
export const HostControlled = () => {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<CsvFilters>({});
  const [selection, setSelection] = useState<CsvSelection | null>(null);
  const specs = useMemo(() => csvFilterSpecs(runs, filters), [filters]);
  const { copied, copy } = useCopy();
  return (
    <div className="flex h-[40rem] flex-col gap-2">
      <div className="min-h-0 flex-1">
        <CsvTable
          text={runs}
          caption="Workflow runs"
          interactive
          query={query}
          filters={filters}
          onSelectionChange={setSelection}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
        <Input
          type="search"
          className="h-9 w-48"
          value={query}
          placeholder="Search rows"
          aria-label="Search rows"
          onChange={(event) => setQuery(event.target.value)}
        />
        <FilterBar
          filters={specs}
          onChange={(id, value) =>
            setFilters((current) => {
              const { [id]: _, ...rest } = current;
              return value === null ? rest : { ...rest, [id]: value };
            })
          }
        />
        <Button
          variant="outline"
          disabled={selection === null}
          onClick={() => {
            if (selection !== null) void copy(selection.toTsv());
          }}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
};

export const InteractiveRelabelled = () => (
  <CsvTable
    text={runs}
    caption="Workflow runs"
    interactive
    labels={{
      count: (rows, columns) =>
        `${rows.toLocaleString()} records, ${columns.toLocaleString()} fields`,
    }}
  />
);

export const Narrow = () => (
  <div className="w-[390px] p-4">
    <CsvTable text={runs} caption="Workflow runs" interactive />
  </div>
);

export const NoMatches = () => (
  <CsvTable
    text={runs}
    caption="Workflow runs"
    interactive
    query="nothing like this"
  />
);

export const Empty = () => (
  <CsvTable text="name,kind" caption="Header only" interactive />
);

export const TooLarge = () => (
  <CsvTable text={"a,b\n".repeat(CSV_MAX_PREVIEW_BYTES / 4 + 1)} interactive />
);

export const Ragged = () => (
  <CsvTable text={"name,kind\nalpha,a,extra\nbeta"} interactive />
);
