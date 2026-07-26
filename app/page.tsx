"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BarChart2, Inbox, Workflow } from "lucide-react";
import { useState } from "react";

import { DataPortProvider } from "@/registry/corbits/lib/data-port";
import { createTanstackDataPort } from "@/registry/corbits/lib/tanstack-data-port";
import { Badge } from "@/registry/corbits/ui/badge";
import { BootScreen } from "@/registry/corbits/ui/boot-screen";
import { Button } from "@/registry/corbits/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/registry/corbits/ui/card";
import { DataTable } from "@/registry/corbits/ui/data-table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/corbits/ui/dialog";
import type { AgentIdentity, ChatMessage, ChatThreadSummary, SubagentRun } from "@/registry/corbits/lib/chat-message";
import type { NowItem } from "@/registry/corbits/lib/now-item";
import type { Schedule } from "@/registry/corbits/lib/schedule";
import { CommandRegistryProvider, useCommands, useRegisterCommands } from "@/registry/corbits/lib/command-registry";
import { ChatInput } from "@/registry/corbits/ui/chat-input";
import type { CommandAction } from "@/registry/corbits/ui/command";
import { CommandPalette, useCommandShortcut } from "@/registry/corbits/ui/command-palette";
import type { Artifact } from "@/registry/corbits/lib/artifact";
import { AddArtifactDialog } from "@/registry/corbits/ui/add-artifact-dialog";
import { AnimatedNumber } from "@/registry/corbits/ui/animated-number";
import { ArtifactBody } from "@/registry/corbits/ui/artifact-body";
import { ArtifactDetail } from "@/registry/corbits/ui/artifact-detail";
import { ArtifactGallery } from "@/registry/corbits/ui/artifact-gallery";
import { ArtifactNotice } from "@/registry/corbits/ui/artifact-notice";
import { BarChart } from "@/registry/corbits/ui/bar-chart";
import type { ActivityEntry } from "@/registry/corbits/lib/activity";
import { AccessNotice } from "@/registry/corbits/blocks/access-notice/access-notice";
import { AuthLayout } from "@/registry/corbits/blocks/login/auth-layout";
import { LoginForm } from "@/registry/corbits/blocks/login/login-form";
import { QuoteCard } from "@/registry/corbits/ui/quote-card";
import { ActivityTimeline } from "@/registry/corbits/ui/activity-timeline";
import { ActorSummary } from "@/registry/corbits/ui/actor-summary";
import { CountTable } from "@/registry/corbits/ui/count-table";
import { Dashboard, DashboardSkeleton } from "@/registry/corbits/ui/dashboard";
import { MomentWalker } from "@/registry/corbits/ui/moment-walker";
import { FilterBar } from "@/registry/corbits/ui/filter-bar";
import { Tabs } from "@/registry/corbits/ui/tabs";
import { TimeRangeControl } from "@/registry/corbits/ui/time-range-control";
import type { DateRange, TimeRangePreset } from "@/registry/corbits/lib/time-range";
import { resolveTimeRange } from "@/registry/corbits/lib/time-range";
import { Sparkline } from "@/registry/corbits/ui/sparkline";
import { StatGrid, StatTile } from "@/registry/corbits/ui/stat-tile";
import { TimeSeriesChart } from "@/registry/corbits/ui/time-series-chart";
import { CatalogGlyph } from "@/registry/corbits/ui/catalog-glyph";
import { ConfirmButton } from "@/registry/corbits/ui/confirm-button";
import { CorbitsMark } from "@/registry/corbits/ui/corbits-mark";
import { EmptyState } from "@/registry/corbits/ui/empty-state";
import { FileInput } from "@/registry/corbits/ui/file-input";
import { ListDetail } from "@/registry/corbits/ui/list-detail";
import { PageShell } from "@/registry/corbits/ui/page-shell";
import { Pagination } from "@/registry/corbits/ui/pagination";
import { SectionNav, SectionNavLayout } from "@/registry/corbits/ui/section-nav";
import { ProgressChecklist } from "@/registry/corbits/ui/progress-checklist";
import { OnboardingTour } from "@/registry/corbits/ui/onboarding-tour";
import { Skeleton } from "@/registry/corbits/ui/skeleton";
import { SortableTable } from "@/registry/corbits/ui/sortable-table";
import { ViewToggle, type ViewMode } from "@/registry/corbits/ui/view-toggle";
import { WhatsNewDialog, WhatsNewPopup, WhatsNewSection, type ReleaseNote } from "@/registry/corbits/ui/whats-new";
import { Dial } from "@/registry/corbits/ui/dial";
import { IntakeForm } from "@/registry/corbits/ui/intake-form";
import { ManagedList } from "@/registry/corbits/ui/managed-list";
import { RunNowButton } from "@/registry/corbits/ui/run-now-button";
import { ScheduleFlow, type ScheduleDraft } from "@/registry/corbits/ui/schedule-flow";
import { ScheduleList } from "@/registry/corbits/ui/schedule-list";
import { SettingsPanel } from "@/registry/corbits/ui/settings-panel";
import { ToggleList, type ToggleItem } from "@/registry/corbits/ui/toggle-list";
import { ChatPanel, ChatPanelFooter, ChatPanelHeader } from "@/registry/corbits/ui/chat-panel";
import { ChatThread } from "@/registry/corbits/ui/chat-thread";
import { QuickReplyChips } from "@/registry/corbits/ui/quick-reply-chips";
import { SubagentDock } from "@/registry/corbits/ui/subagent-dock";
import { ThreadList } from "@/registry/corbits/ui/thread-list";
import { ThreadSwitcher } from "@/registry/corbits/ui/thread-switcher";
import type { WorkflowRunSummary } from "@/registry/corbits/lib/workflow-run";
import { ApprovalCard } from "@/registry/corbits/ui/approval-card";
import { CommandQueue } from "@/registry/corbits/ui/command-queue";
import { ContextPills, ContextStrip, type ContextRef } from "@/registry/corbits/ui/context-strip";
import { Input } from "@/registry/corbits/ui/input";
import { MailDetail, type MailItem } from "@/registry/corbits/ui/mail-detail";
import { NotificationsBell } from "@/registry/corbits/ui/notifications-bell";
import { NowCards, NowSection } from "@/registry/corbits/ui/now-cards";
import { ProviderMark, ToolProviderMark } from "@/registry/corbits/ui/provider-mark";
import { ReconnectingOverlay } from "@/registry/corbits/ui/reconnecting-overlay";
import { RunOnceFlow } from "@/registry/corbits/ui/run-once-flow";
import { Section } from "@/registry/corbits/ui/section";
import {
  Sidebar,
  SidebarCollapseToggle,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarSection,
} from "@/registry/corbits/ui/sidebar";
import { TenantSelector } from "@/registry/corbits/ui/tenant-selector";
import { TopBar, TopBarActions, TopBarBreadcrumbs } from "@/registry/corbits/ui/top-bar";
import { WorkflowCatalog, type WorkflowOffering } from "@/registry/corbits/ui/workflow-catalog";
import { WorkflowDock } from "@/registry/corbits/ui/workflow-dock";
import { Toaster, toast } from "@/registry/corbits/ui/toast";

type Run = { id: string; workflow: string; state: string };

const RUNS: readonly Run[] = [
  { id: "run_01", workflow: "inbox-triage", state: "succeeded" },
  { id: "run_02", workflow: "daily-brief", state: "running" },
];

// A fixture port's worth of data: one page, no next offset. Proves the seam
// takes any fetcher, not just an HTTP one.
const request = { key: ["runs"], fetch: async () => ({ items: RUNS, nextOffset: null }) };

const COLUMNS = [
  { header: "Run", cell: (row: Run) => <span className="font-mono">{row.id}</span> },
  { header: "Workflow", cell: (row: Run) => row.workflow },
  { header: "State", cell: (row: Run) => row.state },
];

const TENANTS = [
  { id: "acme", name: "Acme" },
  { id: "globex", name: "Globex" },
  { id: "initech", name: "Initech" },
];

function SidebarShowcase() {
  const [collapsed, setCollapsed] = useState(false);
  const [tenantId, setTenantId] = useState("acme");

  return (
    <div className="h-[22rem] overflow-hidden rounded-lg border border-border">
      <Sidebar collapsed={collapsed} className="border-r-0">
        <SidebarHeader>
          <span className="text-sm font-semibold group-data-[collapsed=true]/sidebar:sr-only">Workbench</span>
          <Badge tone="accent" className="group-data-[collapsed=true]/sidebar:sr-only">
            Staging
          </Badge>
          <SidebarCollapseToggle
            collapsed={collapsed}
            onToggle={() => setCollapsed((value) => !value)}
            className="ml-auto"
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarSection label="Work">
            <SidebarItem href="#inbox" active icon={<Inbox />} count={3}>
              Inbox
            </SidebarItem>
            <SidebarItem href="#workflows" icon={<Workflow />}>
              Workflows
            </SidebarItem>
            <SidebarItem href="#insights" icon={<BarChart2 />}>
              Insights
            </SidebarItem>
          </SidebarSection>
        </SidebarContent>
        <SidebarFooter className="group-data-[collapsed=true]/sidebar:hidden">
          <TenantSelector tenants={TENANTS} activeId={tenantId} onSelect={setTenantId} label="Workbench" />
        </SidebarFooter>
      </Sidebar>
    </div>
  );
}

const CONTEXTS: readonly ContextRef[] = [
  { id: "art_01", kind: "Artifact", label: "Q3 pipeline review" },
  { id: "run_02", kind: "Run", label: "daily-brief" },
];

function TopBarShowcase() {
  const [attached, setAttached] = useState<readonly ContextRef[]>(CONTEXTS);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border">
      <TopBar className="border-b-0">
        <TopBarBreadcrumbs
          crumbs={[
            { label: "Workbench", href: "#root" },
            { label: "Workflows", href: "#workflows" },
            { label: "daily-brief" },
          ]}
        />
        <ContextStrip context={{ id: "art_01", kind: "Artifact", label: "Q3 pipeline review", href: "#artifact" }} />
        <TopBarActions>
          <NotificationsBell count={4}>
            <p className="p-2 text-sm text-muted-foreground">Two runs finished and one gate needs you.</p>
          </NotificationsBell>
        </TopBarActions>
      </TopBar>
      <ContextPills
        className="px-4 pb-3"
        items={attached}
        onRemove={(item) => setAttached((items) => items.filter((candidate) => candidate.id !== item.id))}
      />
    </div>
  );
}

const ARTIFACT_NOW = Date.parse("2026-07-25T18:00:00.000Z");

const ARTIFACTS: readonly Artifact[] = [
  {
    id: "art_01",
    title: "Q3 pipeline review",
    kind: "one-pager",
    content:
      "Pipeline coverage sits at 2.8x against a 3.0x target.\n\nThe gap is concentrated in mid-market, where two of the four largest opportunities slipped a quarter.",
    createdAt: "2026-07-24T09:00:00.000Z",
    ownerName: "Dana Reyes",
  },
  {
    id: "art_02",
    title: "Territory export",
    kind: "csv-export",
    content: "Region,Accounts,Coverage\nEMEA,142,3.1\nAMER,209,2.6\nAPAC,88,2.9",
    createdAt: "2026-07-24T11:30:00.000Z",
    ownerName: "Dana Reyes",
    downloadUrl: "#download",
  },
  {
    id: "art_03",
    title: "Subject line A/B",
    kind: "ab-comparison",
    content: JSON.stringify({
      winnerId: "b",
      rationale: "B doubled reply rate without hurting opens.",
      variants: [
        { id: "a", label: "Variant A", content: "Quick question about your Q3 pipeline" },
        { id: "b", label: "Variant B", content: "Your coverage gap, in one chart" },
      ],
      criteria: [
        { label: "Open rate", scores: { a: 41, b: 44 } },
        { label: "Reply rate", scores: { a: 3, b: 7 } },
      ],
    }),
    createdAt: "2026-07-23T14:00:00.000Z",
  },
  {
    id: "art_04",
    title: "Category research brief",
    kind: "research",
    content: JSON.stringify({
      topic: "Agentic workspaces, last 90 days",
      sourceCount: 12,
      itemCount: 318,
      range: "Apr 26 – Jul 25",
      leadInsight: "Buyers have stopped asking whether agents work and started asking who is accountable when they do not.",
      clusters: [
        {
          id: "c1",
          title: "Approval gates are the new table stakes",
          summary: "Every serious deployment thread converges on human sign-off before external side effects.",
          sources: ["Forums", "Blogs"],
          items: [{ url: "https://example.com/a", title: "We shipped agents behind a review queue" }],
        },
      ],
      quotes: [{ quote: "The agent is not the product. The audit trail is.", author: "R. Patel", source: "Forums", url: "https://example.com/q" }],
      citations: [{ url: "https://example.com/a", title: "We shipped agents behind a review queue", source: "Forums" }],
    }),
    createdAt: "2026-07-22T08:00:00.000Z",
  },
  {
    id: "art_05",
    title: "Launch deck",
    kind: "presentation",
    content: "https://example.com/deck/launch",
    createdAt: "2026-07-21T16:45:00.000Z",
    ownerName: "Kofi Mensah",
  },
];

const artifactRequest = {
  key: ["artifacts"],
  fetch: async () => ({ items: ARTIFACTS, nextOffset: null }),
};

function ArtifactsShowcase() {
  const [view, setView] = useState<ViewMode>("grid");
  const [open, setOpen] = useState<Artifact | null>(ARTIFACTS[0] ?? null);
  const [adding, setAdding] = useState(false);

  return (
    <Section
      title="Artifacts"
      description="Gallery, kind renderers and the detail frame — all fed by props or a DataPort."
      action={<ViewToggle mode={view} onChange={setView} />}
    >
      <ArtifactGallery
        request={artifactRequest}
        viewMode={view}
        now={ARTIFACT_NOW}
        onOpen={setOpen}
        action={<Button size="sm" onClick={() => setAdding(true)}>Add artifact</Button>}
      />
      <Button variant="outline" size="sm" className="self-start" onClick={() => setAdding(true)}>
        Add artifact
      </Button>
      <AddArtifactDialog open={adding} onOpenChange={setAdding} onSubmit={async () => {
          toast("Artifact added");
        }} />
      {open === null ? null : (
        <div className="h-[32rem] overflow-hidden rounded-lg border border-border">
          <ArtifactDetail
            artifact={open}
            now={ARTIFACT_NOW}
            actions={
              <Button variant="outline" size="sm" onClick={() => setOpen(null)}>
                Close
              </Button>
            }
            rail={
              <dl className="flex flex-col gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Kind</dt>
                  <dd className="font-mono">{open.kind}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Owner</dt>
                  <dd>{open.ownerName ?? "—"}</dd>
                </div>
              </dl>
            }
          >
            <ArtifactBody artifact={open} />
          </ArtifactDetail>
        </div>
      )}
      <ArtifactNotice pending />
    </Section>
  );
}

const MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"] as const;

function AnalyticsShowcase() {
  return (
    <Section title="Analytics" description="Chart primitives on the validated series palette — legend, direct labels and a data table on every one.">
      <StatGrid>
        <StatTile label="Runs completed" value="12,904" delta={{ value: 812, period: "vs last week", upIsGood: true }} trend={[8, 9, 11, 10, 13, 14, 16, 15, 18, 19, 21, 23]} />
        <StatTile label="Failure rate" value="1.8%" delta={{ value: 0.4, period: "vs last week", upIsGood: false, format: (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}pt` }} />
        <StatTile label="Median latency" value="1.4s" delta={{ value: 0, period: "vs last week", upIsGood: false }} />
        <StatTile label="Approvals pending" value="7" />
      </StatGrid>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Standalone sparkline</span>
        <Sparkline values={[4, 6, 5, 9, 8, 12, 11, 15]} summary="Throughput rising over the last eight periods" />
      </div>

      <BarChart
        title="Runs by workflow"
        description="Last 30 days."
        valueLabel="Runs"
        data={[
          { label: "inbox-triage", value: 4820 },
          { label: "daily-brief", value: 3110 },
          { label: "deal-research", value: 1940 },
          { label: "call-summary", value: 880 },
          { label: "cleanup", value: 214 },
        ]}
      />

      <TimeSeriesChart
        title="Runs over time"
        description="Hover, or focus the plot and use the arrow keys."
        labels={[...MONTHS]}
        series={[
          { label: "Succeeded", values: [820, 940, 1120, 1080, 1340, 1520] },
          { label: "Failed", values: [64, 51, 88, 42, 39, 31] },
          { label: "Cancelled", values: [12, 20, 9, 26, 14, 11] },
        ]}
      />
    </Section>
  );
}

const INSIGHT_TABS = [
  { id: "overview", label: "Overview" },
  { id: "workflows", label: "Workflows", count: 5 },
  { id: "people", label: "People" },
] as const;

function InsightsShowcase() {
  const [tab, setTab] = useState<(typeof INSIGHT_TABS)[number]["id"]>("overview");
  const [preset, setPreset] = useState<TimeRangePreset>("30d");
  const [custom, setCustom] = useState<DateRange>({});
  const [kind, setKind] = useState<string | null>(null);
  const [actor, setActor] = useState<string | null>("me");
  const [loading, setLoading] = useState(false);

  const range = resolveTimeRange(preset, custom, ARTIFACT_NOW);

  return (
    <Section title="Insights" description="Dashboard shell, tabs, shared scope controls and the loading state.">
      <Button variant="outline" size="sm" className="self-start" onClick={() => setLoading((value) => !value)}>
        {loading ? "Show the dashboard" : "Show the loading state"}
      </Button>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <Dashboard
          title="Insights"
          description={range.from === undefined ? "All time." : `From ${range.from}${range.to === undefined ? "" : ` to ${range.to}`}.`}
          actions={<Button variant="outline" size="sm">Export</Button>}
          controls={
            <FilterBar
              filters={[
                {
                  id: "kind",
                  label: "Kind",
                  anyLabel: "All kinds",
                  value: kind,
                  options: [
                    { value: "brief", label: "Daily brief" },
                    { value: "triage", label: "Inbox triage" },
                  ],
                },
                {
                  id: "actor",
                  label: "Actor",
                  anyLabel: "Everyone",
                  value: actor,
                  options: [
                    { value: "me", label: "Just me" },
                    { value: "others", label: "Others" },
                  ],
                },
              ]}
              onChange={(id, value) => (id === "kind" ? setKind(value) : setActor(value))}
            >
              <TimeRangeControl preset={preset} onPresetChange={setPreset} custom={custom} onCustomChange={setCustom} />
            </FilterBar>
          }
        >
          <Tabs tabs={INSIGHT_TABS} active={tab} onChange={setTab} label="Insights sections">
            {(active) =>
              active === "overview" ? (
                <StatGrid>
                  <StatTile label="Runs completed" value="12,904" delta={{ value: 812, period: "vs last period", upIsGood: true }} />
                  <StatTile label="Spend" value="$4,210" delta={{ value: -340, period: "vs last period", upIsGood: false }} />
                  <StatTile label="Active people" value="38" />
                </StatGrid>
              ) : active === "workflows" ? (
                <BarChart
                  title="Runs by workflow"
                  valueLabel="Runs"
                  data={[
                    { label: "inbox-triage", value: 4820 },
                    { label: "daily-brief", value: 3110 },
                    { label: "deal-research", value: 1940 },
                  ]}
                />
              ) : (
                <EmptyState title="No people in this window" description="Widen the time range or clear a filter." />
              )
            }
          </Tabs>
        </Dashboard>
      )}
    </Section>
  );
}

const MOMENTS: readonly ActivityEntry[] = [
  { id: "m1", timestamp: "2026-07-25T09:12:00.000Z", kind: "run.started", summary: "daily-brief started on schedule.", actorName: "Scheduler" },
  { id: "m2", timestamp: "2026-07-25T09:12:40.000Z", kind: "tool.called", summary: "Fetched 214 inbox threads.", actorName: "Oat", tone: "neutral" },
  { id: "m3", timestamp: "2026-07-25T09:14:02.000Z", kind: "approval.requested", summary: "Waiting on a human before sending.", actorName: "Oat", tone: "warning" },
  { id: "m4", timestamp: "2026-07-25T09:31:11.000Z", kind: "approval.granted", summary: "Dana approved the send.", actorName: "Dana Reyes", tone: "positive" },
  { id: "m5", timestamp: "2026-07-24T17:02:00.000Z", kind: "run.failed", summary: "Upstream timed out after three retries.", actorName: "Oat", tone: "critical" },
];

const activityRequest = {
  key: ["activity"],
  fetch: async () => ({ items: MOMENTS, nextOffset: null }),
};

function ActorShowcase() {
  const [moment, setMoment] = useState(0);

  return (
    <Section title="Actors and activity" description="Who did what, when — the feed, the walker, and the ranked tallies.">
      <ActorSummary
        name="Dana Reyes"
        role="Member · approver"
        stats={[
          { label: "Runs", value: "1,204" },
          { label: "Approvals", value: "38" },
          { label: "Median latency", value: "1.4s" },
        ]}
        facets={[
          { label: "Permissions", values: ["read", "write", "approve"] },
          { label: "Teams", values: ["Revenue", "Ops"] },
          { label: "Tools", values: [] },
        ]}
        actions={<Button variant="outline" size="sm">Message</Button>}
      />

      <MomentWalker moments={MOMENTS} index={moment} onIndexChange={setMoment} now={ARTIFACT_NOW} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ActivityTimeline request={activityRequest} label="Dana's activity" now={ARTIFACT_NOW} />
        <CountTable
          caption="Workflow kind"
          countLabel="Runs"
          rows={[
            { label: "inbox-triage", count: 4820 },
            { label: "daily-brief", count: 3110 },
            { label: "deal-research", count: 1940 },
            { label: "call-summary", count: 880 },
            { label: "cleanup", count: 214 },
          ]}
        />
      </div>

      <SortableTable
        caption="People"
        rows={[
          { id: "p1", name: "Dana Reyes", runs: 1204, approvals: 38 },
          { id: "p2", name: "Kofi Mensah", runs: 812, approvals: 12 },
          { id: "p3", name: "Mei Sato", runs: 2044, approvals: 61 },
        ]}
        rowKey={(row) => row.id}
        initialSort={{ key: "runs", direction: "desc" }}
        columns={[
          { key: "name", header: "Person", cell: (row) => row.name, sortValue: (row) => row.name },
          { key: "runs", header: "Runs", align: "right", cell: (row) => row.runs.toLocaleString(), sortValue: (row) => row.runs },
          { key: "approvals", header: "Approvals", align: "right", cell: (row) => row.approvals.toLocaleString(), sortValue: (row) => row.approvals },
        ]}
      />
    </Section>
  );
}

const QUOTES = [
  { text: "Stop prompting and start operating.", author: "The product" },
  { text: "An audit trail is a feature, not paperwork." },
];

function AuthShowcase() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Section title="Blocks" description="Whole pages you install and own. Callbacks injected — the block never authenticates.">
      <div className="h-[34rem] overflow-hidden rounded-lg border border-border">
        <AuthLayout
          className="h-full min-h-0"
          brand={
            <>
              <span className="grid size-7 place-items-center rounded-sm bg-primary text-primary-foreground">
                <CorbitsMark className="size-4" />
              </span>
              Workbench
            </>
          }
          aside={<QuoteCard quotes={QUOTES} storageKey="corbits-ui-demo-quote" />}
        >
          <LoginForm
            busy={busy}
            error={error}
            providers={[{ id: "sso", label: "Continue with SSO" }]}
            onProvider={(id) => setError(`No handler wired for "${id}".`)}
            onSubmit={() => {
              setError(null);
              setBusy(true);
              window.setTimeout(() => setBusy(false), 800);
            }}
            footer={<a href="#reset" className="underline-offset-2 hover:underline">Forgot your password?</a>}
          />
        </AuthLayout>
      </div>

      <div className="h-[22rem] overflow-hidden rounded-lg border border-border">
        <AccessNotice
          className="h-full min-h-0"
          title="You do not have a workspace yet"
          description="An administrator has to add you before there is anything here. Once they do, this page becomes your dashboard."
          actions={
            <>
              <Button variant="outline" size="sm">Contact an administrator</Button>
              <Button variant="ghost" size="sm">Sign out</Button>
            </>
          }
        />
      </div>
    </Section>
  );
}

function ChromeShowcase() {
  const [reconnecting, setReconnecting] = useState(false);

  return (
    <Section
      title="App chrome"
      description="Boot surface, reconnect cover and section headings."
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setReconnecting(true);
            window.setTimeout(() => setReconnecting(false), 2000);
          }}
        >
          Simulate reconnect
        </Button>
      }
      count={3}
    >
      <div className="relative h-48 overflow-hidden rounded-lg border border-border">
        <BootScreen message="Loading workbench" brand={<span className="text-xs font-semibold">CORBITS</span>} footer="v0.1.0" />
      </div>
      <ReconnectingOverlay open={reconnecting} message="Reconnecting…" footer="v0.1.0" />
    </Section>
  );
}

// Fixed clock: relative times must render identically on the server and in the
// browser, or hydration disagrees about the string.
const NOW = Date.parse("2026-07-25T12:00:00.000Z");

const NOW_ITEMS: readonly NowItem[] = [
  {
    type: "gate",
    id: "gate_01",
    title: "Send the Q3 pipeline brief to sales@",
    summary: "Drafted from Tuesday's call notes. Nothing leaves until you say so.",
    classification: "Approval",
    priority: "now",
    status: "needs-action",
    when: "2026-07-25T11:48:00.000Z",
    action: "Review",
    href: "#gate_01",
  },
  {
    type: "mail",
    id: "mail_02",
    title: "Morning brief: 4 accounts moved",
    summary: "Two upgrades, one churn risk, one stalled renewal.",
    classification: "Brief",
    priority: "next",
    status: "needs-action",
    when: "2026-07-25T07:02:00.000Z",
    from: "briefs@corbits.dev",
    read: false,
  },
  {
    type: "mail",
    id: "mail_03",
    title: "Workflow run failed: enrich-accounts",
    classification: "Failure",
    priority: "now",
    status: "done",
    when: "2026-07-24T22:15:00.000Z",
    from: "runs@corbits.dev",
    read: true,
  },
];

const queueRequest = { key: ["now-items"], fetch: async () => ({ items: NOW_ITEMS, nextOffset: null }) };

const MAIL_REFS: readonly ContextRef[] = [
  { id: "run_02", kind: "Run", label: "daily-brief", href: "#run_02" },
  { id: "ISSUE-482", kind: "Issue", label: "Inbox detail drawer", href: "https://example.com/ISSUE-482", external: true },
];

function InboxShowcase() {
  const [selectedId, setSelectedId] = useState<string | null>("gate_01");
  const [openMail, setOpenMail] = useState<MailItem | null>(null);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <NowSection count={NOW_ITEMS.length}>
        <NowCards items={NOW_ITEMS} selectedId={selectedId} now={NOW} />
      </NowSection>
      <CommandQueue
        request={queueRequest}
        selectedId={selectedId}
        onOpen={(item) => {
          setSelectedId(item.id);
          setOpenMail(item.type === "mail" ? item : null);
        }}
        now={NOW}
      />

      <Dialog open={openMail !== null} onOpenChange={(open) => (open ? undefined : setOpenMail(null))}>
        <DialogContent side="right">
          {openMail === null ? null : (
            <MailDetail
              item={openMail}
              body={openMail.summary ?? "No body."}
              refs={MAIL_REFS}
              now={NOW}
              actions={
                <>
                  <Button variant="outline" size="sm">
                    Archive
                  </Button>
                  <DialogClose asChild>
                    <Button size="sm">Mark done</Button>
                  </DialogClose>
                </>
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const RUNS_ACTIVE: readonly WorkflowRunSummary[] = [
  { runId: "run_11", title: "Daily brief", status: "awaiting", startedAt: "2026-07-25T11:40:00.000Z" },
  { runId: "run_12", title: "Enrich accounts", status: "running", startedAt: "2026-07-25T11:55:00.000Z" },
  { runId: "run_13", title: "Pipeline sync", status: "completed", startedAt: "2026-07-25T09:00:00.000Z" },
];

const OFFERINGS: readonly WorkflowOffering[] = [
  {
    kind: "daily-brief",
    title: "Daily brief",
    description: "Summarise overnight account movement and send it to your inbox.",
    tags: ["Scheduled"],
    favorite: true,
    fields: [
      { name: "audience", label: "Send to", type: "text", required: true, placeholder: "you@example.com" },
      {
        name: "depth",
        label: "Depth",
        type: "select",
        options: [
          { value: "short", label: "Headlines only" },
          { value: "full", label: "Full detail" },
        ],
        help: "Headlines fit in a notification; full detail reads like a memo.",
      },
      { name: "includeCharts", label: "Include charts", type: "boolean" },
    ],
  },
  {
    kind: "enrich-accounts",
    title: "Enrich accounts",
    description: "Fill in firmographics for accounts missing them.",
    fields: [],
  },
];

const runsRequest = { key: ["active-runs"], fetch: async () => ({ items: RUNS_ACTIVE, nextOffset: null }) };
const catalogRequest = { key: ["offerings"], fetch: async () => ({ items: OFFERINGS, nextOffset: null }) };

function WorkflowShowcase() {
  const [selectedKind, setSelectedKind] = useState<string | null>("daily-brief");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [approvalState, setApprovalState] = useState<"idle" | "approving">("idle");

  return (
    <Section title="Workflows" description="Active runs, the catalog, and the decision surface.">
      <WorkflowDock request={runsRequest} selectedId="run_11" now={NOW} />

      <WorkflowCatalog
        request={catalogRequest}
        selectedKind={selectedKind}
        onSelect={(offering) => setSelectedKind(offering.kind)}
        onToggleFavorite={() => {}}
        renderDetail={(offering) => (
          <RunOnceFlow
            fields={offering.fields ?? []}
            values={values}
            onValuesChange={setValues}
            onRun={() => {}}
            onCancel={() => setSelectedKind(null)}
          />
        )}
      />

      <ApprovalCard
        request={{
          id: "apr_01",
          headline: "Post the Q3 brief to #sales (Slack)",
          requestedBy: "briefing agent",
          actionKey: "slack__post_message",
          details: [
            { label: "Channel", value: "#sales" },
            {
              label: "Message",
              value:
                "Q3 pipeline moved 4 accounts this week: two upgrades, one churn risk and one stalled renewal. Full detail in the brief attached to this thread, including the account-level notes gathered from Tuesday's call.",
            },
          ],
        }}
        state={approvalState}
        onApprove={() => setApprovalState("approving")}
        onReject={() => {}}
        onAllowAlways={() => {}}
      />
    </Section>
  );
}

// The agent is named by the host, not by the registry. "Ada" here is fixture
// data — no component in this family knows or cares what it is called.
const AGENT: AgentIdentity = { name: "Ada", tagline: "Workbench agent" };

const MESSAGES: readonly ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    createdAt: "2026-07-25T11:50:00.000Z",
    status: "sent",
    parts: [{ type: "text", text: "What moved in the pipeline this week?" }],
  },
  {
    id: "m2",
    role: "agent",
    createdAt: "2026-07-25T11:50:20.000Z",
    parts: [
      { type: "reasoning", text: "Pull the account deltas first, then rank by value at risk." },
      {
        type: "tool",
        toolCallId: "t1",
        toolName: "crm__list_accounts",
        state: "done",
        input: { since: "2026-07-18" },
        output: "4 accounts changed stage.",
      },
      {
        type: "text",
        text: "Four accounts moved: two upgrades, one churn risk and one stalled renewal. The churn risk is the one worth your morning.",
      },
    ],
  },
  {
    id: "m3",
    role: "user",
    createdAt: "2026-07-25T11:52:00.000Z",
    status: "failed",
    parts: [{ type: "text", text: "Draft an email to the churn-risk account." }],
  },
];

const THREADS: readonly ChatThreadSummary[] = [
  { id: "th_1", title: "Pipeline review", updatedAt: "2026-07-25T11:52:00.000Z", preview: "Four accounts moved…" },
  { id: "th_2", title: "Q3 planning", updatedAt: "2026-07-24T16:10:00.000Z" },
];

const threadsRequest = { key: ["threads"], fetch: async () => ({ items: THREADS, nextOffset: null }) };

const SUBAGENTS: readonly SubagentRun[] = [
  {
    id: "sa_1",
    name: "Researcher",
    task: "Pull the last four stage changes",
    state: "done",
    startedAt: "2026-07-25T11:50:10.000Z",
    tools: [
      { type: "tool", toolCallId: "sa1_t1", toolName: "crm__list_accounts", state: "done", output: "4 accounts." },
    ],
    result: "Two upgrades, one churn risk, one stalled renewal.",
  },
  {
    id: "sa_2",
    name: "Drafter",
    task: "Write the churn-risk email",
    state: "running",
    startedAt: "2026-07-25T11:52:30.000Z",
    tools: [{ type: "tool", toolCallId: "sa2_t1", toolName: "mail__search", state: "running" }],
  },
  { id: "sa_3", name: "Reviewer", task: "Check tone against the playbook", state: "queued" },
];

function ChatShowcase() {
  const [draft, setDraft] = useState("");
  const [activeThread, setActiveThread] = useState<string | null>("th_1");

  return (
    <Section title="Agent chat" description="Agent-agnostic: identity, threads and messages are all props.">
      <div className="grid h-[30rem] grid-cols-[14rem_1fr] overflow-hidden rounded-lg border border-border">
        <div className="min-h-0 border-r border-border">
          <ThreadList
            request={threadsRequest}
            activeId={activeThread}
            onSelect={(thread) => setActiveThread(thread.id)}
            onNewThread={() => setActiveThread(null)}
            now={NOW}
          />
        </div>
        <ChatPanel>
          <ChatPanelHeader identity={AGENT} />
          <div className="border-b border-border p-2">
            <ThreadSwitcher
              request={threadsRequest}
              active={THREADS.find((thread) => thread.id === activeThread) ?? null}
              onSelect={(thread) => setActiveThread(thread.id)}
              onNewThread={() => setActiveThread(null)}
              now={NOW}
            />
          </div>
          <ChatThread messages={MESSAGES} identity={AGENT} now={NOW} onRetry={() => {}} />
          <ChatPanelFooter>
            <SubagentDock subagents={SUBAGENTS} now={NOW} />
            <QuickReplyChips
              replies={[
                { id: "q1", label: "Draft the email" },
                { id: "q2", label: "Show the churn risk" },
              ]}
              onSelect={(reply) => setDraft(reply.value ?? reply.label)}
            />
            <ChatInput
              value={draft}
              onValueChange={setDraft}
              onSend={() => setDraft("")}
              onAttach={() => {}}
            />
          </ChatPanelFooter>
        </ChatPanel>
      </div>
    </Section>
  );
}

// Module-level constants: an array literal in the render body would be a new
// value every render and re-register in a loop, exactly as the hook warns.
const BASE_COMMANDS: readonly CommandAction[] = [
  { id: "goto-inbox", label: "Go to inbox", group: "Navigate", shortcut: "G I", run: () => {} },
  { id: "goto-workflows", label: "Go to workflows", group: "Navigate", run: () => {} },
];

const PAGE_COMMANDS: readonly CommandAction[] = [
  { id: "run-brief", label: "Run the daily brief", group: "Workflows", keywords: ["start", "trigger"], run: () => {} },
  { id: "new-thread", label: "New agent thread", group: "Chat", run: () => {} },
];

function CommandShowcase() {
  // One provider per showcase pane, so the light and dark copies do not
  // contend for the same scope name.
  return (
    <CommandRegistryProvider base={BASE_COMMANDS}>
      <CommandShowcaseBody />
    </CommandRegistryProvider>
  );
}

function CommandShowcaseBody() {
  const [open, setOpen] = useState(false);
  // A page contributing its own commands — the whole point of the registry.
  useRegisterCommands("showcase", PAGE_COMMANDS);
  const actions = useCommands();
  useCommandShortcut(() => setOpen((value) => !value));

  return (
    <Section
      title="Command palette"
      description="Base commands plus whatever the current page registered."
      action={
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          Open palette (⌘K)
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">{actions.length} commands registered.</p>
      <CommandPalette open={open} onOpenChange={setOpen} actions={actions} />
    </Section>
  );
}

const INSTRUCTION_FIELDS = [
  {
    name: "instructions",
    label: "Standing instructions",
    type: "textarea" as const,
    placeholder: "Always cite the account record you used…",
    help: "Applied to every conversation, before anything the user types.",
  },
  {
    name: "tone",
    label: "Tone",
    type: "select" as const,
    options: [
      { value: "direct", label: "Direct" },
      { value: "warm", label: "Warm" },
    ],
  },
];

const TOOL_ITEMS: readonly ToggleItem[] = [
  { id: "crm", label: "CRM lookup", description: "Read account and contact records.", enabled: true },
  { id: "mail", label: "Send mail", description: "Compose and send on your behalf. Gated by approval.", enabled: false },
  { id: "web", label: "Web search", enabled: true },
];

// The panels the ticket names — defaults, instructions, style, tools, pinned
// skills, inference dials, preferences, connections, auto-approved tools — are
// all this shell plus one of four controls. They are compositions, not
// components.
function SettingsShowcase() {
  const [values, setValues] = useState<Record<string, unknown>>({ tone: "direct" });
  const [tools, setTools] = useState(TOOL_ITEMS);
  const [temperature, setTemperature] = useState(0.7);
  const [dirty, setDirty] = useState(false);

  return (
    <Section title="Settings panels" description="One shell; the controls inside are what differ.">
      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsPanel
          title="Instructions"
          description="How the agent should behave by default."
          dirty={dirty}
          onSave={() => setDirty(false)}
          onReset={() => setDirty(false)}
          savedAt="just now"
        >
          <IntakeForm
            fields={INSTRUCTION_FIELDS}
            values={values}
            onChange={(next) => {
              setValues(next);
              setDirty(true);
            }}
            idPrefix="instructions"
          />
        </SettingsPanel>

        <SettingsPanel title="Tools" description="What the agent is allowed to reach for.">
          <ToggleList
            label="Tools"
            items={tools}
            onToggle={(item, enabled) =>
              setTools((current) => current.map((tool) => (tool.id === item.id ? { ...tool, enabled } : tool)))
            }
          />
        </SettingsPanel>

        <SettingsPanel title="Inference" description="Trade determinism against range.">
          <Dial
            label="Temperature"
            value={temperature}
            onValueChange={setTemperature}
            min={0}
            max={1}
            step={0.1}
            valueText={temperature < 0.4 ? "Focused" : temperature > 0.8 ? "Exploratory" : "Balanced"}
            description="Lower repeats itself and stays close to the source. Higher wanders."
          />
        </SettingsPanel>

        <SettingsPanel title="Connections" description="Accounts the agent can act through.">
          <ManagedList
            label="Connections"
            items={[
              { id: "cal", label: "Calendar", status: "Connected as ada@example.com" },
              {
                id: "crm",
                label: "CRM",
                status: "Not connected",
                action: (
                  <Button variant="outline" size="sm">
                    Connect
                  </Button>
                ),
              },
            ]}
            onRemove={() => {}}
          />
        </SettingsPanel>
      </div>
    </Section>
  );
}

const SCHEDULES: readonly Schedule[] = [
  {
    id: "sch_1",
    name: "Morning brief",
    enabled: true,
    recurrence: { every: 1, unit: "day", at: "07:30" },
    nextRunAt: "2026-07-26T07:30:00.000Z",
  },
  {
    id: "sch_2",
    name: "Weekly pipeline digest",
    enabled: false,
    recurrence: { every: 1, unit: "week", weekday: 1, at: "09:00" },
    nextRunAt: null,
  },
];

const schedulesRequest = { key: ["schedules"], fetch: async () => ({ items: SCHEDULES, nextOffset: null }) };

// Brief/schedule sources are a ToggleList — the interaction is
// identical to the tools panel, so there is no separate source-toggles
// component.
const SOURCE_ITEMS: readonly ToggleItem[] = [
  { id: "crm", label: "CRM activity", description: "Stage changes and new opportunities.", enabled: true },
  { id: "calendar", label: "Calendar", description: "Meetings from the last day.", enabled: true },
  { id: "runs", label: "Workflow runs", enabled: false },
];

function ScheduleShowcase() {
  const [draft, setDraft] = useState<ScheduleDraft>({
    name: "Morning brief",
    recurrence: { every: 1, unit: "day", at: "07:30" },
    values: {},
  });
  const [sources, setSources] = useState(SOURCE_ITEMS);

  return (
    <Section
      title="Scheduling"
      description="A schedule is a run plus a recurrence — same intake fields either way."
      action={<RunNowButton size="sm" onRun={async () => {}} label="Send brief now" doneLabel="Sent" />}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsPanel title="Your schedules">
          <ScheduleList
            request={schedulesRequest}
            onEdit={() => {}}
            onToggleEnabled={() => {}}
            onRunNow={async () => {}}
            now={NOW}
          />
        </SettingsPanel>

        <SettingsPanel title="Brief sources" description="What the brief is allowed to draw on.">
          <ToggleList
            label="Brief sources"
            items={sources}
            onToggle={(item, enabled) =>
              setSources((current) => current.map((s) => (s.id === item.id ? { ...s, enabled } : s)))
            }
          />
        </SettingsPanel>
      </div>

      <SettingsPanel title="Edit schedule">
        <ScheduleFlow
          draft={draft}
          onDraftChange={setDraft}
          fields={[{ name: "audience", label: "Send to", type: "text", required: true }]}
          onSave={() => {}}
          onCancel={() => {}}
          onDelete={() => {}}
        />
      </SettingsPanel>
    </Section>
  );
}

type Person = { id: string; name: string; runs: number };

const PEOPLE: readonly Person[] = [
  { id: "p1", name: "Ada Lovelace", runs: 42 },
  { id: "p2", name: "Grace Hopper", runs: 17 },
  { id: "p3", name: "Alan Turing", runs: 91 },
];

function PrimitivesShowcase() {
  const [page, setPage] = useState(2);
  const [view, setView] = useState<ViewMode>("grid");
  const [count, setCount] = useState(1280);

  return (
    <Section title="Primitives" description="The foundation gap-fill.">
      <div className="flex flex-wrap items-center gap-3">
        <ViewToggle mode={view} onChange={setView} />
        <ConfirmButton size="sm" onConfirm={() => {}}>
          Delete key
        </ConfirmButton>
        <Button variant="outline" size="sm" onClick={() => setCount((c) => c + 137)}>
          Add
        </Button>
        <span className="text-sm">
          <AnimatedNumber value={count} /> runs
        </span>
      </div>

      <SortableTable
        caption="People"
        rows={PEOPLE}
        rowKey={(row) => row.id}
        initialSort={{ key: "runs", direction: "desc" }}
        columns={[
          { key: "name", header: "Name", cell: (row) => row.name, sortValue: (row) => row.name },
          { key: "runs", header: "Runs", cell: (row) => row.runs, sortValue: (row) => row.runs, align: "right" },
        ]}
      />

      <Pagination page={page} totalPages={5} total={97} onPageChange={setPage} />

      <ProgressChecklist
        steps={[
          { id: "s1", label: "Read the transcript", status: "done" },
          { id: "s2", label: "Cluster the objections", status: "running" },
          { id: "s3", label: "Draft the summary", status: "pending" },
          { id: "s4", label: "Publish", status: "failed", detail: "No destination configured." },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <CatalogGlyph seed="daily-brief" />
        <CatalogGlyph seed="enrich-accounts" />
        <CatalogGlyph seed="pipeline-sync" />
      </div>

      <FileInput onFiles={() => {}} label="Upload a transcript" hint="or drag it here · .txt, .vtt" />

      <div className="flex flex-col gap-2" role="status" aria-label="Loading example">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      <EmptyState
        icon={<Inbox />}
        title="No results"
        description="Nothing matched that filter. Try widening it."
        action={
          <Button variant="outline" size="sm">
            Clear filters
          </Button>
        }
      />
    </Section>
  );
}

const SKILLS = [
  { id: "sk1", name: "Summarise a call", body: "Turns a transcript into decisions, owners and dates." },
  { id: "sk2", name: "Draft an outreach note", body: "Writes a short first-touch email from an account record." },
];

function ShellShowcase() {
  const [openId, setOpenId] = useState<string | null>("sk1");
  const open = SKILLS.find((skill) => skill.id === openId) ?? null;

  return (
    <Section title="Library and settings shells" description="Section nav, page frame, list / detail.">
      <div className="h-[26rem] overflow-hidden rounded-lg border border-border">
        <PageShell width="full" scroll={false} className="px-0 py-0">
          <SectionNavLayout
            nav={
              <SectionNav
                label="Library sections"
                activeId="skills"
                groups={[
                  {
                    heading: "Library",
                    items: [
                      { id: "skills", label: "Skills", href: "#skills", anchor: true },
                      { id: "tools", label: "Tools", href: "#tools", anchor: true },
                    ],
                  },
                  { heading: "Management", items: [{ id: "members", label: "Members", href: "#members" }] },
                ]}
              />
            }
          >
            <ListDetail
              detailLabel="Skill"
              onCloseDetail={() => setOpenId(null)}
              detail={
                open === null ? null : (
                  <article className="flex flex-col gap-2">
                    <h3 className="text-base font-semibold">{open.name}</h3>
                    <p className="text-sm text-muted-foreground">{open.body}</p>
                  </article>
                )
              }
              list={
                <ul className="flex flex-col gap-2">
                  {SKILLS.map((skill) => (
                    <li key={skill.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(skill.id)}
                        aria-current={skill.id === openId ? "true" : undefined}
                        className="flex w-full flex-col gap-2 rounded-lg border border-border p-3 text-left hover:bg-muted"
                      >
                        <CatalogGlyph seed={skill.id} className="h-14" />
                        <span className="text-sm font-medium">{skill.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              }
            />
          </SectionNavLayout>
        </PageShell>
      </div>
    </Section>
  );
}

const NOTES: readonly ReleaseNote[] = [
  {
    id: "n1",
    title: "Approval cards show every argument",
    date: "2026-07-24",
    tag: "New",
    body: "A gated action now lists exactly what it will run with, clamped rather than hidden.",
  },
  {
    id: "n2",
    title: "Schedules pause from the list",
    date: "2026-07-20",
    tag: "Improved",
    body: "Turning a schedule off no longer means opening it first.",
  },
];

function OnboardingShowcase() {
  const [tourOpen, setTourOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  return (
    <Section
      title="Onboarding"
      description="Tour and release notes."
      action={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setTourOpen(true)} data-tour-anchor>
            Start tour
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            What&rsquo;s new
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPopupOpen(true)}>
            Show popup
          </Button>
        </div>
      }
    >
      <WhatsNewSection notes={NOTES} />

      <OnboardingTour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        steps={[
          { id: "t1", target: "[data-tour-anchor]", title: "Start here", body: "This control begins the walkthrough — and stays clickable while highlighted." },
          { id: "t2", title: "Unanchored steps still show", body: "A step whose selector matches nothing is centred rather than silently dropped." },
        ]}
      />
      <WhatsNewDialog open={dialogOpen} onOpenChange={setDialogOpen} notes={NOTES} />
      <WhatsNewPopup
        open={popupOpen}
        notes={NOTES}
        onDismiss={() => setPopupOpen(false)}
        onSeeAll={() => {
          setPopupOpen(false);
          setDialogOpen(true);
        }}
      />
    </Section>
  );
}

function Showcase() {
  return (
    <div className="flex flex-col gap-6 bg-background p-8 text-foreground">
      <div>
        <h1 className="text-2xl font-bold">@corbits/react-ui</h1>
        <p className="text-muted-foreground">Corbits tokens and base primitives.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button onClick={() => toast.success("Workflow queued")}>Toast</Button>
      </div>

      <Input placeholder="Search runs…" aria-label="Search runs" />

      <div className="flex flex-wrap items-center gap-3">
        <CorbitsMark className="size-8 text-primary-emphasis" />
        <ProviderMark provider="slack" size="md" />
        <ProviderMark provider="linear" size="md" />
        <ToolProviderMark
          part={{ type: "tool", toolCallId: "x", toolName: "github__create_issue", state: "done" }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>Neutral</Badge>
        <Badge tone="accent">Accent</Badge>
        <Badge tone="info">Info</Badge>
        <Badge tone="success">Success</Badge>
        <Badge tone="danger">Danger</Badge>
      </div>

      <InboxShowcase />

      <WorkflowShowcase />

      <ChatShowcase />

      <CommandShowcase />

      <PrimitivesShowcase />

      <ShellShowcase />

      <OnboardingShowcase />

      <SettingsShowcase />

      <ScheduleShowcase />

      <ArtifactsShowcase />

      <AnalyticsShowcase />

      <InsightsShowcase />

      <ActorShowcase />

      <AuthShowcase />

      <ChromeShowcase />

      <TopBarShowcase />

      <SidebarShowcase />

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
          <CardDescription>Rendered through the TanStack data port.</CardDescription>
        </CardHeader>
        <DataTable caption="Recent runs" request={request} columns={COLUMNS} rowKey={(row) => row.id} />
      </Card>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel run</DialogTitle>
            <DialogDescription>This stops the run at its current step.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Keep running</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="destructive">Cancel run</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Page() {
  const [queryClient] = useState(() => new QueryClient());
  const [port] = useState(createTanstackDataPort);
  return (
    <QueryClientProvider client={queryClient}>
      <DataPortProvider value={port}>
        <Toaster />
        <div className="grid md:grid-cols-2">
          <Showcase />
          <div className="dark">
            <Showcase />
          </div>
        </div>
      </DataPortProvider>
    </QueryClientProvider>
  );
}
