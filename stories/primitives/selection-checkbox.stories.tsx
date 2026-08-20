import { SelectionCheckbox } from "../../src/ui/selection-checkbox.js";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "../../src/ui/table.js";
import { useListSelection } from "../../src/hooks/use-list-selection.js";

export default { title: "Primitives / SelectionCheckbox" };

const rows = [
  { id: "run-1", name: "Nightly backfill", status: "Succeeded" },
  { id: "run-2", name: "Invoice sync", status: "Running" },
  { id: "run-3", name: "Weekly digest", status: "Failed" },
];

export const RevealOnHover = () => {
  const selection = useListSelection({ ids: rows.map((row) => row.id) });

  return (
    <Table>
      <TableCaption>Hover or focus a row to reveal its checkbox — a touch device shows it always.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
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
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const Checked = () => (
  <div className="flex items-center gap-4">
    <SelectionCheckbox checked={false} onToggle={() => {}} rowLabel="Nightly backfill" className="opacity-100" />
    <SelectionCheckbox checked onToggle={() => {}} rowLabel="Invoice sync" className="opacity-100" />
  </div>
);
