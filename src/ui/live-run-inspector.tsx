import type { ReactNode } from "react";

import type { StepListItem, WorkflowScope } from "../lib/workflow-registry.js";
import { Button } from "./button.js";
import { InspectorHeader, InspectorKv, InspectorPanelTitle, InspectorShell } from "./inspector-shell.js";
import { LiveRunBanner } from "./live-run-banner.js";
import { ScopePill } from "./scope-pill.js";
import { StatusChip } from "./status-chip.js";
import { StepList } from "./step-list.js";

export type LiveRunPhase = "running" | "awaiting" | "completed" | "failed" | "cancelled";

const LIVE_RUN_TONE: Record<LiveRunPhase, "running" | "awaiting" | "done" | "fail"> = {
  running: "running",
  awaiting: "awaiting",
  completed: "done",
  failed: "fail",
  cancelled: "fail",
};

const LIVE_RUN_LABEL: Record<LiveRunPhase, string> = {
  running: "Running",
  awaiting: "Needs you",
  completed: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

export type LiveRunInspectorProps = {
  readonly phase: LiveRunPhase;
  readonly scope?: WorkflowScope;
  readonly title: string;
  readonly description?: string;
  readonly elapsed?: string;
  readonly started?: string;
  readonly runId?: string;
  readonly steps?: readonly StepListItem[];
  /** The gate shell + its interactive payload, from the caller. */
  readonly gate?: ReactNode;
  readonly onStop?: () => void;
  readonly onOpenChat?: () => void;
  readonly className?: string;
  /** Shown instead of the whole inspector when no run is selected. */
  readonly empty?: ReactNode;
};

/**
 * A live run's inspector: composed entirely from `InspectorShell`,
 * `StatusChip`, `ScopePill`, `LiveRunBanner`, `GateBlock` (via the `gate`
 * slot) and `StepList` rather than owning any of that presentation itself.
 * The only thing this component adds is the wiring between them — swap any
 * one piece out and the rest keeps working.
 */
export function LiveRunInspector({
  phase,
  scope,
  title,
  description,
  elapsed,
  started,
  runId,
  steps,
  gate,
  onStop,
  onOpenChat,
  className,
  empty,
}: LiveRunInspectorProps) {
  if (empty !== undefined) {
    return <InspectorShell empty={empty} className={className} />;
  }

  const awaiting = phase === "awaiting";
  const elapsedLine = [elapsed, started === undefined ? null : `started ${started}`].filter(Boolean).join(" · ");
  const metaRows = runId === undefined ? [] : [{ label: "Run id", value: runId, mono: true }];

  return (
    <InspectorShell
      className={className}
      header={
        <InspectorHeader
          eyebrow={
            <>
              <StatusChip tone={LIVE_RUN_TONE[phase]} label={LIVE_RUN_LABEL[phase]} />
              {scope === undefined ? null : <ScopePill scope={scope} />}
            </>
          }
          title={title}
          description={description}
          actions={
            <>
              {!awaiting && onStop !== undefined ? (
                <Button variant="destructive" size="sm" onClick={onStop}>
                  Stop
                </Button>
              ) : null}
              {onOpenChat === undefined ? null : (
                <Button variant="outline" size="sm" onClick={onOpenChat}>
                  Open in chat
                </Button>
              )}
            </>
          }
        />
      }
    >
      <LiveRunBanner awaiting={awaiting} elapsed={elapsedLine === "" ? undefined : elapsedLine} />
      {gate}
      {steps === undefined ? null : <StepList steps={steps} label="Run steps" />}
      {metaRows.length === 0 ? null : (
        <>
          <InspectorPanelTitle>Run</InspectorPanelTitle>
          <InspectorKv rows={metaRows} />
        </>
      )}
    </InspectorShell>
  );
}
