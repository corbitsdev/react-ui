import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import type { PartTool } from "../lib/conversation.js";
import { Activity, ActivityTrigger } from "./activity.js";
import {
  ActivityAgents,
  type ActivityAgent,
  type ActivityAnswer,
} from "./activity-agents.js";

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

const MINUTE = 60_000;
const START = Date.now() - 11 * MINUTE;

function call(name: string, status: PartTool["status"] = "output-available") {
  return {
    kind: "tool-trace",
    toolCallId: `call-${name}`,
    name,
    status,
    output: "ok",
  } satisfies PartTool;
}

function designer(
  id: string,
  overrides: Partial<ActivityAgent> = {},
): ActivityAgent {
  return {
    id,
    role: "Designer",
    name: id,
    task: `Making the ${id} mockup`,
    state: "working",
    startedAt: START,
    steps: [
      call("Reading the requirements"),
      call("Shaping the styles", "running"),
    ],
    instruction: "Design a calorie tracker for one person.",
    ...overrides,
  };
}

const button = (container: HTMLElement, name: string) => {
  const found = [...container.querySelectorAll("button")].find(
    (b) =>
      b.textContent?.trim() === name || b.getAttribute("aria-label") === name,
  );
  if (found === undefined) throw new Error(`No button "${name}"`);
  return found;
};

const click = (element: HTMLElement) => act(() => element.click());

const rows = (container: HTMLElement) =>
  [...container.querySelectorAll("li[data-state]")].map(
    (row) =>
      row.querySelector("button > span:nth-child(2) > span")?.textContent,
  );

describe("ActivityAgents", () => {
  test("a team counts itself and lists what needs you first", () => {
    const { container, unmount } = mount(
      <ActivityAgents
        agents={[
          designer("Friendly"),
          designer("Sleek", { state: "done", endedAt: START + 9 * MINUTE }),
          designer("Editorial", {
            state: "waiting",
            question: { text: "Serif for the numbers too?" },
          }),
        ]}
      />,
    );
    const head = container.querySelector("section > button");
    expect(head?.textContent).toContain("3 designers working");
    expect(head?.textContent).toContain("1 of 3 done");
    expect(head?.textContent).toContain("1 needs you");
    expect(head?.getAttribute("aria-expanded")).toBe("true");
    expect(rows(container)).toEqual(["Editorial", "Friendly", "Sleek"]);
    unmount();
  });

  test("a working row says what it is doing now; a done row stops its clock", () => {
    const { container, unmount } = mount(
      <ActivityAgents
        agents={[
          designer("Friendly"),
          designer("Sleek", {
            state: "done",
            endedAt: START + 9 * MINUTE,
            result: { title: "Sleek design" },
          }),
        ]}
      />,
    );
    const [working, done] = [...container.querySelectorAll("li[data-state]")];
    expect(working?.textContent).toContain("Shaping the styles");
    expect(done?.textContent).toContain("Filed Sleek design");
    expect(done?.textContent).toContain("2 steps · 9m");
    unmount();
  });

  test("a finished team folds to one line, and the person's choice holds", () => {
    const running = [designer("Friendly"), designer("Sleek")];
    const finished = running.map((agent) => ({
      ...agent,
      state: "done" as const,
      endedAt: START + 10 * MINUTE,
    }));
    const { container, render, unmount } = mount(
      <ActivityAgents agents={running} />,
    );
    const head = () => container.querySelector("section > button");
    click(head() as HTMLElement);
    expect(head()?.getAttribute("aria-expanded")).toBe("false");
    render(<ActivityAgents agents={[...running]} />);
    expect(head()?.getAttribute("aria-expanded")).toBe("false");
    unmount();

    const fresh = mount(<ActivityAgents agents={finished} />);
    const line = fresh.container.querySelector("section > button");
    expect(line?.getAttribute("aria-expanded")).toBe("false");
    expect(line?.textContent).toContain("2 done");
    fresh.unmount();
  });

  test("a question is answered in one tap, and says what you said", () => {
    const answers: ActivityAnswer[] = [];
    const { container, unmount } = mount(
      <ActivityAgents
        agents={[
          designer("Editorial", {
            state: "waiting",
            question: {
              text: "Serif for the numbers too?",
              options: ["Serif", "Keep the sans"],
            },
            onAnswer: (answer) => answers.push(answer),
          }),
          designer("Friendly"),
        ]}
      />,
    );
    expect(container.textContent).toContain("Serif for the numbers too?");
    click(button(container, "Serif"));
    expect(answers).toEqual([{ kind: "option", value: "Serif" }]);
    expect(container.querySelector("[role=status]")?.textContent).toBe(
      "You said “Serif”",
    );
    expect(document.activeElement?.getAttribute("aria-expanded")).toBe("false");
    unmount();
  });

  test("a question takes a reply in your own words, or leaves it to the agent", () => {
    const answers: ActivityAnswer[] = [];
    const agent = designer("Editorial", {
      state: "waiting",
      question: { text: "Serif?" },
      onAnswer: (answer) => answers.push(answer),
    });
    const { container, unmount } = mount(
      <ActivityAgents agents={[agent, designer("Friendly")]} />,
    );
    click(button(container, "Something else"));
    const input = container.querySelector("input") as HTMLInputElement;
    expect(input.getAttribute("aria-label")).toBe("Reply to Editorial");
    act(() => {
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set?.call(input, "Serif for big numbers only");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      input.form?.requestSubmit();
    });
    expect(answers).toEqual([
      { kind: "reply", text: "Serif for big numbers only" },
    ]);
    unmount();

    const other = mount(
      <ActivityAgents agents={[agent, designer("Friendly")]} />,
    );
    click(button(other.container, "Let it decide"));
    expect(answers.at(-1)).toEqual({ kind: "decide" });
    other.unmount();

    const fixed = mount(
      <ActivityAgents
        agents={[
          { ...agent, question: { text: "Serif?", canDecide: false } },
          designer("Friendly"),
        ]}
      />,
    );
    expect(fixed.container.textContent).not.toContain("Let it decide");
    fixed.unmount();
  });

  test("Escape leaves the reply and goes back to Something else", async () => {
    const { container, unmount } = mount(
      <ActivityAgents
        agents={[
          designer("Editorial", {
            state: "waiting",
            question: { text: "Serif?" },
          }),
          designer("Friendly"),
        ]}
      />,
    );
    click(button(container, "Something else"));
    const input = container.querySelector("input") as HTMLInputElement;
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    await act(() => new Promise((done) => requestAnimationFrame(done)));
    expect(container.querySelector("input")).toBeNull();
    expect(document.activeElement).toBe(button(container, "Something else"));
    unmount();
  });

  test("stopping an agent asks first", () => {
    let stopped = 0;
    const { container, unmount } = mount(
      <ActivityAgents
        agents={[
          designer("Friendly", { onStop: () => (stopped += 1) }),
          designer("Sleek"),
        ]}
      />,
    );
    click(button(container, "Stop: Friendly"));
    expect(stopped).toBe(0);
    click(button(container, "Stop: Friendly"));
    expect(stopped).toBe(1);
    unmount();
  });

  test("opening a row shows its steps and the same actions", () => {
    let watched = 0;
    const { container, unmount } = mount(
      <ActivityAgents
        agents={[
          designer("Friendly", {
            onWatch: () => (watched += 1),
            preview: { kind: "writing", text: ".ring { border-radius: 50%; }" },
          }),
          designer("Sleek"),
        ]}
      />,
    );
    const toggle = container.querySelector(
      "li[data-state] button[aria-expanded]",
    ) as HTMLButtonElement;
    click(toggle);
    const panel = container.querySelector(
      `#${CSS.escape(toggle.getAttribute("aria-controls") ?? "")}`,
    );
    expect(panel?.textContent).toContain(".ring { border-radius: 50%; }");
    expect(panel?.textContent).toContain("Reading the requirements");
    click(
      panel?.querySelector(
        "button[aria-label='Watch: Friendly']",
      ) as HTMLElement,
    );
    expect(watched).toBe(1);
    unmount();
  });

  test("one agent alone names its role and task, with what it was asked", () => {
    const { container, unmount } = mount(
      <ActivityAgents
        agents={[
          {
            id: "writer",
            role: "Writer",
            task: "Wrote the requirements",
            state: "done",
            startedAt: START,
            endedAt: START + 2 * MINUTE,
            steps: [],
            instruction: "Write the requirements.",
            report: "A simple tracker you open in a browser.",
          },
        ]}
      />,
    );
    expect(container.textContent).toContain("Writer · Wrote the requirements");
    expect(container.textContent).toContain("Asked to");
    expect(container.textContent).toContain("A simple tracker");
    expect(container.querySelector("section > button")).toBeNull();
    unmount();
  });
});

describe("Activity with agents", () => {
  test("while the run thinks before its first step, its line spins", () => {
    const { container, unmount } = mount(<Activity steps={[]} streaming />);
    const line = container.querySelector("[data-slot=activity-trigger]");
    expect(line?.getAttribute("role")).toBe("status");
    expect(line?.textContent).toBe("Thinking…");
    expect(line?.querySelector("[data-slot=activity-spinner]")).not.toBeNull();
    unmount();
  });

  test("a live run's line spins; a finished one does not", () => {
    const { container, render, unmount } = mount(
      <Activity steps={[call("files__read", "running")]} streaming />,
    );
    const spinner = () =>
      container.querySelector(
        "[data-slot=activity-trigger] [data-slot=activity-spinner]",
      );
    expect(spinner()).not.toBeNull();
    render(<Activity steps={[call("files__read")]} />);
    expect(spinner()).toBeNull();
    unmount();
  });

  test("a trigger with no steps and nothing running shows nothing", () => {
    const { container, unmount } = mount(
      <Activity steps={[]} agents={[designer("Friendly")]}>
        <ActivityTrigger />
      </Activity>,
    );
    expect(container.querySelector("[data-slot=activity-trigger]")).toBeNull();
    unmount();
  });

  test("nothing at all renders nothing", () => {
    const { container, unmount } = mount(<Activity steps={[]} />);
    expect(container.innerHTML).toBe("");
    unmount();
  });

  test("agents follow the run's own line, opened to steps drawn as a run", () => {
    const { container, unmount } = mount(
      <Activity
        steps={[call("files__read")]}
        agents={[designer("Friendly"), designer("Sleek")]}
      />,
    );
    expect(
      container.querySelector("[data-slot=activity-agents]"),
    ).not.toBeNull();
    click(
      container.querySelector(
        "li[data-state] button[aria-expanded]",
      ) as HTMLElement,
    );
    expect(
      container.querySelector(
        "[data-slot=activity-agents] [data-slot=activity-content]",
      ),
    ).not.toBeNull();
    unmount();
  });
});
