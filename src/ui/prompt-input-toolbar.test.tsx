import { describe, expect, spyOn, test } from "bun:test";
import { act, type ReactNode, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  PromptInputAddMenu,
  PromptInputButton,
  PromptInputContext,
  PromptInputModeSelect,
  PromptInputModelSelect,
  type PromptInputAddMenuItem,
  type PromptInputModelOption,
  type PromptInputModeOption,
} from "./prompt-input-toolbar.js";

const MODELS: readonly PromptInputModelOption[] = [
  { id: "swift", name: "Swift 2", short: "Swift", group: "Fast" },
  { id: "deep", name: "Deep 4", short: "Deep", group: "Thorough" },
  { id: "lite", name: "Lite 1", group: "Fast" },
];

const MODES: readonly PromptInputModeOption[] = [
  { id: "ask", label: "Ask", detail: "Answers without acting" },
  { id: "agent", label: "Agent", detail: "Acts on your behalf" },
];

function mount(node: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    query<T extends Element = HTMLElement>(selector: string): T {
      const element = container.querySelector<T>(selector);
      if (element === null) throw new Error(`no ${selector}`);
      return element;
    },
    all(selector: string): HTMLElement[] {
      return [...container.querySelectorAll<HTMLElement>(selector)];
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function press(target: Element, key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

function click(target: HTMLElement) {
  act(() => target.click());
}

function ControlledModel({
  initial,
  events,
}: {
  readonly initial: string;
  readonly events: string[];
}) {
  const [value, setValue] = useState(initial);
  return (
    <PromptInputModelSelect
      models={MODELS}
      value={value}
      onValueChange={(id) => {
        events.push(id);
        setValue(id);
      }}
    />
  );
}

describe("PromptInputModelSelect", () => {
  test("shows the first model's short name by default and lists models by group", () => {
    const view = mount(<PromptInputModelSelect models={MODELS} />);
    const trigger = view.query("[role='combobox']");
    expect(trigger.getAttribute("aria-label")).toBe("Model");
    expect(trigger.textContent).toBe("Swift");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.hasAttribute("aria-controls")).toBe(false);

    click(trigger);
    const list = view.query("[role='listbox']");
    expect(trigger.getAttribute("aria-controls")).toBe(list.id);
    const groups = view.all("[role='group']");
    expect(
      groups.map((group) => {
        const labelId = group.getAttribute("aria-labelledby") ?? "";
        return document.getElementById(labelId)?.textContent;
      }),
    ).toEqual(["Fast", "Thorough"]);
    // Grouped order, which is also the order the arrows walk.
    expect(
      view.all("[role='option']").map((option) => option.textContent),
    ).toEqual(["Swift 2", "Lite 1", "Deep 4"]);
    view.unmount();
  });

  test("calls onValueChange with the chosen id and reflects the controlled value", () => {
    const events: string[] = [];
    const view = mount(<ControlledModel initial="deep" events={events} />);
    const trigger = view.query("[role='combobox']");
    expect(trigger.textContent).toBe("Deep");

    click(trigger);
    const chosen = view
      .all("[role='option']")
      .find((option) => option.getAttribute("aria-selected") === "true");
    expect(chosen?.textContent).toBe("Deep 4");
    const lite = view.all("[role='option']")[1];
    if (lite === undefined) throw new Error("no option");
    click(lite);
    expect(events).toEqual(["lite"]);
    expect(trigger.textContent).toBe("Lite 1");
    expect(view.container.querySelector("[role='listbox']")).toBeNull();
    view.unmount();
  });

  test("a controlled value the host does not change stays put", () => {
    const events: string[] = [];
    const view = mount(
      <PromptInputModelSelect
        models={MODELS}
        value="swift"
        onValueChange={(id) => events.push(id)}
      />,
    );
    const trigger = view.query("[role='combobox']");
    click(trigger);
    const deep = view.all("[role='option']")[2];
    if (deep === undefined) throw new Error("no option");
    click(deep);
    expect(events).toEqual(["deep"]);
    expect(trigger.textContent).toBe("Swift");
    view.unmount();
  });

  test("works by keyboard with focus kept on the trigger", () => {
    const events: string[] = [];
    const view = mount(<ControlledModel initial="lite" events={events} />);
    const trigger = view.query<HTMLButtonElement>("[role='combobox']");
    act(() => trigger.focus());

    const opening = press(trigger, "ArrowDown");
    expect(opening.defaultPrevented).toBe(true);
    const options = view.all("[role='option']");
    // Opens on the chosen model.
    expect(trigger.getAttribute("aria-activedescendant")).toBe(
      options[1]?.id ?? "",
    );
    press(trigger, "ArrowDown");
    expect(trigger.getAttribute("aria-activedescendant")).toBe(
      options[2]?.id ?? "",
    );
    // Stops at the end rather than wrapping.
    press(trigger, "ArrowDown");
    expect(trigger.getAttribute("aria-activedescendant")).toBe(
      options[2]?.id ?? "",
    );
    press(trigger, "Home");
    expect(trigger.getAttribute("aria-activedescendant")).toBe(
      options[0]?.id ?? "",
    );
    press(trigger, "Enter");
    expect(events).toEqual(["swift"]);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.hasAttribute("aria-activedescendant")).toBe(false);
    expect(document.activeElement).toBe(trigger);
    view.unmount();
  });

  test("Escape closes without choosing and does not reach an enclosing handler", () => {
    const events: string[] = [];
    const outer: string[] = [];
    const view = mount(
      <div onKeyDown={(event) => outer.push(event.key)}>
        <PromptInputModelSelect
          models={MODELS}
          onValueChange={(id) => events.push(id)}
        />
      </div>,
    );
    const trigger = view.query<HTMLButtonElement>("[role='combobox']");
    act(() => trigger.focus());
    press(trigger, "Enter");
    press(trigger, "ArrowDown");
    press(trigger, "Escape");
    expect(view.container.querySelector("[role='listbox']")).toBeNull();
    expect(events).toEqual([]);
    expect(outer).toEqual(["Enter", "ArrowDown"]);
    expect(document.activeElement).toBe(trigger);
    view.unmount();
  });

  test("a value that matches no model shows the label", () => {
    const view = mount(
      <PromptInputModelSelect
        models={MODELS}
        value="retired"
        onValueChange={() => undefined}
      />,
    );
    expect(view.query("[role='combobox']").textContent).toBe("Model");
    view.unmount();
  });

  test("renders nothing without models", () => {
    const view = mount(<PromptInputModelSelect models={[]} />);
    expect(view.container.innerHTML).toBe("");
    view.unmount();
  });

  test("an uncontrolled select whose models arrive after mount defaults to the first", () => {
    const events: string[] = [];
    let setModels!: (models: readonly PromptInputModelOption[]) => void;
    function Host() {
      const [models, set] = useState<readonly PromptInputModelOption[]>([]);
      setModels = set;
      return (
        <PromptInputModelSelect
          models={models}
          onValueChange={(id) => events.push(id)}
        />
      );
    }
    const view = mount(<Host />);
    act(() => setModels(MODELS));
    const trigger = view.query("[role='combobox']");
    expect(trigger.textContent).toBe("Swift");
    click(trigger);
    expect(
      view
        .all("[role='option']")
        .filter((option) => option.getAttribute("aria-selected") === "true")
        .map((option) => option.textContent),
    ).toEqual(["Swift 2"]);
    // The late default is not a choice, so the host hears nothing.
    expect(events).toEqual([]);

    // A choice the user made survives a new list.
    const deep = view.all("[role='option']")[2];
    if (deep === undefined) throw new Error("no option");
    click(deep);
    act(() => setModels([...MODELS].reverse()));
    expect(trigger.textContent).toBe("Deep");
    expect(events).toEqual(["deep"]);
    view.unmount();
  });

  test("every open starts on the chosen model, even one the host drives", () => {
    let setOpen!: (open: boolean) => void;
    function Host() {
      const [open, set] = useState(false);
      setOpen = set;
      return (
        <PromptInputModelSelect
          models={MODELS}
          defaultValue="swift"
          open={open}
          onOpenChange={set}
        />
      );
    }
    const view = mount(<Host />);
    const trigger = view.query<HTMLButtonElement>("[role='combobox']");
    act(() => trigger.focus());
    press(trigger, "ArrowDown");
    press(trigger, "ArrowDown");
    press(trigger, "ArrowDown");
    expect(view.query("[data-active]").textContent).toBe("Deep 4");
    act(() => {
      document.body.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
    });
    expect(view.container.querySelector("[role='listbox']")).toBeNull();

    act(() => setOpen(true));
    const active = view.query("[data-active]");
    expect(active.textContent).toBe("Swift 2");
    expect(trigger.getAttribute("aria-activedescendant")).toBe(active.id);
    view.unmount();
  });

  test("ids are unique across instances", () => {
    const view = mount(
      <>
        <PromptInputModelSelect models={MODELS} defaultOpen />
        <PromptInputModelSelect models={MODELS} defaultOpen />
      </>,
    );
    const ids = view.all("[id]").map((element) => element.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    view.unmount();
  });
});

describe("PromptInputModeSelect", () => {
  test("calls onValueChange with the chosen id and reflects the controlled value", () => {
    function Host({ events }: { readonly events: string[] }) {
      const [mode, setMode] = useState("agent");
      return (
        <PromptInputModeSelect
          modes={MODES}
          value={mode}
          onValueChange={(id) => {
            events.push(id);
            setMode(id);
          }}
        />
      );
    }
    const events: string[] = [];
    const view = mount(<Host events={events} />);
    const trigger = view.query<HTMLButtonElement>("[role='combobox']");
    expect(trigger.getAttribute("aria-label")).toBe("Mode");
    expect(trigger.textContent).toBe("Agent");

    act(() => trigger.focus());
    press(trigger, " ");
    expect(
      view.all("[role='option']").map((option) => option.textContent),
    ).toEqual(["AskAnswers without acting", "AgentActs on your behalf"]);
    press(trigger, "ArrowUp");
    press(trigger, " ");
    expect(events).toEqual(["ask"]);
    expect(trigger.textContent).toBe("Ask");
    view.unmount();
  });

  test("open state can be owned by the host", () => {
    const changes: boolean[] = [];
    const view = mount(
      <PromptInputModeSelect
        modes={MODES}
        open
        onOpenChange={(open) => changes.push(open)}
      />,
    );
    expect(view.container.querySelector("[role='listbox']")).not.toBeNull();
    const option = view.all("[role='option']")[1];
    if (option === undefined) throw new Error("no option");
    click(option);
    expect(changes).toEqual([false]);
    // Still open: the host has not closed it.
    expect(view.container.querySelector("[role='listbox']")).not.toBeNull();
    view.unmount();
  });
});

function menuItems(events: string[]): PromptInputAddMenuItem[] {
  return [
    {
      id: "files",
      label: "Add files",
      onSelect: () => events.push(`files:${document.activeElement?.tagName}`),
    },
    {
      id: "mention",
      label: "Mention an agent",
      disabled: true,
      onSelect: () => events.push("mention"),
    },
    {
      id: "command",
      label: "Use a command",
      detail: "Starts a /",
      onSelect: () => events.push("command"),
    },
  ];
}

describe("PromptInputAddMenu", () => {
  test("opens on the first item, moves past disabled items and wraps", () => {
    const view = mount(<PromptInputAddMenu items={menuItems([])} />);
    const trigger = view.query("[aria-haspopup='menu']");
    expect(trigger.getAttribute("aria-label")).toBe("Add");
    click(trigger);
    const menu = view.query("[role='menu']");
    expect(trigger.getAttribute("aria-controls")).toBe(menu.id);
    const items = view.all("[role='menuitem']");
    expect(items[1]?.getAttribute("aria-disabled")).toBe("true");
    expect(document.activeElement).toBe(items[0] ?? null);

    press(menu, "ArrowDown");
    expect(document.activeElement).toBe(items[2] ?? null);
    press(menu, "ArrowDown");
    expect(document.activeElement).toBe(items[0] ?? null);
    press(menu, "ArrowUp");
    expect(document.activeElement).toBe(items[2] ?? null);
    press(menu, "Home");
    expect(document.activeElement).toBe(items[0] ?? null);
    view.unmount();
  });

  test("ArrowUp on the trigger opens on the last item", () => {
    const view = mount(<PromptInputAddMenu items={menuItems([])} />);
    const trigger = view.query("[aria-haspopup='menu']");
    act(() => trigger.focus());
    press(trigger, "ArrowUp");
    expect(document.activeElement?.textContent).toBe("Use a commandStarts a /");
    view.unmount();
  });

  test("choosing an item closes the menu, returns focus, then runs it", () => {
    const events: string[] = [];
    const view = mount(<PromptInputAddMenu items={menuItems(events)} />);
    const trigger = view.query("[aria-haspopup='menu']");
    click(trigger);
    const files = view.all("[role='menuitem']")[0];
    if (files === undefined) throw new Error("no item");
    click(files);
    // Focus was back on the trigger when the action ran.
    expect(events).toEqual(["files:BUTTON"]);
    expect(document.activeElement).toBe(trigger);
    expect(view.container.querySelector("[role='menu']")).toBeNull();
    view.unmount();
  });

  test("a disabled item does nothing", () => {
    const events: string[] = [];
    const view = mount(<PromptInputAddMenu items={menuItems(events)} />);
    click(view.query("[aria-haspopup='menu']"));
    const mention = view.all("[role='menuitem']")[1];
    if (mention === undefined) throw new Error("no item");
    click(mention);
    expect(events).toEqual([]);
    expect(view.container.querySelector("[role='menu']")).not.toBeNull();
    view.unmount();
  });

  test("Escape closes, returns focus and stays inside the menu", () => {
    const outer: string[] = [];
    const view = mount(
      <div onKeyDown={(event) => outer.push(event.key)}>
        <PromptInputAddMenu items={menuItems([])} />
      </div>,
    );
    const trigger = view.query("[aria-haspopup='menu']");
    click(trigger);
    press(view.query("[role='menu']"), "Escape");
    expect(view.container.querySelector("[role='menu']")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(outer).toEqual([]);
    view.unmount();
  });

  test("a menu open from the start does not take focus", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    const view = mount(
      <PromptInputAddMenu items={menuItems([])} defaultOpen />,
    );
    expect(view.container.querySelector("[role='menu']")).not.toBeNull();
    expect(document.activeElement).toBe(outside);
    view.unmount();
    outside.remove();
  });

  test("a menu whose items are all disabled opens, keeps focus and closes on Escape", () => {
    const view = mount(
      <PromptInputAddMenu
        items={[
          { id: "x", label: "X", disabled: true, onSelect: () => undefined },
        ]}
      />,
    );
    const trigger = view.query<HTMLButtonElement>("[aria-haspopup='menu']");
    act(() => trigger.focus());
    press(trigger, "ArrowDown");
    expect(view.container.querySelector("[role='menu']")).not.toBeNull();
    expect(document.activeElement).toBe(trigger);
    press(trigger, "Escape");
    expect(view.container.querySelector("[role='menu']")).toBeNull();
    view.unmount();
  });

  test("unmounting while open removes its document listeners", () => {
    const added = spyOn(document, "addEventListener");
    const removed = spyOn(document, "removeEventListener");
    try {
      const view = mount(
        <PromptInputAddMenu items={menuItems([])} defaultOpen />,
      );
      view.unmount();
      const count = (calls: readonly (readonly unknown[])[], type: string) =>
        calls.filter(([name]) => name === type).length;
      expect(count(added.mock.calls, "pointerdown")).toBeGreaterThan(0);
      expect(count(removed.mock.calls, "pointerdown")).toBe(
        count(added.mock.calls, "pointerdown"),
      );
    } finally {
      added.mockRestore();
      removed.mockRestore();
    }
  });
});

describe("PromptInputButton", () => {
  test("never submits the form it sits in", () => {
    const submits: string[] = [];
    const view = mount(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submits.push("submit");
        }}
      >
        <PromptInputButton aria-label="Voice">v</PromptInputButton>
      </form>,
    );
    const button = view.query<HTMLButtonElement>(
      "[data-slot='prompt-input-button']",
    );
    expect(button.type).toBe("button");
    click(button);
    expect(submits).toEqual([]);
    view.unmount();
  });
});

describe("PromptInputContext", () => {
  test("offers a clear button only when it can be cleared", () => {
    const cleared: string[] = [];
    const plain = mount(
      <PromptInputContext label="Replying to" detail="Ada" />,
    );
    expect(plain.container.querySelector("button")).toBeNull();
    expect(plain.container.textContent).toBe("Replying to Ada");
    plain.unmount();

    const clearable = mount(
      <PromptInputContext
        label="Replying to"
        detail="Ada"
        clearLabel="Stop replying"
        onClear={() => cleared.push("clear")}
      />,
    );
    const button = clearable.query("button");
    expect(button.getAttribute("aria-label")).toBe("Stop replying");
    click(button);
    expect(cleared).toEqual(["clear"]);
    clearable.unmount();
  });
});
