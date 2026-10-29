import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import type { ActivityStep } from "../lib/conversation-activity.js";
import type { PartReasoning, PartTool } from "../lib/conversation.js";
import { Activity, ActivityContent, ActivityTrigger } from "./activity.js";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "./reasoning.js";

type Mounted = {
  container: HTMLElement;
  render: (node: React.ReactElement) => void;
  unmount: () => void;
};

function mount(node: React.ReactElement): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    render: (next) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function call(index: number, overrides: Partial<PartTool> = {}): PartTool {
  return {
    kind: "tool-trace",
    toolCallId: `call-${index}`,
    name: `files__read_${index}`,
    status: "output-available",
    output: "ok",
    ...overrides,
  };
}

const thought: PartReasoning = {
  kind: "reasoning",
  text: "Read every agreement first.",
  durationMs: 4_400,
};

function trigger(container: HTMLElement): HTMLButtonElement {
  const element = container.querySelector<HTMLButtonElement>(
    "[data-slot='activity-trigger']",
  );
  if (element === null) throw new Error("expected an activity trigger");
  return element;
}

function shownSteps(container: HTMLElement): readonly string[] {
  return [...container.querySelectorAll("li[data-step] code")].map(
    (code) => code.textContent ?? "",
  );
}

describe("Activity", () => {
  test("closed, it is one summary line and none of its steps", () => {
    const mounted = mount(
      <Activity steps={[thought, call(1), call(2, { status: "error" })]} />,
    );
    expect(trigger(mounted.container).textContent).toContain(
      "Thought for 4s · 2 steps",
    );
    expect(trigger(mounted.container).textContent).toContain("1 failed");
    expect(trigger(mounted.container).getAttribute("aria-expanded")).toBe(
      "false",
    );
    expect(mounted.container.querySelector("ol")).toBeNull();
    mounted.unmount();
  });

  test("opened, it shows the latest 10 and a control for the rest", () => {
    const steps = Array.from({ length: 14 }, (_, index) => call(index));
    const mounted = mount(<Activity steps={steps} />);
    act(() => trigger(mounted.container).click());
    expect(shownSteps(mounted.container)).toEqual(
      steps.slice(4).map((step) => step.name),
    );
    const more = [...mounted.container.querySelectorAll("button")].find(
      (button) => button.textContent === "Show 4 earlier steps",
    );
    if (more === undefined) throw new Error("expected a show-earlier control");
    act(() => more.click());
    expect(shownSteps(mounted.container).length).toBe(14);
    expect(mounted.container.textContent).not.toContain("earlier steps");
    // Focus lands on the first step the control revealed.
    expect(document.activeElement?.textContent).toContain("files__read_0");
    mounted.unmount();
  });

  test("a focused step sliding out of the latest ten hands focus to the control", () => {
    const steps = Array.from({ length: 10 }, (_, index) => call(index));
    const mounted = mount(<Activity steps={steps} defaultOpen streaming />);
    const oldest = mounted.container.querySelector("li[data-step] button");
    if (!(oldest instanceof HTMLButtonElement))
      throw new Error("expected a control in the oldest step");
    act(() => oldest.focus());
    mounted.render(
      <Activity steps={[...steps, call(10)]} defaultOpen streaming />,
    );
    expect(shownSteps(mounted.container)).not.toContain("files__read_0");
    expect(document.activeElement?.textContent).toBe("Show 1 earlier step");
    mounted.unmount();
  });

  test("ten or fewer steps need no control", () => {
    const steps = Array.from({ length: 10 }, (_, index) => call(index));
    const mounted = mount(<Activity steps={steps} defaultOpen />);
    expect(shownSteps(mounted.container).length).toBe(10);
    expect(mounted.container.textContent).not.toContain("earlier");
    mounted.unmount();
  });

  test("controlled open follows the prop and reports clicks", () => {
    const changes: boolean[] = [];
    const steps: readonly ActivityStep[] = [call(1)];
    const mounted = mount(
      <Activity
        steps={steps}
        open={false}
        onOpenChange={(open) => changes.push(open)}
      />,
    );
    act(() => trigger(mounted.container).click());
    expect(changes).toEqual([true]);
    expect(mounted.container.querySelector("ol")).toBeNull();
    mounted.render(<Activity steps={steps} open onOpenChange={() => {}} />);
    expect(mounted.container.querySelector("ol")).not.toBeNull();
    mounted.unmount();
  });

  test("while streaming, the line says what is happening now", () => {
    const one = mount(
      <Activity steps={[thought, call(1, { status: "running" })]} streaming />,
    );
    expect(trigger(one.container).textContent).toContain("files__read_1…");
    one.unmount();

    const many = mount(
      <Activity
        steps={[
          {
            kind: "tool-batch",
            id: "batch",
            tools: [
              call(1, { status: "running" }),
              call(2, { status: "running" }),
            ],
          },
        ]}
        streaming
      />,
    );
    expect(trigger(many.container).textContent).toContain("Running 2 at once…");
    many.unmount();

    const thinking = mount(<Activity steps={[call(1), thought]} streaming />);
    expect(trigger(thinking.container).textContent).toContain("Thinking…");
    thinking.unmount();
  });

  test("while streaming, only the newest thought is still thinking", () => {
    const started: PartReasoning = { kind: "reasoning", text: "" };
    const mounted = mount(
      <Activity defaultOpen streaming steps={[thought, call(1), started]} />,
    );
    const thoughts = [
      ...mounted.container.querySelectorAll("[data-slot='reasoning']"),
    ];
    // The empty live thought still shows, as thinking; the earlier one is done.
    expect(thoughts.length).toBe(2);
    expect(thoughts[0]?.hasAttribute("data-streaming")).toBe(false);
    expect(thoughts[0]?.textContent).toContain("Thought for");
    expect(thoughts[1]?.getAttribute("data-streaming")).toBe("true");
    expect(thoughts[1]?.textContent).toContain("Thinking…");
    mounted.unmount();

    // Once the run ends, the same thought is finished.
    const done = mount(<Activity defaultOpen steps={[call(1), thought]} />);
    expect(
      done.container
        .querySelector("[data-slot='reasoning']")
        ?.hasAttribute("data-streaming"),
    ).toBe(false);
    done.unmount();
  });

  test("a finished thought with no text gets no step of its own", () => {
    const blank: PartReasoning = { kind: "reasoning", text: " " };
    const steps = [blank, ...Array.from({ length: 11 }, (_, i) => call(i))];
    const mounted = mount(<Activity defaultOpen steps={steps} />);
    const items = [...mounted.container.querySelectorAll("li[data-step]")];
    expect(items.every((item) => item.innerHTML !== "")).toBe(true);
    expect(
      mounted.container.querySelector("li[data-step='reasoning']"),
    ).toBeNull();
    // It does not count toward the ten shown or the ones held back.
    expect(mounted.container.textContent).toContain("Show 1 earlier step");
    const more = [...mounted.container.querySelectorAll("button")].find(
      (button) => button.textContent === "Show 1 earlier step",
    );
    act(() => more?.click());
    expect(document.activeElement?.textContent).toContain("files__read_0");
    mounted.unmount();
  });

  test("a settled approval inside the run shows its outcome", () => {
    const mounted = mount(
      <Activity
        defaultOpen
        steps={[
          call(1, {
            name: "mail__send",
            status: "output-denied",
            output: undefined,
            approval: {
              id: "a",
              status: "timeout",
              scope: null,
              timeoutAt: "2026-03-04T11:00:00.000Z",
            },
          }),
        ]}
      />,
    );
    expect(mounted.container.textContent).toContain("Timed out");
    mounted.unmount();
  });

  test("custom parts and step rendering", () => {
    const mounted = mount(
      <Activity steps={[call(1), call(2)]} defaultOpen>
        <ActivityTrigger label="Custom line" />
        <ActivityContent
          renderStep={(step, index) => (
            <span data-custom>
              {index}:{step.kind}
            </span>
          )}
        />
      </Activity>,
    );
    expect(trigger(mounted.container).textContent).toContain("Custom line");
    expect(
      [...mounted.container.querySelectorAll("[data-custom]")].map(
        (element) => element.textContent,
      ),
    ).toEqual(["0:tool-trace", "1:tool-trace"]);
    mounted.unmount();
  });

  test("a run with no steps renders nothing", () => {
    const mounted = mount(<Activity steps={[]} />);
    expect(mounted.container.innerHTML).toBe("");
    mounted.unmount();
  });
});

/** Text content outside `aria-hidden` subtrees: the name a button computes. */
function spokenText(node: Node): string {
  if (node instanceof Element && node.getAttribute("aria-hidden") === "true")
    return "";
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  return [...node.childNodes].map(spokenText).join("");
}

describe("Reasoning", () => {
  function reasoningTrigger(container: HTMLElement): HTMLButtonElement {
    const element = container.querySelector<HTMLButtonElement>(
      "[data-slot='reasoning-trigger']",
    );
    if (element === null) throw new Error("expected a reasoning trigger");
    return element;
  }

  test("closed, it shows the duration and the start of the text", () => {
    const mounted = mount(<Reasoning part={thought} />);
    const button = reasoningTrigger(mounted.container);
    expect(button.textContent).toContain("Thought for 4s");
    expect(button.textContent).toContain("Read every agreement first.");
    expect(
      mounted.container.querySelector("[data-slot='reasoning-content']"),
    ).toBeNull();
    act(() => button.click());
    expect(
      mounted.container.querySelector("[data-slot='reasoning-content']")
        ?.textContent,
    ).toBe("Read every agreement first.");
    mounted.unmount();
  });

  test("its name is the summary, not the previewed thought", () => {
    const long: PartReasoning = {
      kind: "reasoning",
      text: "x".repeat(2_000),
      durationMs: 4_400,
    };
    const mounted = mount(<Reasoning part={long} />);
    const button = reasoningTrigger(mounted.container);
    // The preview is still on screen.
    expect(button.textContent).toContain(long.text);
    expect(button.hasAttribute("aria-label")).toBe(false);
    expect(spokenText(button)).toBe("Thought for 4s");
    mounted.unmount();
  });

  test("without a duration it says Thought; streaming, Thinking…", () => {
    const done = mount(
      <Reasoning part={{ kind: "reasoning", text: "Plan" }} />,
    );
    expect(reasoningTrigger(done.container).textContent).toStartWith("Thought");
    done.unmount();

    const live = mount(
      <Reasoning
        part={{ kind: "reasoning", text: "" }}
        streaming
        defaultOpen
      />,
    );
    expect(reasoningTrigger(live.container).textContent).toContain("Thinking…");
    expect(
      live.container
        .querySelector("[data-slot='reasoning-content']")
        ?.getAttribute("aria-busy"),
    ).toBe("true");
    live.unmount();
  });

  test("renders the text through the caller's render prop", () => {
    const mounted = mount(
      <Reasoning part={thought} defaultOpen>
        <ReasoningTrigger />
        <ReasoningContent render={(text) => <mark>{text}</mark>} />
      </Reasoning>,
    );
    expect(mounted.container.querySelector("mark")?.textContent).toBe(
      thought.text,
    );
    mounted.unmount();
  });

  test("controlled open is respected", () => {
    const changes: boolean[] = [];
    const mounted = mount(
      <Reasoning
        part={thought}
        open={false}
        onOpenChange={(open) => changes.push(open)}
      />,
    );
    act(() => reasoningTrigger(mounted.container).click());
    expect(changes).toEqual([true]);
    expect(
      mounted.container.querySelector("[data-slot='reasoning-content']"),
    ).toBeNull();
    mounted.unmount();
  });

  test("finished thinking with no text renders nothing", () => {
    const mounted = mount(
      <Reasoning part={{ kind: "reasoning", text: " " }} />,
    );
    expect(mounted.container.innerHTML).toBe("");
    mounted.unmount();
  });
});
