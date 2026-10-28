import { describe, expect, test } from "bun:test";

import type { PartReasoning, PartText } from "./chat-parts.js";
import type {
  ConversationPart,
  PartTool,
  PartToolBatch,
  ToolApprovalRecord,
} from "./conversation.js";
import {
  groupActivity,
  isAwaitingApproval,
  summarizeActivity,
} from "./conversation-activity.js";

const text = (value: string): PartText => ({ kind: "text", text: value });

const thought = (durationMs?: number): PartReasoning =>
  durationMs === undefined
    ? { kind: "reasoning", text: "thinking" }
    : { kind: "reasoning", text: "thinking", durationMs };

const tool = (
  id: string,
  status: PartTool["status"] = "output-available",
  approval?: ToolApprovalRecord,
): PartTool =>
  approval === undefined
    ? { kind: "tool-trace", toolCallId: id, name: "search", status }
    : { kind: "tool-trace", toolCallId: id, name: "search", status, approval };

const batch = (id: string, tools: readonly PartTool[]): PartToolBatch => ({
  kind: "tool-batch",
  id,
  tools,
});

const approval = (
  status: ToolApprovalRecord["status"],
): ToolApprovalRecord => ({
  id: "approval-1",
  status,
  scope: null,
  timeoutAt: null,
});

describe("isAwaitingApproval", () => {
  test("a pending record waits whatever the call's status says", () => {
    expect(isAwaitingApproval(tool("a", "running", approval("pending")))).toBe(
      true,
    );
  });

  test("a settled record does not wait even if the call still says approval-requested", () => {
    expect(
      isAwaitingApproval(tool("a", "approval-requested", approval("approved"))),
    ).toBe(false);
  });

  test("without a record, approval-requested waits and other statuses do not", () => {
    expect(isAwaitingApproval(tool("a", "approval-requested"))).toBe(true);
    expect(isAwaitingApproval(tool("a", "running"))).toBe(false);
  });
});

describe("groupActivity", () => {
  test("reasoning, tool and tool-batch parts between texts form one run", () => {
    const steps = [
      thought(1000),
      tool("a"),
      batch("b", [tool("b1"), tool("b2")]),
    ];
    const parts: ConversationPart[] = [text("before"), ...steps, text("after")];

    expect(groupActivity(parts)).toEqual([
      { kind: "part", key: "text-0", part: text("before") },
      { kind: "activity", key: "activity-1", steps },
      { kind: "part", key: "text-4", part: text("after") },
    ]);
  });

  test("a text part ends a run", () => {
    const groups = groupActivity([
      tool("a"),
      text("mid"),
      thought(),
      tool("b"),
    ]);

    expect(groups.map((group) => group.kind)).toEqual([
      "activity",
      "part",
      "activity",
    ]);
    expect(groups[0]).toEqual({
      kind: "activity",
      key: "activity-0",
      steps: [tool("a")],
    });
    expect(groups[2]).toEqual({
      kind: "activity",
      key: "activity-2",
      steps: [thought(), tool("b")],
    });
  });

  test("a tool with a pending approval record stays out of the fold", () => {
    const waiting = tool("w", "pending", approval("pending"));
    const groups = groupActivity([thought(), waiting, tool("b")]);

    expect(groups).toEqual([
      { kind: "activity", key: "activity-0", steps: [thought()] },
      { kind: "part", key: "tool-trace-1", part: waiting },
      { kind: "activity", key: "activity-2", steps: [tool("b")] },
    ]);
  });

  test("a tool with no record and approval-requested status stays out of the fold", () => {
    const waiting = tool("w", "approval-requested");
    const groups = groupActivity([tool("a"), waiting]);

    expect(groups).toEqual([
      { kind: "activity", key: "activity-0", steps: [tool("a")] },
      { kind: "part", key: "tool-trace-1", part: waiting },
    ]);
  });

  test("a resolved approval record folds even if the call still says approval-requested", () => {
    const decided = tool("d", "approval-requested", approval("approved"));

    expect(groupActivity([decided])).toEqual([
      { kind: "activity", key: "activity-0", steps: [decided] },
    ]);
  });

  test("a batch holding a call that waits stays out of the fold", () => {
    const held = batch("b", [tool("b1"), tool("b2", "approval-requested")]);

    expect(groupActivity([held])).toEqual([
      { kind: "part", key: "tool-batch-0", part: held },
    ]);
  });

  test("non-activity parts each stand alone", () => {
    const attached: ConversationPart = {
      kind: "file",
      name: "a.txt",
      mediaType: "text/plain",
    };
    const cited: ConversationPart = {
      kind: "sources",
      sources: [{ title: "Doc", url: "https://example.com" }],
    };

    expect(groupActivity([attached, cited])).toEqual([
      { kind: "part", key: "file-0", part: attached },
      { kind: "part", key: "sources-1", part: cited },
    ]);
  });

  test("a resolved approval joins the runs on either side of it", () => {
    const waiting = tool("w", "pending", approval("pending"));
    const resolved = tool("w", "running", approval("approved"));

    expect(groupActivity([tool("a"), waiting, tool("b")])).toHaveLength(3);
    expect(groupActivity([tool("a"), resolved, tool("b")])).toEqual([
      {
        kind: "activity",
        key: "activity-0",
        steps: [tool("a"), resolved, tool("b")],
      },
    ]);
  });

  test("a group's key stays put as a streaming run grows", () => {
    const first = groupActivity([text("hi"), thought()]);
    const later = groupActivity([text("hi"), thought(), tool("a"), tool("b")]);

    expect(first[1]?.key).toBe("activity-1");
    expect(later[1]?.key).toBe("activity-1");
  });
});

describe("summarizeActivity", () => {
  test("sums every known reasoning duration", () => {
    expect(summarizeActivity([thought(1500), tool("a"), thought(2500)])).toBe(
      "Thought for 4s · 1 step",
    );
  });

  test("counts each call in a batch as a step", () => {
    expect(
      summarizeActivity([
        thought(4000),
        tool("a"),
        batch("b", [tool("b1"), tool("b2")]),
      ]),
    ).toBe("Thought for 4s · 3 steps");
  });

  test("omits the time when no duration is known", () => {
    expect(summarizeActivity([thought(), tool("a"), tool("b")])).toBe(
      "Thought · 2 steps",
    );
  });

  test("ignores reasoning with no duration when another has one", () => {
    expect(summarizeActivity([thought(), thought(3000)])).toBe(
      "Thought for 3s",
    );
  });

  test("rounds short thinking up to a second", () => {
    expect(summarizeActivity([thought(200)])).toBe("Thought for 1s");
  });

  test("formats durations past a minute", () => {
    expect(summarizeActivity([thought(65_000)])).toBe("Thought for 1m 05s");
  });

  test("formats durations past an hour in hours and minutes", () => {
    expect(summarizeActivity([thought(3_599_000)])).toBe("Thought for 59m 59s");
    expect(summarizeActivity([thought(3_600_000)])).toBe("Thought for 1h 00m");
    expect(summarizeActivity([thought(5_400_000)])).toBe("Thought for 1h 30m");
  });

  test("reads as work when nothing was thought", () => {
    expect(summarizeActivity([batch("b", [tool("b1"), tool("b2")])])).toBe(
      "Worked through 2 steps",
    );
    expect(summarizeActivity([])).toBe("Worked");
  });
});
