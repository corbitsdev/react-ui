import { Inbox } from "lucide-react";

import { RichEmptyState } from "../../src/ui/rich-empty-state.js";

export default { title: "Primitives / Rich empty state" };

export const WithActions = () => (
  <RichEmptyState
    icon={<Inbox className="size-5" />}
    title="No skills installed yet"
    description="Skills teach agents new tricks. Install one from the catalog or write your own."
    actions={[
      { label: "Browse catalog", variant: "primary" },
      { label: "Write a skill", href: "#" },
    ]}
  />
);

export const MessageOnly = () => (
  <RichEmptyState
    title="Nothing scheduled"
    description="Workflows you schedule will appear here with their next run time."
  />
);
