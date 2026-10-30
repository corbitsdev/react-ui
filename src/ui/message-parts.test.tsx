import { act, useState } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "bun:test";

import { isAwaitingApproval } from "../lib/conversation-activity.js";

import type {
  ConversationMessageStatus,
  ConversationPart,
  PartImage,
  PartTool,
  PartToolBatch,
} from "../lib/conversation.js";
import { Message } from "./message.js";
import { MessageParts, type MessagePartsProps } from "./message-parts.js";
import { ToolApproval, type ToolApprovalDecision } from "./tool-approval.js";

type Mounted = {
  container: HTMLElement;
  render: (node: ReactElement) => void;
  unmount: () => void;
};

const mounted: Mounted[] = [];

function mount(node: ReactElement): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  const handle = {
    container,
    render: (next: ReactElement) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
  mounted.push(handle);
  return handle;
}

afterEach(() => {
  for (const handle of mounted.splice(0)) handle.unmount();
});

function inMessage(
  props: MessagePartsProps,
  status: ConversationMessageStatus = "sent",
): ReactElement {
  return (
    <Message from="agent" status={status} aria-label="Agent">
      <MessageParts {...props} />
    </Message>
  );
}

function call(id: string, overrides: Partial<PartTool> = {}): PartTool {
  return {
    kind: "tool-trace",
    toolCallId: id,
    name: `tool__${id}`,
    status: "output-available",
    output: "ok",
    ...overrides,
  };
}

function waiting(id: string): PartTool {
  return call(id, {
    status: "approval-requested",
    output: undefined,
    input: { to: "team" },
    approval: {
      id: `approval-${id}`,
      status: "pending",
      scope: null,
      timeoutAt: null,
    },
  });
}

/** The person's answer recorded on the call, as a host would. */
function settle(tool: PartTool, decision: ToolApprovalDecision): PartTool {
  if (tool.approval === undefined) throw new Error("no approval record");
  return {
    ...tool,
    status:
      decision.outcome === "approved" ? "output-available" : "output-denied",
    approval: {
      ...tool.approval,
      status: decision.outcome,
      scope: decision.scope,
    },
  };
}

/** `parts` with one call, alone or in a batch, replaced by `change(call)`. */
function updateCall(
  parts: readonly ConversationPart[],
  toolCallId: string,
  change: (tool: PartTool) => PartTool,
): readonly ConversationPart[] {
  return parts.map((part) => {
    if (part.kind === "tool-trace" && part.toolCallId === toolCallId)
      return change(part);
    if (part.kind === "tool-batch")
      return {
        ...part,
        tools: part.tools.map((tool) =>
          tool.toolCallId === toolCallId ? change(tool) : tool,
        ),
      };
    return part;
  });
}

function decideIn(
  parts: readonly ConversationPart[],
  toolCallId: string,
  decision: ToolApprovalDecision,
): readonly ConversationPart[] {
  return updateCall(parts, toolCallId, (tool) => settle(tool, decision));
}

/** The call stopped waiting with no decision, as the server records it. */
function lapseIn(
  parts: readonly ConversationPart[],
  toolCallId: string,
  status: "timeout" | "expired",
): readonly ConversationPart[] {
  return updateCall(parts, toolCallId, (tool) => {
    if (tool.approval === undefined) throw new Error("no approval record");
    return {
      ...tool,
      status: "output-denied",
      approval: { ...tool.approval, status },
    };
  });
}

/** `parts` without one call, alone or in a batch. */
function dropCall(
  parts: readonly ConversationPart[],
  toolCallId: string,
): readonly ConversationPart[] {
  return parts.flatMap((part): ConversationPart[] => {
    if (part.kind === "tool-trace")
      return part.toolCallId === toolCallId ? [] : [part];
    if (part.kind === "tool-batch")
      return [
        {
          ...part,
          tools: part.tools.filter((tool) => tool.toolCallId !== toolCallId),
        },
      ];
    return [part];
  });
}

/** A host that records each decision as soon as it is made. */
function Host({
  initial,
  ...props
}: Omit<MessagePartsProps, "parts" | "onDecide"> & {
  readonly initial: readonly ConversationPart[];
}) {
  const [parts, setParts] = useState(initial);
  return inMessage({
    ...props,
    parts,
    onDecide: (tool, decision) =>
      setParts((current) => decideIn(current, tool.toolCallId, decision)),
  });
}

function slots(container: HTMLElement): readonly string[] {
  return [...container.querySelectorAll("[data-part-key] > [data-slot]")].map(
    (element) => element.getAttribute("data-slot") ?? "",
  );
}

function button(container: ParentNode, name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (element) => element.textContent === name,
  );
  if (found === undefined) throw new Error(`expected a ${name} button`);
  return found;
}

function press(element: HTMLElement) {
  act(() => element.focus());
  act(() => element.click());
}

const IMAGES: PartImage = {
  kind: "image",
  id: "images-1",
  prompt: "A cover",
  state: "done",
  images: [
    {
      id: "image-1",
      mediaType: "image/svg+xml",
      width: 100,
      height: 100,
      alt: "Cover",
      base64: "PHN2Zy8+",
    },
  ],
};

const EVERY_KIND: readonly ConversationPart[] = [
  { kind: "event", event: "Agent joined" },
  { kind: "reasoning", text: "Plan the work.", durationMs: 2_000 },
  call("read"),
  { kind: "text", text: "Here is what I found." },
  { kind: "file", name: "a.csv", mediaType: "text/csv" },
  { kind: "file", name: "b.csv", mediaType: "text/csv" },
  IMAGES,
  { kind: "sources", sources: [{ title: "Docs", url: "https://example.com" }] },
  { kind: "block", block: { type: "chart", data: { title: "Runs" } } },
  waiting("send"),
];

describe("MessageParts", () => {
  test("maps each kind of part to its component, in order", () => {
    const { container } = mount(inMessage({ parts: EVERY_KIND }));
    expect(slots(container)).toEqual([
      "conversation-notice",
      "activity",
      "message-content",
      "attachments",
      "generated-images",
      "sources",
      "tool-approval",
    ]);
    expect(container.textContent).toContain("Thought for 2s · 1 step");
    // Consecutive files share one row of tiles.
    expect(
      container.querySelectorAll("[data-slot='attachments']"),
    ).toHaveLength(1);
    expect(
      container.querySelector("[data-slot='attachments']")?.textContent,
    ).toContain("b.csv");
    expect(
      container
        .querySelector("[data-slot='source-link']")
        ?.getAttribute("href"),
    ).toBe("https://example.com");
  });

  test("a block shows nothing until the host renders it", () => {
    const block = EVERY_KIND.filter((part) => part.kind === "block");
    const { container, render } = mount(inMessage({ parts: block }));
    expect(container.querySelector("[data-part-key]")?.textContent).toBe("");
    render(
      inMessage({
        parts: block,
        renderBlock: (part) => <p data-slot="host-block">{part.block.type}</p>,
      }),
    );
    expect(slots(container)).toEqual(["host-block"]);
  });

  test("text goes through renderMarkdown", () => {
    const { container } = mount(
      inMessage({
        parts: [{ kind: "text", text: "**bold**" }],
        renderMarkdown: (text) => <strong>{text.slice(2, -2)}</strong>,
      }),
    );
    expect(
      container.querySelector("[data-slot='message-content'] strong")
        ?.textContent,
    ).toBe("bold");
  });

  test("an override replaces its kind; undefined keeps the default, null drops it", () => {
    const { container } = mount(
      inMessage({
        parts: EVERY_KIND,
        renderText: (part) => <p data-slot="host-text">{part.text}</p>,
        renderEvent: () => undefined,
        renderSources: () => null,
        renderFiles: (files) => <p data-slot="host-files">{files.length}</p>,
      }),
    );
    expect(slots(container)).toEqual([
      "conversation-notice",
      "activity",
      "host-text",
      "host-files",
      "generated-images",
      "tool-approval",
    ]);
    expect(
      container.querySelector("[data-slot='host-files']")?.textContent,
    ).toBe("2");
  });

  test("renderStep draws the steps of an opened run", () => {
    const { container } = mount(
      inMessage({
        parts: [call("read")],
        renderStep: (step) => <span data-slot="host-step">{step.kind}</span>,
      }),
    );
    const trigger = container.querySelector<HTMLElement>(
      "[data-slot='activity-trigger']",
    );
    if (trigger === null) throw new Error("expected a trigger");
    act(() => trigger.click());
    expect(
      container.querySelector("[data-slot='host-step']")?.textContent,
    ).toBe("tool-trace");
  });

  test("the last run is live while the message streams", () => {
    const parts: readonly ConversationPart[] = [
      call("read"),
      { kind: "text", text: "So far" },
      call("fetch", { status: "running", output: undefined }),
    ];
    const { container, render } = mount(inMessage({ parts }, "streaming"));
    const triggers = () =>
      [...container.querySelectorAll("[data-slot='activity-trigger']")].map(
        (element) => element.textContent,
      );
    expect(triggers()).toEqual(["Worked through 1 step", "tool__fetch…"]);
    render(inMessage({ parts, streaming: false }, "streaming"));
    expect(triggers()).toEqual([
      "Worked through 1 step",
      "Worked through 1 step",
    ]);
  });

  test("choosing an image reports its part and index", () => {
    const opened: [string, number][] = [];
    const { container } = mount(
      inMessage({
        parts: [IMAGES],
        onOpenImage: (part, index) => opened.push([part.id, index]),
      }),
    );
    const open = container.querySelector<HTMLElement>(
      "[data-slot='generated-image-open']",
    );
    if (open === null) throw new Error("expected an open control");
    act(() => open.click());
    expect(opened).toEqual([["images-1", 0]]);
  });
});

describe("MessageParts focus after a decision", () => {
  const RUN_THEN_WAIT: readonly ConversationPart[] = [
    call("draft"),
    waiting("send"),
  ];

  for (const name of ["Approve", "Approve always", "Deny"]) {
    test(`${name} folds the call and focus lands on the run's trigger`, () => {
      const { container } = mount(<Host initial={RUN_THEN_WAIT} />);
      press(button(container, name));
      expect(container.querySelector("[data-slot='tool-approval']")).toBeNull();
      const active = document.activeElement as HTMLElement | null;
      expect(active?.dataset["slot"]).toBe("activity-trigger");
      expect(active?.textContent).toContain("Worked through 2 steps");
    });
  }

  test("a call with no run before it lands on the run it starts", () => {
    const { container } = mount(
      <Host
        initial={[{ kind: "text", text: "Sending now." }, waiting("send")]}
      />,
    );
    press(button(container, "Approve"));
    const active = document.activeElement as HTMLElement | null;
    expect(active?.dataset["slot"]).toBe("activity-trigger");
    expect(active?.textContent).toContain("Worked through 1 step");
  });

  test("in a batch, focus moves to the next call still waiting, then to the run", () => {
    const batch: PartToolBatch = {
      kind: "tool-batch",
      id: "batch-1",
      tools: [waiting("one"), call("two"), waiting("three")],
    };
    const { container } = mount(<Host initial={[call("draft"), batch]} />);
    const cards = () => [
      ...container.querySelectorAll(
        "[data-slot='tool-approval'][data-status='pending']",
      ),
    ];
    expect(cards()).toHaveLength(2);

    press(button(container, "Deny"));
    expect(cards()).toHaveLength(1);
    const next = document.activeElement as HTMLElement | null;
    expect(next?.dataset["slot"]).toBe("tool-approval-card");
    expect(cards()[0]?.contains(next)).toBe(true);

    press(button(container, "Approve"));
    const active = document.activeElement as HTMLElement | null;
    expect(active?.dataset["slot"]).toBe("activity-trigger");
    expect(active?.textContent).toContain("Worked through 4 steps");
  });

  test("the next waiting call wraps to the first when the decided one was last", () => {
    const batch: PartToolBatch = {
      kind: "tool-batch",
      id: "batch-1",
      tools: [waiting("one"), waiting("two")],
    };
    const { container } = mount(<Host initial={[batch]} />);
    const last = [
      ...container.querySelectorAll("[data-slot='tool-approval']"),
    ].at(-1);
    if (last === undefined) throw new Error("expected two cards");
    press(button(last, "Approve"));
    const active = document.activeElement as HTMLElement | null;
    expect(active?.dataset["slot"]).toBe("tool-approval-card");
    expect(
      container
        .querySelector("[data-slot='tool-approval'][data-status='pending']")
        ?.contains(active),
    ).toBe(true);
  });

  test("a host's batch card without the card slot gets its first button", () => {
    const batch: PartToolBatch = {
      kind: "tool-batch",
      id: "batch-1",
      tools: [waiting("one"), waiting("two")],
    };
    const { container } = mount(
      <Host
        initial={[call("draft"), batch]}
        renderBatch={(part, decide) => (
          <ol>
            {part.tools.filter(isAwaitingApproval).map((tool) => (
              <li
                key={tool.toolCallId}
                data-slot="tool-approval"
                data-status="pending"
              >
                <button
                  type="button"
                  onClick={() =>
                    decide(tool, { outcome: "approved", scope: "once" })
                  }
                >
                  {`Run ${tool.name}`}
                </button>
              </li>
            ))}
          </ol>
        )}
      />,
    );
    press(button(container, "Run tool__one"));
    expect(document.activeElement).toBe(button(container, "Run tool__two"));
  });

  test("a decision the host records later moves focus once it shows", () => {
    const decisions: ToolApprovalDecision[] = [];
    const props = (parts: readonly ConversationPart[]) =>
      inMessage({ parts, onDecide: (_, decision) => decisions.push(decision) });
    const { container, render } = mount(props(RUN_THEN_WAIT));
    const approve = button(container, "Approve");
    press(approve);
    // Not recorded yet: the buttons stay and keep focus.
    render(props(RUN_THEN_WAIT));
    expect(document.activeElement).toBe(approve);

    const [decision] = decisions;
    if (decision === undefined) throw new Error("expected a decision");
    render(props(decideIn(RUN_THEN_WAIT, "send", decision)));
    expect(
      (document.activeElement as HTMLElement | null)?.dataset["slot"],
    ).toBe("activity-trigger");
  });

  test("focus that went somewhere else stays there", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    const decisions: ToolApprovalDecision[] = [];
    const props = (parts: readonly ConversationPart[]) =>
      inMessage({ parts, onDecide: (_, decision) => decisions.push(decision) });
    const { container, render } = mount(props(RUN_THEN_WAIT));
    press(button(container, "Approve"));
    act(() => outside.focus());
    const [decision] = decisions;
    if (decision === undefined) throw new Error("expected a decision");
    render(props(decideIn(RUN_THEN_WAIT, "send", decision)));
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  test("focus that left for the page before the decision shows stays there", () => {
    const decisions: ToolApprovalDecision[] = [];
    const props = (parts: readonly ConversationPart[]) =>
      inMessage({ parts, onDecide: (_, decision) => decisions.push(decision) });
    const { container, render } = mount(props(RUN_THEN_WAIT));
    press(button(container, "Approve"));
    // A click on blank page: focus leaves to nothing.
    act(() => (document.activeElement as HTMLElement).blur());
    const [decision] = decisions;
    if (decision === undefined) throw new Error("expected a decision");
    render(props(decideIn(RUN_THEN_WAIT, "send", decision)));
    expect(document.activeElement).toBe(document.body);
  });

  test("a decision recorded while the window is away still moves focus", () => {
    const decisions: ToolApprovalDecision[] = [];
    const props = (parts: readonly ConversationPart[]) =>
      inMessage({ parts, onDecide: (_, decision) => decisions.push(decision) });
    const { container, render } = mount(props(RUN_THEN_WAIT));
    press(button(container, "Approve"));
    // Another tab or window takes focus: the button blurs to nothing.
    const hasFocus = document.hasFocus;
    document.hasFocus = () => false;
    try {
      act(() => (document.activeElement as HTMLElement).blur());
      const [decision] = decisions;
      if (decision === undefined) throw new Error("expected a decision");
      render(props(decideIn(RUN_THEN_WAIT, "send", decision)));
    } finally {
      document.hasFocus = hasFocus;
    }
    expect(
      (document.activeElement as HTMLElement | null)?.dataset["slot"],
    ).toBe("activity-trigger");
  });

  test("a host's renderApproval gets the handoff through decide", () => {
    const { container } = mount(
      <Host
        initial={RUN_THEN_WAIT}
        renderApproval={(part, decide) => (
          <ToolApproval
            part={part}
            onDecide={decide}
            labels={{ approve: "Go" }}
          />
        )}
      />,
    );
    press(button(container, "Go"));
    expect(
      (document.activeElement as HTMLElement | null)?.dataset["slot"],
    ).toBe("activity-trigger");
  });
});

describe("MessageParts focus when a call stops waiting with no decision", () => {
  const RUN_THEN_WAIT: readonly ConversationPart[] = [
    call("draft"),
    waiting("send"),
  ];
  const props = (parts: readonly ConversationPart[]) =>
    inMessage({ parts, onDecide: () => {} });
  const activeSlot = () =>
    (document.activeElement as HTMLElement | null)?.dataset["slot"];

  for (const status of ["timeout", "expired"] as const) {
    test(`a call that ends ${status} with focus on its buttons hands focus to the run`, () => {
      const { container, render } = mount(props(RUN_THEN_WAIT));
      act(() => button(container, "Approve").focus());
      render(props(lapseIn(RUN_THEN_WAIT, "send", status)));
      expect(container.querySelector("[data-slot='tool-approval']")).toBeNull();
      expect(activeSlot()).toBe("activity-trigger");
      expect(document.activeElement?.textContent).toContain(
        "Worked through 2 steps",
      );
    });
  }

  test("in a batch, focus moves to the next call still waiting, then to the run", () => {
    const batch: PartToolBatch = {
      kind: "tool-batch",
      id: "batch-1",
      tools: [waiting("one"), call("two"), waiting("three")],
    };
    const initial: readonly ConversationPart[] = [call("draft"), batch];
    const { container, render } = mount(props(initial));
    act(() => button(container, "Deny").focus());
    const first = lapseIn(initial, "one", "timeout");
    render(props(first));
    const next = document.activeElement as HTMLElement | null;
    expect(next?.dataset["slot"]).toBe("tool-approval-card");
    expect(
      container
        .querySelector("[data-slot='tool-approval'][data-status='pending']")
        ?.contains(next),
    ).toBe(true);

    render(props(lapseIn(first, "three", "expired")));
    expect(activeSlot()).toBe("activity-trigger");
    expect(document.activeElement?.textContent).toContain(
      "Worked through 4 steps",
    );
  });

  test("a batch that times out with focus on its header hands focus to the run", () => {
    const batch: PartToolBatch = {
      kind: "tool-batch",
      id: "batch-1",
      tools: [call("one"), waiting("two")],
    };
    const initial: readonly ConversationPart[] = [call("draft"), batch];
    const { container, render } = mount(props(initial));
    const header = container.querySelector<HTMLElement>(
      "[data-slot='tool-group-header']",
    );
    if (header === null) throw new Error("expected a tool group header");
    act(() => header.focus());
    expect(document.activeElement).toBe(header);

    render(props(lapseIn(initial, "two", "timeout")));
    expect(container.querySelector("[data-slot='tool-group']")).toBeNull();
    expect(activeSlot()).toBe("activity-trigger");
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement?.textContent).toContain(
      "Worked through 3 steps",
    );
  });

  test("after a decision in a batch, the next call lapsing under focus hands focus to the run", () => {
    const batch: PartToolBatch = {
      kind: "tool-batch",
      id: "batch-1",
      tools: [waiting("one"), waiting("two")],
    };
    const initial: readonly ConversationPart[] = [call("draft"), batch];
    const decisions: ToolApprovalDecision[] = [];
    const recording = (parts: readonly ConversationPart[]) =>
      inMessage({ parts, onDecide: (_, decision) => decisions.push(decision) });
    const { container, render } = mount(recording(initial));
    press(button(container, "Deny"));
    const [decision] = decisions;
    if (decision === undefined) throw new Error("expected a decision");
    const decided = decideIn(initial, "one", decision);
    render(recording(decided));
    const next = document.activeElement as HTMLElement | null;
    expect(next?.dataset["slot"]).toBe("tool-approval-card");
    expect(
      container.querySelector(
        "[data-slot='tool-approval'][data-status='pending']",
      )?.textContent,
    ).toContain("tool__two");

    render(recording(lapseIn(decided, "two", "expired")));
    expect(activeSlot()).toBe("activity-trigger");
    expect(document.activeElement?.textContent).toContain(
      "Worked through 3 steps",
    );
  });

  test("a decision the host never records does not hide a later call lapsing under focus", () => {
    const initial: readonly ConversationPart[] = [
      call("draft"),
      waiting("first"),
      { kind: "text", text: "And then" },
      waiting("second"),
    ];
    const { container, render } = mount(props(initial));
    const cards = () => [
      ...container.querySelectorAll<HTMLElement>("[data-slot='tool-approval']"),
    ];
    const [first, second] = cards();
    if (first === undefined || second === undefined)
      throw new Error("expected two cards");
    // The host's request fails: the first call stays waiting for good.
    press(button(first, "Approve"));
    act(() => button(second, "Approve").focus());
    render(props(lapseIn(initial, "second", "timeout")));
    // The lapsed call folds into a run of its own, after the text.
    const triggers = [
      ...container.querySelectorAll("[data-slot='activity-trigger']"),
    ];
    expect(activeSlot()).toBe("activity-trigger");
    expect(triggers.indexOf(document.activeElement as Element)).toBe(1);
  });

  test("an earlier decision recorded as the focused call lapses hands focus from where it was", () => {
    const initial: readonly ConversationPart[] = [
      call("draft"),
      waiting("first"),
      { kind: "text", text: "And then" },
      waiting("second"),
    ];
    const { container, render } = mount(props(initial));
    const [first, second] = [
      ...container.querySelectorAll<HTMLElement>("[data-slot='tool-approval']"),
    ];
    if (first === undefined || second === undefined)
      throw new Error("expected two cards");
    press(button(first, "Approve"));
    act(() => button(second, "Approve").focus());
    // One update records the first decision and lapses the second call.
    const decided = decideIn(initial, "first", {
      outcome: "approved",
      scope: "once",
    });
    render(props(lapseIn(decided, "second", "timeout")));
    const triggers = [
      ...container.querySelectorAll("[data-slot='activity-trigger']"),
    ];
    expect(activeSlot()).toBe("activity-trigger");
    expect(triggers.indexOf(document.activeElement as Element)).toBe(1);
  });

  test("focus that left the buttons for the page is not pulled back", () => {
    const { container, render } = mount(props(RUN_THEN_WAIT));
    act(() => button(container, "Approve").focus());
    // A click on blank page: focus leaves to nothing.
    act(() => (document.activeElement as HTMLElement).blur());
    render(props(lapseIn(RUN_THEN_WAIT, "send", "timeout")));
    expect(document.activeElement).toBe(document.body);
  });

  test("focus elsewhere in the message is not moved", () => {
    const { container, render } = mount(props(RUN_THEN_WAIT));
    act(() => button(container, "Approve").focus());
    const trigger = container.querySelector<HTMLElement>(
      "[data-slot='activity-trigger']",
    );
    if (trigger === null) throw new Error("expected a trigger");
    act(() => trigger.focus());
    render(props([call("draft")]));
    expect(document.activeElement).toBe(trigger);
  });
});

describe("MessageParts focus while a call waits", () => {
  const props = (parts: readonly ConversationPart[]) =>
    inMessage({ parts, onDecide: () => {} });

  test("a waiting call keeps focus when the host drops a part before it", () => {
    const initial: readonly ConversationPart[] = [
      { kind: "text", text: "Sending now." },
      waiting("send"),
    ];
    const { container, render } = mount(props(initial));
    const approve = button(container, "Approve");
    act(() => approve.focus());
    render(props(initial.slice(1)));
    expect(document.activeElement).toBe(approve);
  });

  test("a waiting batch keeps focus when the host drops a part before it", () => {
    const batch: PartToolBatch = {
      kind: "tool-batch",
      id: "batch-1",
      tools: [waiting("one"), waiting("two")],
    };
    const initial: readonly ConversationPart[] = [
      { kind: "event", event: "Agent joined" },
      batch,
    ];
    const { container, render } = mount(props(initial));
    const deny = button(container, "Deny");
    act(() => deny.focus());
    render(props(initial.slice(1)));
    expect(document.activeElement).toBe(deny);
  });
});

describe("MessageParts focus when the host drops the decided call", () => {
  /** A host that records a decision by removing the call from `parts`. */
  function Dropper({
    initial,
    ...props
  }: Omit<MessagePartsProps, "parts" | "onDecide"> & {
    readonly initial: readonly ConversationPart[];
  }) {
    const [parts, setParts] = useState(initial);
    return inMessage({
      ...props,
      parts,
      onDecide: (tool) =>
        setParts((current) => dropCall(current, tool.toolCallId)),
    });
  }

  test("focus lands on the run the call sat under", () => {
    const { container } = mount(
      <Dropper initial={[call("draft"), waiting("send")]} />,
    );
    press(button(container, "Approve"));
    const active = document.activeElement as HTMLElement | null;
    expect(active?.dataset["slot"]).toBe("activity-trigger");
    expect(active?.textContent).toContain("Worked through 1 step");
  });

  test("in a batch, focus moves to the call still waiting", () => {
    const batch: PartToolBatch = {
      kind: "tool-batch",
      id: "batch-1",
      tools: [waiting("one"), waiting("two")],
    };
    const { container } = mount(<Dropper initial={[call("draft"), batch]} />);
    press(button(container, "Approve"));
    const active = document.activeElement as HTMLElement | null;
    expect(active?.dataset["slot"]).toBe("tool-approval-card");
    expect(
      container
        .querySelector("[data-slot='tool-approval'][data-status='pending']")
        ?.contains(active),
    ).toBe(true);
  });

  test("in a host's renderBatch, focus moves to the call that waited after the dropped one", () => {
    const batch: PartToolBatch = {
      kind: "tool-batch",
      id: "batch-1",
      tools: [waiting("one"), waiting("two"), waiting("three")],
    };
    const { container } = mount(
      <Dropper
        initial={[call("draft"), batch]}
        renderBatch={(part, decide) => (
          <ol>
            {part.tools.map((tool) => (
              <li key={tool.toolCallId}>
                <ToolApproval
                  part={tool}
                  onDecide={(decision) => decide(tool, decision)}
                />
              </li>
            ))}
          </ol>
        )}
      />,
    );
    const cards = () => [
      ...container.querySelectorAll(
        "[data-slot='tool-approval'][data-status='pending']",
      ),
    ];
    const middle = cards()[1];
    if (middle === undefined) throw new Error("expected three cards");
    press(button(middle, "Approve"));
    const active = document.activeElement as HTMLElement | null;
    expect(active?.dataset["slot"]).toBe("tool-approval-card");
    expect(cards()[1]?.contains(active)).toBe(true);
    expect(cards()[1]?.textContent).toContain("tool__three");
  });

  test("with nothing before it, focus goes to the message's first control", () => {
    const { container } = mount(
      <Dropper
        initial={[
          waiting("send"),
          { kind: "text", text: "Then" },
          call("after"),
        ]}
      />,
    );
    press(button(container, "Approve"));
    const active = document.activeElement as HTMLElement | null;
    expect(active?.dataset["slot"]).toBe("activity-trigger");
    expect(active?.textContent).toContain("Worked through 1 step");
  });
});
