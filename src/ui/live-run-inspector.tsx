import type { ReactNode } from "react";

import type { LiveRunPhase, StepListItem, WorkflowScope } from "../lib/workflow-registry.js";
import { Button } from "./button.js";
import { InspectorKv, InspectorPanelTitle, InspectorShell } from "./inspector-shell.js";
import { LiveRunBanner } from "./live-run-banner.js";
import { LiveRunHeader } from "./live-run-header.js";
import { StepList } from "./step-list.js";

export type { LiveRunPhase } from "../lib/workflow-registry.js";

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
 * A live run's inspector — the composition wrapper, and nothing more: every
 * visible piece is `InspectorShell`, `LiveRunHeader`, `LiveRunBanner`,
 * `GateBlock` (via the `gate` slot), `StepList` or `InspectorKv`, each
 * importable on its own. This component only decides which of them render
 * and in what order.
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
        <LiveRunHeader
          phase={phase}
          scope={scope}
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
