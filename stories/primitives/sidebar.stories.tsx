import { Inbox } from "lucide-react";
import { useState } from "react";

import {
  Sidebar,
  SidebarCollapseToggle,
  SidebarContent,
  SidebarHeader,
  SidebarItem,
  SidebarSection,
} from "../../src/ui/sidebar.js";
import { SidebarSearch } from "../../src/ui/sidebar-search.js";

export default { title: "Primitives / Sidebar" };

export const WithSearch = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-80">
      <Sidebar collapsed={collapsed}>
        <SidebarHeader>
          <span className="min-w-0 flex-1 truncate text-sm font-medium group-data-[collapsed=true]/sidebar:sr-only">
            Workspace
          </span>
          <SidebarCollapseToggle
            collapsed={collapsed}
            onToggle={() => setCollapsed((current) => !current)}
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarSearch onOpen={() => {}} />
          <SidebarSection label="Pages">
            <SidebarItem active icon={<Inbox />}>
              Inbox
            </SidebarItem>
          </SidebarSection>
        </SidebarContent>
      </Sidebar>
    </div>
  );
};
