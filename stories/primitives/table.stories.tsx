import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../src/ui/table.js";

export default { title: "Primitives / Table" };

const rows = [
  { name: "Nightly backfill", status: "Succeeded", runs: 128 },
  { name: "Invoice sync", status: "Running", runs: 54 },
  { name: "Weekly digest", status: "Failed", runs: 7 },
];

export const Basic = () => (
  <Table>
    <TableCaption>Recent workflow runs.</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Runs</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.name}>
          <TableCell>{row.name}</TableCell>
          <TableCell>{row.status}</TableCell>
          <TableCell>{row.runs}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
