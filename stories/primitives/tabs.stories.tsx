import { useState } from "react";

import { Tabs } from "../../src/ui/tabs.js";

export default { title: "Primitives / Tabs" };

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "runs", label: "Runs", count: 12 },
  { id: "settings", label: "Settings" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export const Underline = () => {
  const [active, setActive] = useState<TabId>("overview");
  return (
    <Tabs tabs={tabs} active={active} onChange={setActive} label="Workflow sections">
      {(id) => <p className="text-sm text-muted-foreground">Panel: {id}</p>}
    </Tabs>
  );
};

export const Enclosed = () => {
  const [active, setActive] = useState<TabId>("runs");
  return (
    <Tabs tabs={tabs} active={active} onChange={setActive} label="Workflow sections" variant="enclosed">
      {(id) => <p className="text-sm text-muted-foreground">Panel: {id}</p>}
    </Tabs>
  );
};
