import { describe, expect, test } from "bun:test";

import type {
  ConversationMessage,
  ConversationPart,
  PartImage,
  PartTool,
  PartToolBatch,
} from "../../../src/lib/conversation.js";
import {
  assistant,
  generatedImages,
  samples,
  toolStorm,
} from "./conversations.js";
import { playTurn, turnFrames } from "./play-turn.js";

function turn(parts: readonly ConversationPart[]): ConversationMessage {
  return {
    id: "turn",
    author: assistant,
    at: "2026-03-04T11:00:00.000Z",
    status: "sent",
    parts,
    reactions: [{ emoji: "👍", count: 1, mine: false }],
  };
}

function tool(overrides: Partial<PartTool> = {}): PartTool {
  return {
    kind: "tool-trace",
    toolCallId: "call",
    name: "runs__list",
    status: "output-available",
    input: { limit: 1 },
    output: "1 run",
    ...overrides,
  };
}

function lastPart(frame: ConversationMessage | undefined) {
  return frame?.parts.at(-1);
}

function statusesOf(part: ConversationPart | undefined) {
  return part?.kind === "tool-batch"
    ? part.tools.map((call) => call.status)
    : null;
}

/** How many frames show exactly the parts of the frame before them. */
function repeatedFrames(frames: readonly ConversationMessage[]): number {
  return frames.filter(
    (frame, index) =>
      index > 0 && Bun.deepEquals(frame.parts, frames[index - 1]?.parts),
  ).length;
}

describe("turnFrames", () => {
  test("starts empty and streaming, and ends with the message itself", () => {
    const message = turn([{ kind: "text", text: "Done." }]);
    const frames = turnFrames(message);
    expect(frames[0]).toEqual({
      id: "turn",
      author: assistant,
      at: message.at,
      status: "streaming",
      parts: [],
    });
    expect(frames.at(-1)).toBe(message);
    expect(frames.slice(0, -1).every((f) => f.status === "streaming")).toBe(
      true,
    );
  });

  test("reveals text a few words at a time", () => {
    const words = "one two three four five six seven eight nine ten";
    const frames = turnFrames(turn([{ kind: "text", text: words }]));
    expect(frames.map((frame) => lastPart(frame))).toEqual([
      undefined,
      { kind: "text", text: "one two three four" },
      { kind: "text", text: "one two three four five six seven eight" },
      { kind: "text", text: words },
    ]);
  });

  test("adds a reasoning duration only once the thinking is complete", () => {
    const thought = {
      kind: "reasoning",
      text: "a b c d e f",
      durationMs: 900,
    } as const;
    const frames = turnFrames(turn([thought, { kind: "text", text: "ok" }]));
    expect(lastPart(frames[1])).toEqual({ kind: "reasoning", text: "a b c d" });
    expect(frames[2]?.parts).toEqual([thought]);
  });

  test("runs a plain call, then settles it", () => {
    const call = tool();
    const frames = turnFrames(turn([call]));
    expect(frames.map((frame) => lastPart(frame))).toEqual([
      undefined,
      {
        kind: "tool-trace",
        toolCallId: "call",
        name: "runs__list",
        status: "running",
        input: { limit: 1 },
      },
      call,
    ]);
  });

  test("shows a resolved approval as waiting first, never as running", () => {
    const call = tool({
      status: "output-denied",
      output: undefined,
      approval: {
        id: "a",
        status: "rejected",
        scope: "once",
        timeoutAt: null,
      },
    });
    const stages = turnFrames(turn([call])).map((frame) => lastPart(frame));
    expect(stages).toHaveLength(3);
    const waiting = stages[1];
    expect(waiting?.kind === "tool-trace" && waiting.status).toBe(
      "approval-requested",
    );
    expect(waiting?.kind === "tool-trace" && waiting.approval).toEqual({
      id: "a",
      status: "pending",
      scope: null,
      timeoutAt: null,
    });
    expect(stages[2]).toBe(call);
  });

  test("shows a pending approval in its final form at once", () => {
    const pending = toolStorm.messages.at(-1);
    if (pending === undefined) throw new Error("toolStorm has no messages");
    const frames = turnFrames(pending);
    const statuses = frames.flatMap((frame) =>
      frame.parts.flatMap((part) =>
        part.kind === "tool-trace" && part.name === "mail__send"
          ? [part.status]
          : [],
      ),
    );
    expect(new Set(statuses)).toEqual(new Set(["approval-requested"]));
  });

  test("shows a queued call in its final form at once, never as running", () => {
    const queued = tool({ status: "pending", output: undefined });
    expect(turnFrames(turn([queued])).map(lastPart)).toEqual([
      undefined,
      queued,
    ]);

    const batch: PartToolBatch = {
      kind: "tool-batch",
      id: "batch",
      tools: [tool({ toolCallId: "a" }), { ...queued, toolCallId: "b" }],
    };
    const queuedStatuses = turnFrames(turn([batch])).flatMap((frame) => {
      const part = lastPart(frame);
      return part?.kind === "tool-batch" ? [part.tools[1]?.status] : [];
    });
    expect(new Set(queuedStatuses)).toEqual(new Set(["pending"]));
  });

  test("never repeats a frame after a batch call that has no stage", () => {
    const batch: PartToolBatch = {
      kind: "tool-batch",
      id: "batch",
      tools: [
        tool({ toolCallId: "a" }),
        tool({ toolCallId: "b", status: "running", output: undefined }),
        tool({ toolCallId: "c" }),
        tool({ toolCallId: "d", status: "running", output: undefined }),
      ],
    };
    const frames = turnFrames(turn([batch, { kind: "text", text: "ok" }]));
    expect(repeatedFrames(frames)).toBe(0);
    expect(frames.map((frame) => statusesOf(frame.parts[0]))).toEqual([
      null,
      ["running", "running", "running", "running"],
      ["output-available", "running", "running", "running"],
      ["output-available", "running", "output-available", "running"],
      ["output-available", "running", "output-available", "running"],
    ]);
  });

  test("never repeats a frame in any sample message", () => {
    const messages = samples.flatMap((sample) => [
      ...sample.messages,
      ...(sample.thread?.replies ?? []),
    ]);
    for (const message of messages) {
      expect(repeatedFrames(turnFrames(message))).toBe(0);
    }
  });

  test("starts every call in a batch together and finishes them one by one", () => {
    const batch: PartToolBatch = {
      kind: "tool-batch",
      id: "batch",
      tools: [tool({ toolCallId: "a" }), tool({ toolCallId: "b" })],
    };
    const stages = turnFrames(turn([batch])).map((frame) => {
      const part = lastPart(frame);
      return part?.kind === "tool-batch"
        ? part.tools.map((call) => call.status)
        : null;
    });
    expect(stages).toEqual([
      null,
      ["running", "running"],
      ["output-available", "running"],
      ["output-available", "output-available"],
    ]);
  });

  test("holds an image's space while it generates", () => {
    const images = generatedImages.messages[1]?.parts.find(
      (part): part is PartImage => part.kind === "image",
    );
    if (images === undefined) throw new Error("no image part in the sample");
    const frames = turnFrames(turn([images]));
    expect(lastPart(frames[1])).toEqual({
      kind: "image",
      id: images.id,
      prompt: images.prompt,
      state: "generating",
      images: [],
      expected: { count: 4, width: 1536, height: 1024 },
    });
    expect(lastPart(frames[2])).toBe(images);
  });

  test("skips the generating frame when no image arrived", () => {
    const failed: PartImage = {
      kind: "image",
      id: "img",
      prompt: "p",
      state: "error",
      images: [],
    };
    expect(turnFrames(turn([failed])).map(lastPart)).toEqual([
      undefined,
      failed,
    ]);
  });

  test("keeps earlier parts settled while a later one streams", () => {
    const first = tool();
    const frames = turnFrames(
      turn([first, { kind: "text", text: "a b c d e f g h i" }]),
    );
    for (const frame of frames.slice(2)) expect(frame.parts[0]).toBe(first);
  });
});

describe("playTurn", () => {
  const message = turn([{ kind: "text", text: "a b c d e f g h i j" }]);

  test("delivers every frame in order, the first at once", async () => {
    const seen: ConversationMessage[] = [];
    const finished = new Promise<void>((resolve) => {
      playTurn(
        message,
        (frame) => {
          seen.push(frame);
          if (frame === message) resolve();
        },
        { stepMs: 1 },
      );
      expect(seen).toHaveLength(1);
    });
    await finished;
    expect(seen).toEqual([...turnFrames(message)]);
  });

  test("delivers nothing after stop", async () => {
    const seen: ConversationMessage[] = [];
    const stop = playTurn(message, (frame) => seen.push(frame), { stepMs: 1 });
    stop();
    stop();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(seen).toHaveLength(1);
  });

  test("stops when the frame handler calls stop", async () => {
    const seen: ConversationMessage[] = [];
    let stop = () => {};
    stop = playTurn(
      message,
      (frame) => {
        seen.push(frame);
        if (seen.length === 2) stop();
      },
      { stepMs: 1 },
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(seen).toHaveLength(2);
  });
});
