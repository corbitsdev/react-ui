import { describe, expect, test } from "bun:test";

import type { Span } from "./model.js";
import { stepTitle } from "./wording.js";

function toolSpan(input: string, label?: string): Span {
  const span: Span = {
    id: "span-1",
    parentId: null,
    kind: "tool",
    name: "Bash",
    status: "ok",
    startMs: 0,
    durationMs: 1,
    input,
  };
  if (label === undefined) return span;
  return { ...span, label };
}

describe("stepTitle", () => {
  test("a label wins over the command", () => {
    const input = JSON.stringify({ command: "ls -la" });
    expect(stepTitle(toolSpan(input, "List files"))).toBe("List files");
  });

  test("a multiline command keeps the first line", () => {
    const command = "git status\ngit diff";
    const input = JSON.stringify({ command });
    expect(stepTitle(toolSpan(input))).toBe("git status");
    expect(JSON.parse(input).command).toBe(command);
  });

  test("a command of 80 characters stays whole", () => {
    const command = "b".repeat(80);
    const input = JSON.stringify({ cmd: command });
    expect(stepTitle(toolSpan(input))).toBe(command);
    expect(JSON.parse(input).cmd).toBe(command);
  });

  test("a blank command falls through to the step name", () => {
    expect(stepTitle(toolSpan(JSON.stringify({ command: "  \nls" })))).toBe(
      "Bash",
    );
  });

  test("a longer command is clipped", () => {
    const command = `  ${"a".repeat(90)}  \nrest`;
    const input = JSON.stringify({ command });
    expect(stepTitle(toolSpan(input))).toBe(`${"a".repeat(77)}…`);
    expect(JSON.parse(input).command).toBe(command);
  });
});
