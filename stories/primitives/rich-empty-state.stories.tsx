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

/** `actionSize="sm"` matches a stage empty-state to a denser host chrome, e.g. a top bar. */
export const CompactActions = () => (
  <RichEmptyState
    icon={<Inbox className="size-5" />}
    title="No runs yet"
    description="Trigger a run from the top bar to see it appear here."
    actionSize="sm"
    actions={[{ label: "Run now", variant: "primary" }]}
  />
);
