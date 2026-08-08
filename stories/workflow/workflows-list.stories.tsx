import { WorkflowRegistryList } from "../../src/ui/workflow-registry-list.js";
import type { WorkflowListItem } from "../../src/lib/workflow-registry.js";

export default { title: "Workflow / Workflows list" };

const LIVE: WorkflowListItem[] = [
  {
    id: "1",
    itemKind: "run",
    title: "Invoice reminders",
    subtitle: "Started from the finance channel",
    when: "Started 42m ago",
    scope: "personal",
    statusTone: "running",
    statusLabel: "Running",
    nextOrElapsed: "00:42",
  },
  {
    id: "2",
    itemKind: "run",
    title: "Vendor renewal review",
    when: "Started 4h ago",
    scope: "tenant",
    statusTone: "awaiting",
    statusLabel: "Needs you",
    nextOrElapsed: "04:11",
    needsYou: true,
  },
];

const SCHEDULED: WorkflowListItem[] = [
  {
    id: "3",
    itemKind: "schedule",
    title: "Weekly metrics summary",
    when: "Every Monday, 8:00 AM",
    scope: "tenant",
    statusTone: "paused",
    statusLabel: "Paused",
    nextOrElapsed: "—",
  },
  {
    id: "4",
    itemKind: "schedule",
    title: "Daily inbox triage",
    when: "Weekdays, 7:30 AM",
    scope: "personal",
    statusTone: "done",
    statusLabel: "Done",
    nextOrElapsed: "Tomorrow, 7:30 AM",
    nextSoon: true,
  },
];

export const LiveAndScheduled = () => (
  <div className="h-96 w-full max-w-3xl">
    <WorkflowRegistryList live={LIVE} scheduled={SCHEDULED} selectedId="1" selectedKind="run" />
  </div>
);

export const NoMatches = () => (
  <div className="h-96 w-full max-w-3xl">
    <WorkflowRegistryList live={[]} scheduled={[]} />
  </div>
);
