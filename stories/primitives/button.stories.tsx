import { Button } from "../../src/ui/button.js";

export default { title: "Primitives / Button" };

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary">Run workflow</Button>
    <Button variant="secondary">Save draft</Button>
    <Button variant="outline">View details</Button>
    <Button variant="ghost">Dismiss</Button>
    <Button variant="link">Learn more</Button>
    <Button variant="destructive">Delete schedule</Button>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg">Large</Button>
    <Button size="icon" aria-label="Refresh">
      ↻
    </Button>
  </div>
);

export const Disabled = () => <Button disabled>Run workflow</Button>;
