import { DashboardSection } from "../../src/ui/dashboard-section.js";
import { StatGrid, StatGridItem } from "../../src/ui/stat-grid.js";
import { ViewToggle } from "../../src/ui/view-toggle.js";

export default { title: "Primitives / Dashboard section" };

export const Plain = () => (
  <DashboardSection title="Engagement" description="Turns and tool calls over the selected range.">
    <p className="text-sm text-muted-foreground">Chart panels compose here.</p>
  </DashboardSection>
);

export const Highlighted = () => (
  <DashboardSection
    title="At a glance"
    variant="highlighted"
    action={<ViewToggle mode="grid" onChange={() => undefined} />}
  >
    <StatGrid>
      <StatGridItem label="Turns" value="1,284" />
      <StatGridItem label="Tool calls" value="9,102" />
      <StatGridItem label="Tokens" value="4.2M" />
      <StatGridItem label="Tool errors" value="37" danger />
    </StatGrid>
  </DashboardSection>
);
