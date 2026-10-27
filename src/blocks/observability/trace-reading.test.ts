import { describe, expect, test } from "bun:test";

import type { Span } from "../../ui/observability/model.js";
import { placeSpans } from "../../ui/observability/tree.js";
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

  test("reads turns that share a start in step order", () => {
    const [left, right] = namesThatTieBreakApart();
    const spans = [
      turn(left, 0, `Ask from ${left}`, `Reply from ${left}`),
      turn(right, 0, `Ask from ${right}`, `Reply from ${right}`),
    ];
    const turns = placeSpans(spans).filter((row) => row.span.kind === "turn");
    const first = turns[0];
    const last = turns[turns.length - 1];
    if (first === undefined || last === undefined) {
      throw new Error("expected two turns");
    }
    const reading = turnReading(spans);
    expect(reading.question).toBe(first.span.input);
    expect(reading.answer).toBe(last.span.output);
  });
});

/** Two names `<` and `localeCompare` order differently. */
function namesThatTieBreakApart(): readonly [string, string] {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  for (const left of letters) {
    for (const right of letters) {
      if (left === right) continue;
      const codeUnit = left < right ? -1 : 1;
      if (codeUnit !== Math.sign(left.localeCompare(right))) {
        return [left, right];
      }
    }
  }
  throw new Error("expected names whose orders disagree");
}

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
