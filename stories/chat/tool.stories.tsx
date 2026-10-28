import { useState } from "react";

import type { ToolTraceStatus } from "../../src/lib/chat-parts.js";
import type {
  ConversationPart,
  PartTool,
  PartToolBatch,
  ToolApprovalRecord,
} from "../../src/lib/conversation.js";
import { Tool, ToolHeader, ToolInput, ToolOutput } from "../../src/ui/tool.js";
import {
  ToolApproval,
  type ToolApprovalDecision,
} from "../../src/ui/tool-approval.js";
import { ToolGroup } from "../../src/ui/tool-group.js";
import { toolStorm } from "./samples/conversations.js";

export default { title: "Chat / Tool" };

function partsOf(id: string): readonly ConversationPart[] {
  const message = toolStorm.messages.find((candidate) => candidate.id === id);
  if (message === undefined) throw new Error(`No sample message ${id}`);
  return message.parts;
}

function isTool(part: ConversationPart): part is PartTool {
  return part.kind === "tool-trace";
}

const pendingCall = partsOf("storm-4").filter(isTool).at(-1);
const settledCalls = partsOf("storm-2")
  .filter(isTool)
  .filter((part) => part.approval !== undefined);
const sampleBatch = partsOf("storm-2").find(
  (part): part is PartToolBatch => part.kind === "tool-batch",
);

function Column({ children }: { readonly children: React.ReactNode }) {
  return <div className="flex max-w-xl flex-col gap-2 p-4">{children}</div>;
}

const STATUSES: readonly ToolTraceStatus[] = [
  "pending",
  "running",
  "output-available",
  "error",
  "approval-requested",
  "output-denied",
];

/** Every execution status. A failed call opens onto its error. */
export const EveryStatus = () => (
  <Column>
    {STATUSES.map((status) => (
      <Tool
        key={status}
        part={{
          kind: "tool-trace",
          toolCallId: status,
          name: "files__read",
          status,
          input: { path: "agreements/agreement-28.pdf" },
          ...(status === "error"
            ? { output: "The file is password protected." }
            : status === "output-available"
              ? { output: "Renews this quarter" }
              : {}),
        }}
      />
    ))}
  </Column>
);

/** Opened, with a label and the caller rendering input and output. */
export const CustomRender = () => (
  <Column>
    <Tool
      defaultOpen
      part={{
        kind: "tool-trace",
        toolCallId: "custom",
        name: "web__fetch",
        status: "output-available",
        input: { url: "https://example.com/pricing/vendor-3" },
        output: { plan: "Team", price: 42, changed: true },
      }}
    >
      <ToolHeader label="Checked the pricing page" />
      <ToolInput
        render={(input) => (
          <span>
            GET <strong>{String(Object.values(input ?? {})[0])}</strong>
          </span>
        )}
      />
      <ToolOutput
        render={(output) => (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3">
            {Object.entries(output ?? {}).map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-muted-foreground">{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      />
    </Tool>
  </Column>
);

/** Nothing to open: the row is plain text. */
export const NoDetail = () => (
  <Column>
    <Tool
      part={{
        kind: "tool-trace",
        toolCallId: "bare",
        name: "runs__ping",
        status: "output-available",
      }}
    />
  </Column>
);

/**
 * A call waiting on a person. Deciding records the outcome on the call the
 * way a host would, and the card becomes its resolved line.
 */
export const PendingApproval = () => {
  const [approval, setApproval] = useState<ToolApprovalRecord | undefined>(
    pendingCall?.approval,
  );
  if (pendingCall === undefined || approval === undefined) return null;
  const decide = (decision: ToolApprovalDecision) =>
    setApproval({
      ...approval,
      status: decision.outcome,
      scope: decision.scope,
    });
  return (
    <Column>
      <ToolApproval part={{ ...pendingCall, approval }} onDecide={decide}>
        <p>Send the renewal summary to the whole team.</p>
      </ToolApproval>
    </Column>
  );
};

/** The host is recording a decision, and its last attempt failed. */
export const PendingApprovalError = () =>
  pendingCall === undefined ? null : (
    <Column>
      <ToolApproval
        part={pendingCall}
        disabled
        error="The decision could not be saved. Try again."
        onDecide={() => {}}
      />
    </Column>
  );

/** Every settled outcome, read from the approval record. */
export const ResolvedApprovals = () => (
  <Column>
    {settledCalls.map((part) => (
      <ToolApproval key={part.toolCallId} part={part} onDecide={() => {}} />
    ))}
    <ToolApproval
      part={{
        kind: "tool-trace",
        toolCallId: "denied-always",
        name: "records__delete",
        status: "output-denied",
        approval: {
          id: "approval-denied-always",
          status: "rejected",
          scope: "always",
          timeoutAt: null,
        },
      }}
      onDecide={() => {}}
    />
  </Column>
);

/** Settled calls as tools: the outcome sits under each row. */
export const ResolvedTools = () => (
  <Column>
    {settledCalls.map((part) => (
      <Tool key={part.toolCallId} part={part} />
    ))}
  </Column>
);

/** Six calls that ran at once, opened. */
export const Batch = () =>
  sampleBatch === undefined ? null : (
    <Column>
      <ToolGroup part={sampleBatch} defaultOpen />
    </Column>
  );

/** A batch still running, with one failure so far. */
export const BatchRunning = () => (
  <Column>
    <ToolGroup
      part={{
        kind: "tool-batch",
        id: "running-batch",
        tools: [
          {
            kind: "tool-trace",
            toolCallId: "a",
            name: "web__fetch",
            status: "output-available",
            output: "No change",
          },
          {
            kind: "tool-trace",
            toolCallId: "b",
            name: "web__fetch",
            status: "error",
            output: "Timed out",
          },
          {
            kind: "tool-trace",
            toolCallId: "c",
            name: "web__fetch",
            status: "running",
          },
          {
            kind: "tool-trace",
            toolCallId: "d",
            name: "web__fetch",
            status: "pending",
          },
        ],
      }}
    />
  </Column>
);

/** A batch with a call waiting on a person opens on that call's decision. */
export const BatchWaiting = () => {
  const [approval, setApproval] = useState<ToolApprovalRecord>({
    id: "approval-batch",
    status: "pending",
    scope: null,
    timeoutAt: null,
  });
  return (
    <Column>
      <ToolGroup
        part={{
          kind: "tool-batch",
          id: "waiting-batch",
          tools: [
            {
              kind: "tool-trace",
              toolCallId: "read",
              name: "files__read",
              status: "output-available",
              output: "ok",
            },
            {
              kind: "tool-trace",
              toolCallId: "write",
              name: "files__write",
              status:
                approval.status === "pending"
                  ? "approval-requested"
                  : approval.status === "approved"
                    ? "output-available"
                    : "output-denied",
              input: { path: "notes/renewals.md" },
              approval,
            },
          ],
        }}
        onDecide={(_, decision) =>
          setApproval({
            ...approval,
            status: decision.outcome,
            scope: decision.scope,
          })
        }
      />
    </Column>
  );
};
