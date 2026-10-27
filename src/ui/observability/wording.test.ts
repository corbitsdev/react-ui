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

  test("a command cut inside an emoji keeps the code point", () => {
    const command = `${"a".repeat(76)}\u{1F600}${"b".repeat(20)}`;
    const input = JSON.stringify({ command });
    const span = toolSpan(input);
    const title = stepTitle(span);
    expect(title).toBe(`${"a".repeat(76)}\u{1F600}…`);
    expect(title.endsWith("…")).toBe(true);
    expect([...title].length).toBeLessThanOrEqual(78);
    expect(loneSurrogate(title)).toBe(false);
    expect(span.input).toBe(input);
  });

  test("a reasoning cut inside an emoji keeps the code point", () => {
    const thinking = `${"c".repeat(84)}\u{1F600}${"d".repeat(20)}\nnext`;
    const span: Span = {
      id: "span-r",
      parentId: null,
      kind: "reasoning",
      name: "Think",
      status: "ok",
      startMs: 0,
      durationMs: 1,
      thinking,
    };
    const title = stepTitle(span);
    expect(title).toBe(`${"c".repeat(84)}\u{1F600}…`);
    expect(title.endsWith("…")).toBe(true);
    expect([...title].length).toBeLessThanOrEqual(86);
    expect(loneSurrogate(title)).toBe(false);
    expect(span.thinking).toBe(thinking);
  });
});

function loneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const high = code >= 0xd800 && code <= 0xdbff;
    const low = code >= 0xdc00 && code <= 0xdfff;
    if (high) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
      continue;
    }
    if (low) return true;
  }
  return false;
}
