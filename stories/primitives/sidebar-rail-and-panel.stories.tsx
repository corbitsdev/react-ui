import { Activity, Bell, Hash, Lock, MessagesSquare, Pin, Settings, User, Users, Workflow } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useSidebarPanel } from "../../src/hooks/use-sidebar-panel.js";
import { formatRelativeTime } from "../../src/lib/relative-time.js";
import { Badge } from "../../src/ui/badge.js";
import { SidebarItemRow } from "../../src/ui/sidebar-item-row.js";
import { SidebarPanel, SidebarPanelBody, SidebarPanelFooter, SidebarPanelHeader, SidebarPanelPins } from "../../src/ui/sidebar-panel.js";
import { SidebarRail, type SidebarRailItem } from "../../src/ui/sidebar-rail.js";
import { SidebarPanelSection } from "../../src/ui/sidebar-section.js";
import { StatusDot } from "../../src/ui/status-dot.js";

export default { title: "Primitives / Sidebar rail + panel" };

const PAGES: readonly SidebarRailItem[] = [
  { id: "channels", label: "Channels", icon: <Hash /> },
  { id: "routines", label: "Routines", icon: <Workflow /> },
  { id: "activity", label: "Activity", icon: <Activity />, badge: <StatusDot label="3 unread" tone="emphasis" size="xs" /> },
];

/**
 * Composition contract, demonstrated: an app owns `SidebarRail`'s `items` and
 * `activeId`/`onSelect`, and swaps what it renders inside `SidebarPanel`
 * based on that same `activeId` — `useSidebarPanel({ activePageId })` is what
 * hands back the `panelKey`/`panelTransitionClassName` pair that replays the
 * page-swap animation when the app does.
 */
function TwoColumnShell({ page, onPageChange, children }: { page: string; onPageChange: (id: string) => void; children: ReactNode }) {
  const { panelKey, panelTransitionClassName } = useSidebarPanel({ activePageId: page });

  return (
    <div className="flex h-[520px] overflow-hidden rounded-lg border border-border">
      <SidebarRail
        items={PAGES}
        activeId={page}
        onSelect={onPageChange}
        footer={
          <>
            <button type="button" aria-label="Notifications" className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bell className="size-5" aria-hidden />
            </button>
            <button type="button" aria-label="Corbits Bench, signed in as Dana" className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              <User className="size-5" aria-hidden />
            </button>
          </>
        }
      />
      <SidebarPanel key={panelKey} className={panelTransitionClassName}>
        {children}
      </SidebarPanel>
    </div>
  );
}

export const ChannelsPanel = () => {
  const [page, setPage] = useState("channels");
  const { selectedId, select, isSectionCollapsed, toggleSection } = useSidebarPanel({ activePageId: page });

  return (
    <TwoColumnShell page={page} onPageChange={setPage}>
      <SidebarPanelHeader title="Channels" action={<Settings className="size-4 text-muted-foreground" aria-hidden />} />
      <SidebarPanelPins>
        <SidebarPanelSection label="Pinned">
          <SidebarItemRow
            leading={<Pin className="text-muted-foreground" />}
            name="#launch-week"
            selected={selectedId === "launch-week"}
            onSelect={() => select("launch-week")}
          />
        </SidebarPanelSection>
      </SidebarPanelPins>
      <SidebarPanelBody>
        <SidebarPanelSection
          label="Channels"
          onAdd={() => undefined}
          collapsed={isSectionCollapsed("channels")}
          onToggleCollapse={() => toggleSection("channels")}
        >
          {[
            { id: "general", name: "general", unread: true },
            { id: "eng", name: "eng", unread: false },
            { id: "design", name: "design", unread: false },
          ].map((channel) => (
            <SidebarItemRow
              key={channel.id}
              leading={<Hash className="text-muted-foreground" />}
              name={channel.name}
              unread={channel.unread}
              meta={channel.unread ? <Badge tone="accent">3</Badge> : undefined}
              selected={selectedId === channel.id}
              onSelect={() => select(channel.id)}
            />
          ))}
        </SidebarPanelSection>

        <SidebarPanelSection
          label="Direct messages"
          collapsed={isSectionCollapsed("dms")}
          onToggleCollapse={() => toggleSection("dms")}
        >
          <SidebarItemRow
            leading={<MessagesSquare className="text-muted-foreground" />}
            name="Priya Shah"
            meta={<StatusDot label="Online" tone="emphasis" size="xs" />}
            selected={selectedId === "priya"}
            onSelect={() => select("priya")}
          />
          <SidebarItemRow
            leading={<MessagesSquare className="text-muted-foreground" />}
            name="Marcus Webb"
            meta={<StatusDot label="Away" tone="neutral" size="xs" />}
            selected={selectedId === "marcus"}
            onSelect={() => select("marcus")}
          />
        </SidebarPanelSection>
      </SidebarPanelBody>
      <SidebarPanelFooter>
        <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted">
          <Users className="size-4" aria-hidden />
          Invite people
        </button>
      </SidebarPanelFooter>
    </TwoColumnShell>
  );
};

type RoutineRun = { readonly id: string; readonly name: string; readonly startedAt: string; readonly leaving?: boolean };

/**
 * Rows arrive live: a new run is unshifted onto the list every few seconds,
 * plays `corbits-row-in` on mount, and the oldest run is marked `leaving`
 * for one frame — playing `corbits-row-out` — before it is actually dropped.
 */
export const RoutinesActivity = () => {
  const [page] = useState("routines");
  const [now, setNow] = useState(() => Date.now());
  const [runs, setRuns] = useState<readonly RoutineRun[]>([
    { id: "r1", name: "Nightly digest", startedAt: new Date(Date.now() - 45_000).toISOString() },
    { id: "r2", name: "Lead enrichment", startedAt: new Date(Date.now() - 3 * 60_000).toISOString() },
  ]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let nextId = 3;
    const arrive = setInterval(() => {
      setRuns((current) => [{ id: `r${nextId++}`, name: "Inbox triage", startedAt: new Date().toISOString() }, ...current]);
    }, 4000);
    return () => clearInterval(arrive);
  }, []);

  return (
    <TwoColumnShell page={page} onPageChange={() => undefined}>
      <SidebarPanelHeader title="Routines activity" />
      <SidebarPanelBody>
        <SidebarPanelSection label="Running now">
          {runs.map((run) => (
            <SidebarItemRow
              key={run.id}
              leading={<StatusDot label="Running" tone="emphasis" live />}
              name={run.name}
              meta={<time dateTime={run.startedAt} className="font-mono text-xs text-muted-foreground tabular-nums">{formatRelativeTime(run.startedAt, now)}</time>}
              leaving={run.leaving}
            />
          ))}
        </SidebarPanelSection>
      </SidebarPanelBody>
    </TwoColumnShell>
  );
};

export const PinsSection = () => {
  const [page] = useState("activity");
  const { selectedId, select } = useSidebarPanel({ activePageId: page });

  return (
    <TwoColumnShell page={page} onPageChange={() => undefined}>
      <SidebarPanelHeader title="Activity" />
      <SidebarPanelPins>
        <SidebarPanelSection label="Pins">
          <SidebarItemRow leading={<Pin className="text-primary-emphasis" />} name="Q3 roadmap" selected={selectedId === "roadmap"} onSelect={() => select("roadmap")} />
          <SidebarItemRow leading={<Pin className="text-primary-emphasis" />} name="Incident #482" meta={<Badge tone="danger">Open</Badge>} selected={selectedId === "incident"} onSelect={() => select("incident")} />
        </SidebarPanelSection>
      </SidebarPanelPins>
      <SidebarPanelBody>
        <SidebarPanelSection label="Recent">
          <SidebarItemRow leading={<Lock className="text-muted-foreground" />} name="Access review" onSelect={() => select("access-review")} />
        </SidebarPanelSection>
      </SidebarPanelBody>
    </TwoColumnShell>
  );
};
