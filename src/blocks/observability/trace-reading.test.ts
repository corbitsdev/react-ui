import { describe, expect, test } from "bun:test";

import type { Span } from "../../ui/observability/model.js";
import { turnReading } from "./trace-reading.js";

describe("turnReading", () => {
  test("keeps the first prompt and the last reply", () => {
    const reading = turnReading([
      turn("late", 40, "Second ask", "The parser drops the comma."),
      turn("early", 10, "Review the diff.", "I will look."),
      tool("grep", 20, "12 matches."),
    ]);
    expect(reading.question).toBe("Review the diff.");
    expect(reading.answer).toBe("The parser drops the comma.");
  });

  test("skips a turn that has no text", () => {
    const reading = turnReading([
      turn("empty", 0, "   ", ""),
      turn("real", 5, "Review the diff.", "Done."),
    ]);
    expect(reading.question).toBe("Review the diff.");
    expect(reading.answer).toBe("Done.");
  });

  test("a tool reply is not the answer", () => {
    const reading = turnReading([tool("shell", 0, "1 failed.")]);
    expect(reading.question).toBeUndefined();
    expect(reading.answer).toBeUndefined();
  });
});

function turn(
  id: string,
  startMs: number,
  input: string,
  output: string,
): Span {
  return {
    id,
    parentId: null,
    kind: "turn",
    name: id,
    status: "ok",
    startMs,
    durationMs: 1,
    input,
    output,
  };
}

function tool(id: string, startMs: number, output: string): Span {
  return {
    id,
    parentId: null,
    kind: "tool",
    name: id,
    status: "ok",
    startMs,
    durationMs: 1,
    output,
  };
}
