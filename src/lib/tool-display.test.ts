import { describe, expect, test } from "bun:test";

import type { PartTool } from "./conversation.js";
import {
  countFailedTools,
  displayedToolStatus,
  formatToolValue,
} from "./tool-display.js";

function tool(overrides: Partial<PartTool> = {}): PartTool {
  return {
    kind: "tool-trace",
    toolCallId: "call",
    name: "files__read",
    status: "output-available",
    ...overrides,
  };
}

describe("displayedToolStatus", () => {
  test("a call with no record shows its own status", () => {
    expect(displayedToolStatus(tool({ status: "running" }))).toBe("running");
    expect(displayedToolStatus(tool({ status: "approval-requested" }))).toBe(
      "approval-requested",
    );
  });

  test("a pending record waits whatever the call's status says", () => {
    const part = tool({
      status: "running",
      approval: { id: "a", status: "pending", scope: null, timeoutAt: null },
    });
    expect(displayedToolStatus(part)).toBe("approval-requested");
  });

  test("a settled record ends the wait even when the status still asks", () => {
    const asking = (status: "approved" | "rejected" | "timeout" | "expired") =>
      tool({
        status: "approval-requested",
        approval: { id: "a", status, scope: null, timeoutAt: null },
      });
    expect(displayedToolStatus(asking("approved"))).toBe("pending");
    expect(displayedToolStatus(asking("rejected"))).toBe("output-denied");
    expect(displayedToolStatus(asking("timeout"))).toBe("output-denied");
    expect(displayedToolStatus(asking("expired"))).toBe("output-denied");
  });

  test("a settled record leaves an execution status alone", () => {
    const part = tool({
      status: "error",
      approval: { id: "a", status: "approved", scope: "once", timeoutAt: null },
    });
    expect(displayedToolStatus(part)).toBe("error");
  });
});

describe("countFailedTools", () => {
  test("counts failed calls, including each one inside a batch", () => {
    expect(
      countFailedTools([
        { kind: "reasoning", text: "Plan" },
        tool({ status: "error" }),
        tool(),
        {
          kind: "tool-batch",
          id: "batch",
          tools: [tool({ status: "error" }), tool({ status: "error" }), tool()],
        },
      ]),
    ).toBe(3);
  });
});

describe("formatToolValue", () => {
  test("keeps strings and indents everything else as JSON", () => {
    expect(formatToolValue("plain")).toBe("plain");
    expect(formatToolValue({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  test("falls back to String for values JSON cannot hold", () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(formatToolValue(circular)).toBe("[object Object]");
    expect(formatToolValue(10n)).toBe("10");
    expect(formatToolValue(undefined)).toBe("undefined");
  });
});
