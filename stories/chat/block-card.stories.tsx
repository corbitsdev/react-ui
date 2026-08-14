import { BlockCard, RiskBadge } from "../../src/ui/block-card.js";

export default { title: "Chat / Block card" };

export const Default = () => (
  <BlockCard title="Cancel order #4821">
    <p className="text-sm text-muted-foreground">Refunds the customer and releases the reserved inventory.</p>
  </BlockCard>
);

export const RiskLevels = () => (
  <div className="flex flex-col gap-4">
    <BlockCard title="Send campaign">
      <RiskBadge level="low" label="Low risk" note="Reversible within 5 minutes" />
    </BlockCard>
    <BlockCard title="Cancel order #4821">
      <RiskBadge level="medium" label="Medium risk" note="Refund cannot be undone" />
    </BlockCard>
    <BlockCard title="Delete customer record">
      <RiskBadge level="high" label="High risk" note="Permanent, no undo" />
    </BlockCard>
  </div>
);
