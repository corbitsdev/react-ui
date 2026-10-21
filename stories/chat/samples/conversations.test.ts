import { describe, expect, test } from "bun:test";

import { isAwaitingApproval } from "../../../src/lib/conversation-activity.js";
import type {
  ConversationMessage,
  ConversationPart,
  PartTool,
} from "../../../src/lib/conversation.js";
import {
  SAMPLE_NOW,
  failedSend,
  generatedImages,
  longChat,
  samples,
  toolStorm,
  withThread,
} from "./conversations.js";

function everyMessage(sample: (typeof samples)[number]) {
  return [...sample.messages, ...(sample.thread?.replies ?? [])];
}

function toolsOf(parts: readonly ConversationPart[]): readonly PartTool[] {
  return parts.flatMap((part) => {
    if (part.kind === "tool-trace") return [part];
    if (part.kind === "tool-batch") return part.tools;
    return [];
  });
}

function allParts(messages: readonly ConversationMessage[]) {
  return messages.flatMap((message) => message.parts);
}

describe.each(samples.map((sample) => [sample.title, sample] as const))(
  "%s",
  (_, sample) => {
    test("has unique message ids, thread included", () => {
      const ids = everyMessage(sample).map((message) => message.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    test("never goes back in time and stays before SAMPLE_NOW", () => {
      for (const list of [sample.messages, sample.thread?.replies ?? []]) {
        const times = list.map((message) => Date.parse(message.at));
        expect(times).toEqual([...times].sort((a, b) => a - b));
        for (const time of times) {
          expect(time).toBeLessThan(Date.parse(SAMPLE_NOW));
        }
      }
    });

    test("uses generic tool names and example.com sources", () => {
      const parts = allParts(everyMessage(sample));
      for (const tool of toolsOf(parts)) {
        expect(tool.name).toMatch(
          /^(runs|files|web|calendar|notes|mail|records|image)__[a-z_]+$/,
        );
      }
      for (const part of parts) {
        if (part.kind !== "sources") continue;
        for (const source of part.sources) {
          expect(new URL(source.url).hostname).toBe("example.com");
        }
      }
    });

    test("gives every image alt text and keeps it off the network", () => {
      for (const part of allParts(sample.messages)) {
        if (part.kind !== "image") continue;
        for (const image of part.images) {
          expect(image.alt).toBeTruthy();
          if (image.url !== undefined) {
            expect(image.url.startsWith("data:")).toBe(true);
          }
        }
      }
    });
  },
);

test("samples read no randomness and no clock", async () => {
  const source = await Bun.file(
    new URL("./conversations.ts", import.meta.url),
  ).text();
  expect(source).not.toMatch(/Math\.random|Date\.now|new Date\(\)/);
});

test("longChat holds a few hundred messages across more than one day", () => {
  expect(longChat.messages.length).toBeGreaterThanOrEqual(200);
  const days = new Set(
    longChat.messages.map((message) => message.at.slice(0, 10)),
  );
  expect(days.size).toBeGreaterThan(1);
});

test("toolStorm covers a batch, a failure and every approval outcome", () => {
  const parts = allParts(toolStorm.messages);
  expect(parts.some((part) => part.kind === "tool-batch")).toBe(true);
  const tools = toolsOf(parts);
  expect(tools.length).toBeGreaterThan(40);
  expect(tools.some((tool) => tool.status === "error")).toBe(true);
  expect(new Set(tools.map((tool) => tool.approval?.status))).toEqual(
    new Set([
      undefined,
      "pending",
      "approved",
      "rejected",
      "timeout",
      "expired",
    ]),
  );
  expect(
    new Set(tools.map((tool) => tool.approval?.scope).filter(Boolean)),
  ).toEqual(new Set(["once", "always"]));
  expect(tools.filter(isAwaitingApproval)).toHaveLength(1);
});

test("toolStorm's calls that never ran carry no output", () => {
  for (const tool of toolsOf(allParts(toolStorm.messages))) {
    if (tool.status === "output-denied") {
      expect(tool.output).toBeUndefined();
    }
  }
});

test("generatedImages covers both storage forms and every image state", () => {
  const images = allParts(generatedImages.messages).flatMap((part) =>
    part.kind === "image" ? [part] : [],
  );
  expect(new Set(images.map((part) => part.state))).toEqual(
    new Set(["done", "generating", "error"]),
  );
  const stored = images.flatMap((part) => part.images);
  expect(stored.some((image) => image.base64 !== undefined)).toBe(true);
  expect(stored.some((image) => image.url !== undefined)).toBe(true);
  const generating = images.find((part) => part.state === "generating");
  expect(generating?.expected?.count).toBeGreaterThan(0);
});

test("withThread's reply summary matches its thread", () => {
  const thread = withThread.thread;
  if (thread === undefined) throw new Error("withThread has no thread");
  const parent = withThread.messages.find(
    (message) => message.id === thread.parentId,
  );
  expect(parent?.replies).toEqual({
    count: thread.replies.length,
    lastAt: thread.replies.at(-1)?.at ?? "",
  });
});

test("failedSend has a failed send with a reason and one still sending", () => {
  const failed = failedSend.messages.find(
    (message) => message.status === "failed",
  );
  expect(failed?.error).toBeTruthy();
  expect(failedSend.messages.some((m) => m.status === "sending")).toBe(true);
});
