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

export const Empty = () => (
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
      <TableRow>
        <TableCell colSpan={3} className="text-center text-muted-foreground">
          No workflow runs yet.
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
);

const wideColumns = [
  "Name",
  "Owner",
  "Environment",
  "Trigger",
  "Status",
  "Started",
  "Finished",
  "Duration",
  "Runs",
  "Last error",
];

const wideRows = [
  [
    "Nightly backfill",
    "data-platform",
    "production",
    "schedule",
    "Succeeded",
    "2026-08-14 02:00",
    "2026-08-14 02:14",
    "14m",
    "128",
    "—",
  ],
  [
    "Invoice sync",
    "billing",
    "production",
    "webhook",
    "Running",
    "2026-08-14 09:03",
    "—",
    "9m",
    "54",
    "—",
  ],
  [
    "Weekly digest",
    "growth",
    "staging",
    "manual",
    "Failed",
    "2026-08-13 08:00",
    "2026-08-13 08:02",
    "2m",
    "7",
    "Timed out fetching source",
  ],
];

export const WideContent = () => (
  <Table>
    <TableCaption>Enough columns to force horizontal scroll on a narrow viewport.</TableCaption>
    <TableHeader>
      <TableRow>
        {wideColumns.map((column) => (
          <TableHead key={column} className="whitespace-nowrap">
            {column}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
    <TableBody>
      {wideRows.map((row) => (
        <TableRow key={row[0]}>
          {row.map((cell, index) => (
            <TableCell key={wideColumns[index]} className="whitespace-nowrap">
              {cell}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
