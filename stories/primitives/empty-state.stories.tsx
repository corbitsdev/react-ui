import { Button } from "../../src/ui/button.js";
import { EmptyState } from "../../src/ui/empty-state.js";

export default { title: "Primitives / Empty state" };

export const Basic = () => <EmptyState title="No workflows yet" />;

export const WithDescriptionAndAction = () => (
  <EmptyState
    title="No workflows match these filters"
    description="Try a broader date range or clear a filter to see more."
    action={<Button size="sm">Clear filters</Button>}
  />
);
