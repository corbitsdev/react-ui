import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import type { ToolTraceStatus } from "../lib/chat-parts.js";
import type { PartTool, PartToolBatch } from "../lib/conversation.js";
import { Tool, ToolHeader, ToolInput, ToolOutput } from "./tool.js";
import { ToolGroup } from "./tool-group.js";

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

function tool(overrides: Partial<PartTool> = {}): PartTool {
  return {
    kind: "tool-trace",
    toolCallId: "call-1",
    name: "files__read",
    status: "output-available",
    input: { path: "a.pdf" },
    output: "Renews next year",
    ...overrides,
  };
}

function header(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    "[data-slot='tool-header']",
  );
  if (element === null) throw new Error("expected a tool header");
  return element;
}

function click(element: Element | null) {
  if (!(element instanceof HTMLElement)) throw new Error("expected an element");
  act(() => element.click());
}

const STATUSES: readonly [ToolTraceStatus, string, string][] = [
  ["pending", "Queued", "lucide-circle-dashed"],
  ["running", "Running", "lucide-loader-circle"],
  ["output-available", "Done", "lucide-check"],
  ["error", "Failed", "lucide-circle-alert"],
  ["approval-requested", "Needs approval", "lucide-shield-alert"],
  ["output-denied", "Not run", "lucide-ban"],
];

describe("Tool", () => {
  for (const [status, label, icon] of STATUSES) {
    test(`${status} renders its status word and icon`, () => {
      const mounted = mount(<Tool part={tool({ status })} />);
      const row = header(mounted.container);
      expect(
        mounted.container.firstElementChild?.getAttribute("data-status"),
      ).toBe(status);
      expect(row.textContent).toContain(label);
      expect(row.textContent).toContain("files__read");
      expect(row.querySelector(`svg.${icon}`)).not.toBeNull();
      mounted.unmount();
    });
  }

  test("an error opens and shows the output under an Error title", () => {
    const mounted = mount(
      <Tool part={tool({ status: "error", output: "Password protected" })} />,
    );
    expect(header(mounted.container).getAttribute("aria-expanded")).toBe(
      "true",
    );
    const output = mounted.container.querySelector("[data-slot='tool-output']");
    expect(output?.textContent).toContain("Error");
    expect(output?.textContent).toContain("Password protected");
    mounted.unmount();
  });

  test("a call that fails after mounting opens, until a person chooses", () => {
    const mounted = mount(
      <Tool part={tool({ status: "running", output: undefined })} />,
    );
    expect(header(mounted.container).getAttribute("aria-expanded")).toBe(
      "false",
    );
    mounted.render(
      <Tool part={tool({ status: "error", output: "Timed out" })} />,
    );
    expect(header(mounted.container).getAttribute("aria-expanded")).toBe(
      "true",
    );
    click(header(mounted.container));
    expect(header(mounted.container).getAttribute("aria-expanded")).toBe(
      "false",
    );
    mounted.unmount();
  });

  test("a finished call starts closed and opens onto input and output", () => {
    const mounted = mount(<Tool part={tool()} />);
    expect(
      mounted.container.querySelector("[data-slot='tool-input']"),
    ).toBeNull();
    click(header(mounted.container));
    expect(
      mounted.container.querySelector("[data-slot='tool-input']")?.textContent,
    ).toContain('"path": "a.pdf"');
    expect(
      mounted.container.querySelector("[data-slot='tool-output']")?.textContent,
    ).toContain("Renews next year");
    mounted.unmount();
  });

  test("opened, the toggle controls the input and output it shows", () => {
    const first = mount(<Tool part={tool()} />);
    const second = mount(<Tool part={tool()} />);
    const toggle = header(first.container);
    expect(toggle.hasAttribute("aria-controls")).toBe(false);
    click(toggle);
    const ids = (toggle.getAttribute("aria-controls") ?? "").split(" ");
    expect(ids.length).toBe(2);
    expect(ids.map((id) => document.getElementById(id)?.dataset.slot)).toEqual([
      "tool-input",
      "tool-output",
    ]);
    click(header(second.container));
    expect(header(second.container).getAttribute("aria-controls")).not.toBe(
      toggle.getAttribute("aria-controls"),
    );
    first.unmount();
    second.unmount();
  });

  test("a call with neither input nor output has no toggle", () => {
    const mounted = mount(
      <Tool part={tool({ input: undefined, output: undefined })} />,
    );
    expect(header(mounted.container).tagName).toBe("DIV");
    expect(mounted.container.querySelector("button")).toBeNull();
    mounted.unmount();
  });

  test("input and output go through the caller's render props", () => {
    const mounted = mount(
      <Tool part={tool()} defaultOpen>
        <ToolHeader label="Read the agreement" />
        <ToolInput render={(input) => <em>in:{JSON.stringify(input)}</em>} />
        <ToolOutput
          render={(output) => <strong>out:{String(output)}</strong>}
        />
      </Tool>,
    );
    expect(mounted.container.textContent).toContain("Read the agreement");
    expect(mounted.container.querySelector("em")?.textContent).toBe(
      'in:{"path":"a.pdf"}',
    );
    expect(mounted.container.querySelector("strong")?.textContent).toBe(
      "out:Renews next year",
    );
    mounted.unmount();
  });

  test("status words can be replaced", () => {
    const mounted = mount(
      <Tool part={tool({ status: "running" })}>
        <ToolHeader statusLabels={{ running: "En cours" }} />
      </Tool>,
    );
    expect(header(mounted.container).textContent).toContain("En cours");
    mounted.unmount();
  });

  test("controlled open follows the prop and reports clicks", () => {
    const changes: boolean[] = [];
    const mounted = mount(
      <Tool
        part={tool()}
        open={false}
        onOpenChange={(open) => changes.push(open)}
      />,
    );
    click(header(mounted.container));
    expect(changes).toEqual([true]);
    expect(header(mounted.container).getAttribute("aria-expanded")).toBe(
      "false",
    );
    mounted.render(<Tool part={tool()} open onOpenChange={() => {}} />);
    expect(header(mounted.container).getAttribute("aria-expanded")).toBe(
      "true",
    );
    mounted.unmount();
  });

  test("a settled approval shows its outcome under the header", () => {
    const mounted = mount(
      <Tool
        part={tool({
          approval: {
            id: "a",
            status: "approved",
            scope: "always",
            timeoutAt: null,
          },
        })}
      />,
    );
    expect(mounted.container.textContent).toContain("Approved always");
    expect(
      mounted.container.querySelector("button[aria-expanded]"),
    ).not.toBeNull();
    expect(mounted.container.textContent).not.toContain("Approve always");
    mounted.unmount();
  });

  test("parts outside a Tool throw", () => {
    const original = console.error;
    console.error = () => {};
    expect(() => mount(<ToolHeader />)).toThrow(
      "ToolHeader must be inside a Tool.",
    );
    console.error = original;
  });
});

function batch(tools: readonly PartTool[]): PartToolBatch {
  return { kind: "tool-batch", id: "batch-1", tools };
}

describe("ToolGroup", () => {
  const finished = batch([
    tool({ toolCallId: "a" }),
    tool({ toolCallId: "b", status: "error" }),
    tool({ toolCallId: "c" }),
  ]);

  test("summarises a finished batch and its failures, closed", () => {
    const mounted = mount(<ToolGroup part={finished} />);
    const button = mounted.container.querySelector("button");
    expect(button?.textContent).toContain("Ran 3 at once");
    expect(button?.textContent).toContain("1 failed");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(
      mounted.container.querySelectorAll("[data-slot='tool']").length,
    ).toBe(0);
    click(button);
    expect(
      mounted.container.querySelectorAll("[data-slot='tool']").length,
    ).toBe(3);
    mounted.unmount();
  });

  test("counts what is done while calls still run", () => {
    const mounted = mount(
      <ToolGroup
        part={batch([
          tool({ toolCallId: "a" }),
          tool({ toolCallId: "b", status: "running" }),
          tool({ toolCallId: "c", status: "pending" }),
        ])}
      />,
    );
    expect(mounted.container.textContent).toContain(
      "Running 3 at once · 1 done",
    );
    mounted.unmount();
  });

  test("a call waiting on a person is not counted as done", () => {
    const pending = {
      id: "x",
      status: "pending",
      scope: null,
      timeoutAt: null,
    } as const;
    const held = mount(
      <ToolGroup
        part={batch([
          tool({ toolCallId: "a" }),
          tool({
            toolCallId: "b",
            status: "approval-requested",
            approval: pending,
          }),
        ])}
      />,
    );
    const heldHeader = held.container.querySelector(
      "[data-slot='tool-group-header']",
    );
    expect(heldHeader?.textContent).toBe(
      "2 at once · 1 done · 1 waiting for approval",
    );
    expect(heldHeader?.textContent).not.toContain("Ran");
    held.unmount();

    const busy = mount(
      <ToolGroup
        part={batch([
          tool({ toolCallId: "a" }),
          tool({ toolCallId: "b", status: "running" }),
          tool({ toolCallId: "c", status: "running", approval: pending }),
        ])}
        labels={{ waiting: (count) => `${count} en attente` }}
      />,
    );
    expect(
      busy.container.querySelector("[data-slot='tool-group-header']")
        ?.textContent,
    ).toBe("Running 3 at once · 1 done · 1 en attente");
    busy.unmount();
  });

  test("opens on a waiting call and offers its decision", () => {
    const decisions: string[] = [];
    const mounted = mount(
      <ToolGroup
        part={batch([
          tool({ toolCallId: "a" }),
          tool({
            toolCallId: "b",
            name: "mail__send",
            status: "running",
            approval: {
              id: "x",
              status: "pending",
              scope: null,
              timeoutAt: null,
            },
          }),
        ])}
        onDecide={(part, decision) =>
          decisions.push(`${part.toolCallId}:${decision.outcome}`)
        }
      />,
    );
    const approve = [...mounted.container.querySelectorAll("button")].find(
      (button) => button.textContent === "Approve",
    );
    click(approve ?? null);
    expect(decisions).toEqual(["b:approved"]);
    mounted.unmount();
  });
});
