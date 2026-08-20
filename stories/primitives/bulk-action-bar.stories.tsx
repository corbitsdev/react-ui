import { BulkActionBar } from "../../src/ui/bulk-action-bar.js";
import { Button } from "../../src/ui/button.js";
import { SelectionCheckbox } from "../../src/ui/selection-checkbox.js";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../../src/ui/table.js";
import { useListSelection } from "../../src/hooks/use-list-selection.js";

export default { title: "Primitives / BulkActionBar" };

const rows = [
  { id: "run-1", name: "Nightly backfill" },
  { id: "run-2", name: "Invoice sync" },
  { id: "run-3", name: "Weekly digest" },
  { id: "run-4", name: "Customer export" },
];

/** Select a few rows (shift-click for a range) to raise the bar. Escape, or
 * its own Clear button, drops the selection back to zero. */
export const WithASelectableList = () => {
  const selection = useListSelection({ ids: rows.map((row) => row.id) });

  return (
    <div className="pb-20">
      <Table>
        <TableCaption>Shift-click a second row to select the range between them.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="group">
              <TableCell>
                <SelectionCheckbox
                  checked={selection.isSelected(row.id)}
                  onToggle={({ shiftKey }) => selection.toggle(row.id, { shiftKey })}
                  rowLabel={row.name}
                />
              </TableCell>
              <TableCell>{row.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <BulkActionBar count={selection.selectedCount} onClear={selection.clear}>
        <Button size="sm" variant="outline" onClick={selection.clear}>
          Clear
        </Button>
        <Button size="sm" variant="destructive">
          Archive
        </Button>
      </BulkActionBar>
    </div>
  );
};
