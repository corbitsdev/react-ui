import { Hash, MessagesSquare, Pin, Settings, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { formatRelativeTime } from "../../src/lib/relative-time.js";
import { Badge } from "../../src/ui/badge.js";
import { SidebarItemRow } from "../../src/ui/sidebar-item-row.js";
import {
  SidebarPanel,
  SidebarPanelBody,
  SidebarPanelFooter,
  SidebarPanelHeader,
  SidebarPanelPins,
} from "../../src/ui/sidebar-panel.js";
import { StatusDot } from "../../src/ui/status-dot.js";

export default { title: "Primitives / Sidebar panel" };

export const ChannelsPanel = () => {
  const [selectedId, setSelectedId] = useState("general");

  return (
    <div className="flex h-[520px] overflow-hidden rounded-lg border border-border">
      <SidebarPanel>
        <SidebarPanelHeader
          title="Channels"
          action={
            <Settings className="size-4 text-muted-foreground" aria-hidden />
          }
        />
        <SidebarPanelPins>
          <SidebarItemRow
            leading={<Pin className="text-muted-foreground" />}
            name="#launch-week"
            selected={selectedId === "launch-week"}
            onSelect={() => setSelectedId("launch-week")}
          />
        </SidebarPanelPins>
        <SidebarPanelBody>
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
              onSelect={() => setSelectedId(channel.id)}
            />
          ))}
          <SidebarItemRow
            leading={<MessagesSquare className="text-muted-foreground" />}
            name="Priya Shah"
            meta={<StatusDot label="Online" tone="emphasis" size="xs" />}
            selected={selectedId === "priya"}
            onSelect={() => setSelectedId("priya")}
          />
        </SidebarPanelBody>
        <SidebarPanelFooter>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
          >
            <Users className="size-4" aria-hidden />
            Invite people
          </button>
        </SidebarPanelFooter>
      </SidebarPanel>
    </div>
  );
};

type RoutineRun = {
  readonly id: string;
  readonly name: string;
  readonly startedAt: string;
  readonly leaving?: boolean;
};

/**
 * Rows arrive live: a new run is unshifted onto the list every few seconds,
 * plays `corbits-row-in` on mount, and the oldest run is marked `leaving`
 * for one frame — playing `corbits-row-out` — before it is actually dropped.
 */
export const LiveRows = () => {
  const [now, setNow] = useState(() => Date.now());
  const [runs, setRuns] = useState<readonly RoutineRun[]>([
    {
      id: "r1",
      name: "Nightly digest",
      startedAt: new Date(Date.now() - 45_000).toISOString(),
    },
    {
      id: "r2",
      name: "Lead enrichment",
      startedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
    },
  ]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let nextId = 3;
    const arrive = setInterval(() => {
      setRuns((current) => [
        {
          id: `r${nextId++}`,
          name: "Inbox triage",
          startedAt: new Date().toISOString(),
        },
        ...current,
      ]);
    }, 4000);
    return () => clearInterval(arrive);
  }, []);

  return (
    <div className="flex h-[520px] overflow-hidden rounded-lg border border-border">
      <SidebarPanel>
        <SidebarPanelHeader title="Routines activity" />
        <SidebarPanelBody>
          {runs.map((run) => (
            <SidebarItemRow
              key={run.id}
              leading={<StatusDot label="Running" tone="emphasis" live />}
              name={run.name}
              meta={
                <time
                  dateTime={run.startedAt}
                  className="font-mono text-xs text-muted-foreground tabular-nums"
                >
                  {formatRelativeTime(run.startedAt, now)}
                </time>
              }
              leaving={run.leaving}
            />
          ))}
        </SidebarPanelBody>
      </SidebarPanel>
    </div>
  );
};
