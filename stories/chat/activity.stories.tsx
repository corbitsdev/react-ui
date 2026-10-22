import { useState } from "react";

import {
  groupActivity,
  type ActivityStep,
} from "../../src/lib/conversation-activity.js";
import type {
  ConversationPart,
  PartReasoning,
  PartTool,
  ToolApprovalRecord,
} from "../../src/lib/conversation.js";
import { Activity } from "../../src/ui/activity.js";
import { Button } from "../../src/ui/button.js";
import { Reasoning } from "../../src/ui/reasoning.js";
import { ToolApproval } from "../../src/ui/tool-approval.js";
import { toolStorm } from "./samples/conversations.js";

export default { title: "Chat / Activity" };

function partsOf(id: string): readonly ConversationPart[] {
  const message = toolStorm.messages.find((candidate) => candidate.id === id);
  if (message === undefined) throw new Error(`No sample message ${id}`);
  return message.parts;
}

/** The first run of a message: its thinking and forty reads. */
function firstRun(parts: readonly ConversationPart[]): readonly ActivityStep[] {
  for (const group of groupActivity(parts))
    if (group.kind === "activity") return group.steps;
  return [];
}

/** A message's parts as they render: runs fold, text stays. */
function Parts({ parts }: { readonly parts: readonly ConversationPart[] }) {
  return (
    <div className="flex max-w-2xl flex-col gap-3 p-4 text-sm">
      {groupActivity(parts).map((group) =>
        group.kind === "activity" ? (
          <Activity key={group.key} steps={group.steps} />
        ) : group.part.kind === "text" ? (
          <p key={group.key}>{group.part.text}</p>
        ) : null,
      )}
    </div>
  );
}

/** The tool storm turn: each run folded to its summary between the text. */
export const ToolStorm = () => <Parts parts={partsOf("storm-2")} />;

/** A 41-step run opened: the latest ten, with a control for the rest. */
export const Opened = () => (
  <div className="max-w-2xl p-4">
    <Activity steps={firstRun(partsOf("storm-2"))} defaultOpen />
  </div>
);

const liveThought: PartReasoning = {
  kind: "reasoning",
  text: "Six pricing pages to check; fetch them together and compare with last quarter.",
};

/** A still frame of a live run: thinking, then calls running at once. */
export const Streaming = () => (
  <div className="flex max-w-2xl flex-col gap-3 p-4">
    <Activity
      streaming
      steps={[
        { ...liveThought, durationMs: 2_100 },
        {
          kind: "tool-batch",
          id: "live-batch",
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
              status: "running",
            },
            {
              kind: "tool-trace",
              toolCallId: "c",
              name: "web__fetch",
              status: "running",
            },
          ],
        },
      ]}
    />
    <Activity streaming steps={[liveThought]} defaultOpen />
  </div>
);

/** Open state lifted to the host. */
export const Controlled = () => {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex max-w-2xl flex-col items-start gap-3 p-4">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
        {open ? "Collapse from outside" : "Expand from outside"}
      </Button>
      <Activity
        steps={firstRun(partsOf("storm-2")).slice(0, 4)}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
};

/** Thinking on its own: done with a duration, without one, live, opened. */
export const ReasoningStates = () => (
  <div className="flex max-w-2xl flex-col gap-2 p-4">
    <Reasoning
      part={{
        kind: "reasoning",
        text: "Read every agreement first, then check current pricing for the ones that renew.",
        durationMs: 4_400,
      }}
    />
    <Reasoning part={{ kind: "reasoning", text: "Compare the totals." }} />
    <Reasoning part={liveThought} streaming />
    <Reasoning
      defaultOpen
      part={{
        kind: "reasoning",
        text: "The owner field changed on agreement 12, so the renewal notice goes to the new owner.\n\nCheck the deadline before asking.",
        durationMs: 75_000,
      }}
    />
  </div>
);

/**
 * A call waiting on a person stands outside the fold. Once decided, it
 * joins the run before it, and the run's steps show the outcome.
 */
export const ApprovalFolds = () => {
  const [approval, setApproval] = useState<ToolApprovalRecord>({
    id: "approval-fold",
    status: "pending",
    scope: null,
    timeoutAt: null,
  });
  const parts: readonly PartTool[] = [
    {
      kind: "tool-trace",
      toolCallId: "draft",
      name: "mail__draft",
      status: "output-available",
      input: { to: "team", subject: "Renewals this quarter" },
      output: "Draft ready",
    },
    {
      kind: "tool-trace",
      toolCallId: "send",
      name: "mail__send",
      status:
        approval.status === "pending"
          ? "approval-requested"
          : approval.status === "approved"
            ? "output-available"
            : "output-denied",
      input: { to: "team", subject: "Renewals this quarter" },
      approval,
    },
  ];
  return (
    <div className="flex max-w-2xl flex-col gap-3 p-4">
      {groupActivity(parts).map((group) =>
        group.kind === "activity" ? (
          <Activity key={group.key} steps={group.steps} />
        ) : group.part.kind === "tool-trace" ? (
          <ToolApproval
            key={group.key}
            part={group.part}
            onDecide={(decision) =>
              setApproval({
                ...approval,
                status: decision.outcome,
                scope: decision.scope,
              })
            }
          />
        ) : null,
      )}
    </div>
  );
};
