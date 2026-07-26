"use client";

import { useState } from "react";

import type { CollectionRequest, CollectionResult, DataPort } from "@/registry/corbits/lib/data-port";
import { DataPortProvider } from "@/registry/corbits/lib/data-port";
import type { NowItem } from "@/registry/corbits/lib/now-item";
import type { Schedule } from "@/registry/corbits/lib/schedule";
import type { WorkflowRunSummary } from "@/registry/corbits/lib/workflow-run";
import type { ActivityEntry } from "@/registry/corbits/lib/activity";
import type { Artifact } from "@/registry/corbits/lib/artifact";
import { ActivityTimeline } from "@/registry/corbits/ui/activity-timeline";
import { ArtifactGallery } from "@/registry/corbits/ui/artifact-gallery";
import { CommandQueue } from "@/registry/corbits/ui/command-queue";
import { DataTable } from "@/registry/corbits/ui/data-table";
import { ScheduleList } from "@/registry/corbits/ui/schedule-list";
import { WorkflowDock } from "@/registry/corbits/ui/workflow-dock";

type Run = { id: string; workflow: string; state: string };

const RUNS: readonly Run[] = [
  { id: "run_01", workflow: "inbox-triage", state: "succeeded" },
  { id: "run_02", workflow: "daily-brief", state: "running" },
];

const NOW = Date.parse("2026-07-25T12:00:00.000Z");

const QUEUE: readonly NowItem[] = [
  {
    type: "gate",
    id: "gate_01",
    title: "Send the Q3 pipeline brief",
    classification: "Approval",
    priority: "now",
    status: "needs-action",
    when: "2026-07-25T11:48:00.000Z",
    action: "Review",
  },
  {
    type: "mail",
    id: "mail_02",
    title: "Morning brief: 4 accounts moved",
    classification: "Brief",
    priority: "next",
    status: "done",
    when: "2026-07-25T07:02:00.000Z",
    from: "briefs@corbits.dev",
    read: true,
  },
];

const ACTIVE_RUNS: readonly WorkflowRunSummary[] = [
  { runId: "run_21", title: "Daily brief", status: "awaiting", startedAt: "2026-07-25T11:40:00.000Z" },
  { runId: "run_22", title: "Enrich accounts", status: "running", startedAt: "2026-07-25T11:55:00.000Z" },
];

const SCHEDULES: readonly Schedule[] = [
  {
    id: "sch_1",
    name: "Morning brief",
    enabled: true,
    recurrence: { every: 1, unit: "day", at: "07:30" },
    nextRunAt: "2026-07-26T07:30:00.000Z",
  },
];

const ARTIFACTS: readonly Artifact[] = [
  {
    id: "art_01",
    title: "Q3 pipeline review",
    kind: "one-pager",
    content: "Coverage is 2.8x against a 3.0x target.",
    createdAt: "2026-07-24T09:00:00.000Z",
    ownerName: "Dana Reyes",
  },
  {
    id: "art_02",
    title: "Territory export",
    kind: "csv-export",
    content: "Region,Accounts\nEMEA,142\nAMER,209",
    createdAt: "2026-07-24T11:30:00.000Z",
  },
];

const ACTIVITY: readonly ActivityEntry[] = [
  { id: "ev_1", timestamp: "2026-07-25T09:12:00.000Z", kind: "run.started", summary: "daily-brief started on schedule." },
  { id: "ev_2", timestamp: "2026-07-25T09:31:00.000Z", kind: "approval.granted", summary: "Dana approved the send.", tone: "positive" },
  { id: "ev_3", timestamp: "2026-07-24T17:02:00.000Z", kind: "run.failed", summary: "Upstream timed out.", tone: "critical" },
];

const FIXTURES: Record<string, readonly unknown[]> = {
  runs: RUNS,
  queue: QUEUE,
  "active-runs": ACTIVE_RUNS,
  schedules: SCHEDULES,
  artifacts: ARTIFACTS,
  activity: ACTIVITY,
};

const runsRequest = { key: ["runs"], fetch: async () => ({ items: RUNS, nextOffset: null }) };
const queueRequest = { key: ["queue"], fetch: async () => ({ items: QUEUE, nextOffset: null }) };
const activeRunsRequest = { key: ["active-runs"], fetch: async () => ({ items: ACTIVE_RUNS, nextOffset: null }) };
const schedulesRequest = { key: ["schedules"], fetch: async () => ({ items: SCHEDULES, nextOffset: null }) };

const artifactsRequest = { key: ["artifacts"], fetch: async () => ({ items: ARTIFACTS, nextOffset: null }) };
const activityRequest = { key: ["activity"], fetch: async () => ({ items: ACTIVITY, nextOffset: null }) };

const COLUMNS = [
  { header: "Run", cell: (row: Run) => row.id },
  { header: "Workflow", cell: (row: Run) => row.workflow },
  { header: "State", cell: (row: Run) => row.state },
];

// A DataPort with no TanStack, no cache, no fetching at all — the whole point
// of the seam. If DataTable and CommandQueue render rows here, nothing in them
// is coupled to the default adapter. It answers from a fixture table keyed by
// the request's first key segment; only `enabled` is otherwise honoured.
const fixturePort: DataPort = {
  useCollection: <T,>(request: CollectionRequest<T>): CollectionResult<T> => ({
    items: (request.enabled ?? true) ? ((FIXTURES[String(request.key[0])] ?? []) as readonly T[]) : [],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: () => {},
    hasNextPage: false,
    fetchNextPage: () => {},
  }),
};

export default function FixturePage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <DataPortProvider value={fixturePort}>
      <div className="flex flex-col gap-6 p-8">
        <DataTable caption="Recent runs" request={runsRequest} columns={COLUMNS} rowKey={(row) => row.id} />
        <CommandQueue
          request={queueRequest}
          selectedId={selectedId}
          onOpen={(item) => setSelectedId(item.id)}
          now={NOW}
        />
        <WorkflowDock request={activeRunsRequest} now={NOW} />
        <ScheduleList request={schedulesRequest} onEdit={() => {}} onToggleEnabled={() => {}} now={NOW} />
        <ArtifactGallery request={artifactsRequest} now={NOW} />
        <ActivityTimeline request={activityRequest} label="Workspace activity" now={NOW} />
      </div>
    </DataPortProvider>
  );
}
