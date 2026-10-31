import {
  Download,
  ListChecks,
  Maximize2,
  Monitor,
  RotateCw,
  Share,
  Smartphone,
  Tablet,
  TriangleAlert,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { ActionBar, type ActionBarGroup } from "../../src/ui/action-bar.js";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../../src/ui/menu.js";

export default { title: "Primitives / ActionBar" };

const files: ActionBarGroup = [
  { id: "download", label: "Download", icon: <Download aria-hidden="true" /> },
  { id: "share", label: "Share", icon: <Share aria-hidden="true" /> },
];

function Devices() {
  const [device, setDevice] = useState("desktop");
  const devices: ActionBarGroup = [
    { id: "desktop", label: "Desktop", icon: <Monitor aria-hidden="true" /> },
    { id: "tablet", label: "Tablet", icon: <Tablet aria-hidden="true" /> },
    {
      id: "phone",
      label: "Phone",
      icon: <Smartphone aria-hidden="true" />,
    },
  ].map((action) => ({
    ...action,
    active: action.id === device,
    onSelect: () => setDevice(action.id),
  }));
  return <ActionBar label="Preview controls" groups={[devices, files]} />;
}

const screenNames = [
  "overview",
  "invoices",
  "customers",
  "payments",
  "reports",
  "settings",
  "team",
  "billing",
];

function useScreens(): ActionBarGroup {
  const [screen, setScreen] = useState("overview");
  return [
    {
      id: "screens",
      label: "Screens",
      row: screenNames.map((name) => ({
        id: name,
        label: name,
        text: name,
        active: name === screen,
        onSelect: () => setScreen(name),
      })),
    },
  ];
}

function Screens() {
  const screens = useScreens();
  return (
    <div className="w-80">
      <ActionBar label="Mockup controls" groups={[screens, files]} />
    </div>
  );
}

function Prepared() {
  const [prepared, setPrepared] = useState(0);
  return (
    <div className="flex flex-col items-start gap-2 text-sm">
      <ActionBar
        label="File controls"
        groups={[
          [
            {
              id: "download",
              label: "Download",
              icon: <Download aria-hidden="true" />,
              onPrepare: () => setPrepared((count) => count + 1),
            },
          ],
        ]}
      />
      <p className="text-muted-foreground">
        Hover or focus Download to prepare it: prepared {prepared} times.
      </p>
    </div>
  );
}

const versions: ActionBarGroup = [
  {
    id: "version",
    label: "Version",
    text: "v4",
    renderTrigger: (trigger) => (
      <Menu>
        <MenuTrigger asChild>{trigger}</MenuTrigger>
        <MenuContent align="center" side="top">
          <MenuItem>v4 (latest)</MenuItem>
          <MenuItem>v3</MenuItem>
          <MenuItem>v2</MenuItem>
        </MenuContent>
      </Menu>
    ),
  },
];

const status: ActionBarGroup = [
  {
    id: "stale",
    label: "Out of date",
    note: true,
    icon: <TriangleAlert aria-hidden="true" />,
    text: "Out of date",
  },
];

const view: ActionBarGroup = [
  { id: "reload", label: "Reload", icon: <RotateCw aria-hidden="true" /> },
  {
    id: "expand",
    label: "Expand",
    icon: <Maximize2 aria-hidden="true" />,
    disabled: true,
  },
];

const documentGroups = [versions, status, view, files];

function Page({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-80 w-[36rem] overflow-hidden rounded-lg border border-border bg-card p-6 text-sm">
      <h2 className="mb-2 text-base font-semibold">Quarterly plan</h2>
      <p className="text-muted-foreground">
        The bar floats over the foot of the page and collapses to a handle so
        the content under it can be read.
      </p>
      {children}
    </div>
  );
}

function FloatingBar({
  startCollapsed = false,
  groups = documentGroups,
  popover,
}: {
  startCollapsed?: boolean;
  groups?: readonly ActionBarGroup[];
  popover?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(startCollapsed);
  return (
    <Page>
      <ActionBar
        label="Document controls"
        groups={groups}
        placement="floating"
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        popover={popover}
      />
    </Page>
  );
}

function FloatingRow() {
  const screens = useScreens();
  return <FloatingBar groups={[screens, view, files]} />;
}

function WithPopover() {
  const [open, setOpen] = useState(true);
  const checklist: ActionBarGroup = [
    {
      id: "checklist",
      label: "Checklist",
      icon: <ListChecks aria-hidden="true" />,
      active: open,
      onSelect: () => setOpen((shown) => !shown),
    },
  ];
  return (
    <FloatingBar
      groups={[checklist, view, files]}
      popover={
        open ? (
          <div className="w-64 rounded-2xl border border-border bg-background p-3 text-sm">
            <p className="font-medium">Checklist</p>
            <p className="text-muted-foreground">3 of 5 done</p>
          </div>
        ) : undefined
      }
    />
  );
}

export const Groups = () => (
  <ActionBar label="File controls" groups={[view, files]} />
);

export const Active = () => <Devices />;

export const Disabled = () => (
  <ActionBar
    label="File controls"
    groups={[files.map((action) => ({ ...action, disabled: true }))]}
  />
);

export const Note = () => (
  <ActionBar label="Document controls" groups={[status, view]} />
);

export const WithMenu = () => (
  <ActionBar label="Document controls" groups={[versions]} />
);

export const RowOverflow = () => <Screens />;

export const Prepare = () => <Prepared />;

export const Floating = () => <FloatingBar />;

export const FloatingWithRow = () => <FloatingRow />;

export const Popover = () => <WithPopover />;

export const Collapsed = () => <FloatingBar startCollapsed />;

export const Dark = () => <FloatingBar />;
Dark.globals = { theme: "dark" };
