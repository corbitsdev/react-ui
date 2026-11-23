import { useState } from "react";
import type { ReactNode } from "react";

import {
  groupActivity,
  type ActivityStep,
} from "../../src/lib/conversation-activity.js";
import type {
  ConversationPart,
  PartReasoning,
} from "../../src/lib/conversation.js";
import { Activity } from "../../src/ui/activity.js";
import type { ActivityAgent } from "../../src/ui/activity-agents.js";
import { Button } from "../../src/ui/button.js";
import { Message } from "../../src/ui/message.js";
import { MessageParts } from "../../src/ui/message-parts.js";
import { Reasoning } from "../../src/ui/reasoning.js";
import {
  designers,
  designersAsking,
  designersDone,
  useLiveAgents,
  writer,
} from "./samples/agents.js";
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

/** The tool storm turn: each run folded to its summary between the text. */
export const ToolStorm = () => (
  <div className="max-w-2xl p-4">
    <Message from="agent" aria-label="Agent">
      <MessageParts parts={partsOf("storm-2")} />
    </Message>
  </div>
);

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

// ---------------------------------------------------------------------------
// Agents: work the main thread hands to other agents.

/** The coordinator's own work before it hands off. */
const coordinatorSteps: readonly ActivityStep[] = [
  {
    kind: "tool-trace",
    toolCallId: "own-1",
    name: "Read the product requirements",
    status: "output-available",
    output: "ok",
  },
  {
    kind: "tool-trace",
    toolCallId: "own-2",
    name: "Chose how to do this",
    status: "output-available",
    output: "ok",
  },
];

function Frame({ children }: { readonly children: ReactNode }) {
  return (
    <div className="flex max-w-[560px] flex-col gap-3 p-4">{children}</div>
  );
}

function Live({ agents }: { readonly agents: readonly ActivityAgent[] }) {
  const live = useLiveAgents(agents);
  return <Activity steps={coordinatorSteps} agents={live} />;
}

/** Three designers at work, in real time: each row rolls to its next step; point at one for Watch and Stop, open it for its draft and steps. */
export const AgentsWorking = () => (
  <Frame>
    <Live agents={designers()} />
  </Frame>
);

/** One designer has stopped on a question: it comes first, answerable in one tap, in your own words, or left to it. */
export const AgentsNeedYou = () => (
  <Frame>
    <Live agents={designersAsking()} />
  </Frame>
);

/** The team finished: folded to one line, clocks stopped; open it for what each filed. */
export const AgentsFinished = () => (
  <Frame>
    <Activity steps={coordinatorSteps} agents={designersDone()} />
  </Frame>
);

function FiledDocument() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border px-3.5 py-3 text-sm">
      <p className="font-medium text-foreground">Personal calorie tracker</p>
      <ul className="flex list-disc flex-col gap-1 ps-4 text-foreground/75">
        <li>
          Set a daily goal, log foods by meal, see today and earlier days.
        </li>
        <li>Leaves out barcode scanning, a food database and diet advice.</li>
      </ul>
    </div>
  );
}

/** One agent alone: its role and task as the row, then what it filed, its report and what it was asked. */
export const OneAgent = () => (
  <Frame>
    <Activity
      steps={coordinatorSteps}
      agents={[
        {
          ...writer(),
          result: {
            title: "Personal calorie tracker v1",
            content: <FiledDocument />,
          },
        },
      ]}
    />
  </Frame>
);

/** The main thread thinking before its first step: the same spinner its agents use. */
export const ThinkingNow = () => (
  <Frame>
    <Activity steps={[]} streaming />
  </Frame>
);
