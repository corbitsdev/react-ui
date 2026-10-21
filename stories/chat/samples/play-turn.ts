/**
 * Replays a finished message as if it were arriving, for streaming stories:
 * text and thinking appear a few words at a time, tool calls start running
 * and then settle, a batch's calls finish one by one, and images hold their
 * space while they generate.
 */

import type {
  ConversationMessage,
  ConversationPart,
  PartImage,
  PartTool,
} from "../../../src/lib/conversation.js";

const WORDS_PER_FRAME = 4;

function prefixes(value: string): readonly string[] {
  const words = value.split(" ");
  const shown: string[] = [];
  for (
    let count = WORDS_PER_FRAME;
    count < words.length;
    count += WORDS_PER_FRAME
  ) {
    shown.push(words.slice(0, count).join(" "));
  }
  return shown;
}

/**
 * The forms a tool call takes before its final one. A call with an approval
 * record first waits on a person and never shows as running; a call without
 * one runs, then settles.
 */
function toolStages(part: PartTool): readonly PartTool[] {
  if (part.approval !== undefined) {
    if (part.approval.status === "pending") return [];
    return [
      {
        kind: "tool-trace",
        toolCallId: part.toolCallId,
        name: part.name,
        status: "approval-requested",
        input: part.input,
        approval: { ...part.approval, status: "pending", scope: null },
      },
    ];
  }
  if (part.status === "approval-requested" || part.status === "running") {
    return [];
  }
  return [
    {
      kind: "tool-trace",
      toolCallId: part.toolCallId,
      name: part.name,
      status: "running",
      input: part.input,
    },
  ];
}

function imageStages(part: PartImage): readonly PartImage[] {
  const [first] = part.images;
  if (part.state !== "done" || first === undefined) return [];
  return [
    {
      kind: "image",
      id: part.id,
      prompt: part.prompt,
      state: "generating",
      images: [],
      expected: {
        count: part.images.length,
        width: first.width,
        height: first.height,
      },
    },
  ];
}

/** The forms a part takes before its final one, oldest first. */
function partStages(part: ConversationPart): readonly ConversationPart[] {
  switch (part.kind) {
    case "text":
      return prefixes(part.text).map((shown) => ({
        kind: "text",
        text: shown,
      }));
    case "reasoning":
      // The duration is only known once the thinking is done.
      return prefixes(part.text).map((shown) => ({
        kind: "reasoning",
        text: shown,
      }));
    case "tool-trace":
      return toolStages(part);
    case "tool-batch": {
      // Every call starts together, then they finish one at a time.
      const started = part.tools.map((tool) => toolStages(tool)[0] ?? tool);
      return part.tools.map((_, finished) => ({
        ...part,
        tools: part.tools.map((tool, index) =>
          index < finished ? tool : (started[index] ?? tool),
        ),
      }));
    }
    case "image":
      return imageStages(part);
    default:
      return [];
  }
}

/**
 * Every frame of `message` arriving, from an empty streaming message to the
 * message itself. The last frame is `message`, the same object.
 */
export function turnFrames(
  message: ConversationMessage,
): readonly ConversationMessage[] {
  const streaming = (
    parts: readonly ConversationPart[],
  ): ConversationMessage => ({
    id: message.id,
    author: message.author,
    at: message.at,
    status: "streaming",
    parts,
  });
  const frames = [streaming([])];
  message.parts.forEach((part, index) => {
    const settled = message.parts.slice(0, index);
    for (const stage of partStages(part)) {
      frames.push(streaming([...settled, stage]));
    }
    if (index < message.parts.length - 1) {
      frames.push(streaming(message.parts.slice(0, index + 1)));
    }
  });
  frames.push(message);
  return frames;
}

export type PlayTurnOptions = {
  /** Milliseconds between frames. */
  readonly stepMs?: number;
};

/**
 * Plays `message` in: calls `onFrame` with the first frame at once and each
 * later frame `stepMs` apart, ending with `message` itself. Returns a stop
 * function; after it is called no further frame is delivered.
 */
export function playTurn(
  message: ConversationMessage,
  onFrame: (frame: ConversationMessage) => void,
  { stepMs = 60 }: PlayTurnOptions = {},
): () => void {
  const frames = turnFrames(message);
  let next = 0;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const emit = () => {
    const frame = frames[next];
    if (stopped || frame === undefined) return;
    next += 1;
    onFrame(frame);
    // `onFrame` may itself call stop.
    if (!stopped && next < frames.length) timer = setTimeout(emit, stepMs);
  };
  emit();

  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
