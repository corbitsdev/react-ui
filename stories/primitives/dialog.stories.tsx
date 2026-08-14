import { Button } from "../../src/ui/button.js";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../src/ui/dialog.js";
import { Input } from "../../src/ui/input.js";

export default { title: "Primitives / Dialog" };

export const Center = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button>Open dialog</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Archive this run?</DialogTitle>
        <DialogDescription>
          Archived runs stay searchable. You can restore them later from the archive.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <DialogClose asChild>
          <Button variant="destructive">Archive</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const RightSheet = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline">Open right sheet</Button>
    </DialogTrigger>
    <DialogContent side="right">
      <DialogHeader>
        <DialogTitle>Run details</DialogTitle>
        <DialogDescription>Inspect the latest attempt without leaving the list.</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-3 text-sm">
        <p>
          Status: <span className="font-medium text-foreground">Succeeded</span>
        </p>
        <p>
          Duration: <span className="font-medium text-foreground">1m 42s</span>
        </p>
        <p>
          Trigger: <span className="font-medium text-foreground">schedule / daily-9am</span>
        </p>
        {Array.from({ length: 40 }, (_, i) => (
          <p key={i} className="text-muted-foreground">
            Step {i + 1}: completed with no warnings.
          </p>
        ))}
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const LeftSheet = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="secondary">Open left sheet</Button>
    </DialogTrigger>
    <DialogContent side="left">
      <DialogHeader>
        <DialogTitle>Filters</DialogTitle>
        <DialogDescription>Narrow the workflow list. Escape or the X closes this sheet.</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-4">
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Owner</span>
          <Input placeholder="team or email" />
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Name contains</span>
          <Input placeholder="invoice" />
        </label>
      </DialogBody>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <DialogClose asChild>
          <Button>Apply</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
