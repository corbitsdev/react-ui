import { describe, expect, spyOn, test } from "bun:test";
import { act, createRef, type ReactNode, useState } from "react";
import { createRoot, type Root } from "react-dom/client";

import type { PromptToken } from "../lib/prompt-tokens.js";
import { Dialog, DialogContent, DialogTitle } from "./dialog.js";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputSuggestions,
  PromptInputTextarea,
} from "./prompt-input.js";
import {
  PromptInputAddMenu,
  PromptInputButton,
  PromptInputContext,
  PromptInputFloat,
  PromptInputModeSelect,
  PromptInputModelSelect,
  PromptInputNote,
  PromptInputToolbar,
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
    rerender(next: ReactNode) {
      act(() => root.render(next));
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

/** `keyCode` is set on the event itself: `KeyboardEventInit` drops it. */
function press(
  target: Element,
  key: string,
  { keyCode, ...init }: KeyboardEventInit & { keyCode?: number } = {},
): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    ...init,
    key,
    bubbles: true,
    cancelable: true,
  });
  if (keyCode !== undefined) {
    Object.defineProperty(event, "keyCode", { value: keyCode });
  }
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

function click(target: HTMLElement) {
  act(() => target.click());
}

/** Whether a press on `target` keeps the browser from moving focus. */
function pressKeepsFocus(target: Element): boolean {
  const event = new MouseEvent("mousedown", {
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event.defaultPrevented;
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
    // Named for the field and the choice, as a closed picker is heard.
    expect(trigger.getAttribute("aria-label")).toBe("Model, Swift");
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

  test("a press anywhere in the open list keeps focus on the trigger", () => {
    const view = mount(<PromptInputModelSelect models={MODELS} />);
    click(view.query("[role='combobox']"));
    const list = view.query("[role='listbox']");
    const heading = document.getElementById(
      view.query("[role='group']").getAttribute("aria-labelledby") ?? "",
    );
    if (heading === null) throw new Error("no heading");
    expect(pressKeepsFocus(list)).toBe(true);
    expect(pressKeepsFocus(heading)).toBe(true);
    expect(pressKeepsFocus(view.query("[role='option']"))).toBe(true);
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
    const trigger = view.query("[role='combobox']");
    expect(trigger.textContent).toBe("Model");
    expect(trigger.getAttribute("aria-label")).toBe("Model");
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
    expect(trigger.getAttribute("aria-label")).toBe("Mode, Agent");
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
    expect(trigger.getAttribute("aria-label")).toBe("Mode, Ask");
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

  test("a press anywhere in the open menu keeps focus where it is", () => {
    const view = mount(<PromptInputAddMenu items={menuItems([])} />);
    click(view.query("[aria-haspopup='menu']"));
    expect(pressKeepsFocus(view.query("[role='menu']"))).toBe(true);
    expect(pressKeepsFocus(view.query("[role='menuitem']"))).toBe(true);
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

  test("an ArrowUp the host declined does not make its later open take focus", () => {
    const asks: boolean[] = [];
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <PromptInputAddMenu
            items={menuItems([])}
            open={open}
            onOpenChange={(next) => asks.push(next)}
          />
          <button type="button" data-host onClick={() => setOpen(true)}>
            Open
          </button>
        </>
      );
    }
    const view = mount(<Host />);
    const trigger = view.query("[aria-haspopup='menu']");
    act(() => trigger.focus());
    press(trigger, "ArrowUp");
    expect(asks).toEqual([true]);
    expect(view.container.querySelector("[role='menu']")).toBeNull();
    click(view.query("[data-host]"));
    expect(view.container.querySelector("[role='menu']")).not.toBeNull();
    expect(document.activeElement?.getAttribute("aria-haspopup")).toBe("menu");
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

describe("a popup whose options run out", () => {
  /** Each popup with or without its options, open state owned by the host
   * when `controlled`. */
  const POPUP_PARTS = {
    add: {
      popup: "[role='menu']",
      render: (empty: boolean, state: PopupState) => (
        <PromptInputAddMenu items={empty ? [] : menuItems([])} {...state} />
      ),
    },
    model: {
      popup: "[role='listbox']",
      render: (empty: boolean, state: PopupState) => (
        <PromptInputModelSelect models={empty ? [] : MODELS} {...state} />
      ),
    },
    mode: {
      popup: "[role='listbox']",
      render: (empty: boolean, state: PopupState) => (
        <PromptInputModeSelect modes={empty ? [] : MODES} {...state} />
      ),
    },
  } as const;
  type PopupState = {
    readonly open?: boolean;
    readonly defaultOpen?: boolean;
    readonly onOpenChange: (open: boolean) => void;
  };

  for (const which of ["add", "model", "mode"] as const) {
    for (const controlled of [false, true]) {
      test(`the ${controlled ? "host-owned" : "own"} ${which} popup closes once and stays closed when they return`, () => {
        const { popup, render } = POPUP_PARTS[which];
        const changes: boolean[] = [];
        function Host({ empty }: { readonly empty: boolean }) {
          const [open, setOpen] = useState(true);
          const onOpenChange = (next: boolean) => {
            changes.push(next);
            setOpen(next);
          };
          return render(
            empty,
            controlled
              ? { open, onOpenChange }
              : { defaultOpen: true, onOpenChange },
          );
        }
        const view = mount(<Host empty={false} />);
        expect(shown(view, popup)).toBe(true);
        view.rerender(<Host empty />);
        expect(changes).toEqual([false]);
        view.rerender(<Host empty={false} />);
        expect(shown(view, popup)).toBe(false);
        expect(changes).toEqual([false]);
        view.unmount();
      });
    }
  }
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

describe("refs", () => {
  test("the add menu and both selects hand their root to a ref", () => {
    const add = createRef<HTMLDivElement>();
    const model = createRef<HTMLDivElement>();
    const mode = createRef<HTMLDivElement>();
    const view = mount(
      <>
        <PromptInputAddMenu ref={add} items={menuItems([])} />
        <PromptInputModelSelect ref={model} models={MODELS} />
        <PromptInputModeSelect ref={mode} modes={MODES} />
      </>,
    );
    expect(add.current).toBe(
      view.query<HTMLDivElement>("[data-slot='prompt-input-add-menu']"),
    );
    expect(model.current).toBe(
      view.query<HTMLDivElement>("[data-slot='prompt-input-model-select']"),
    );
    expect(mode.current).toBe(
      view.query<HTMLDivElement>("[data-slot='prompt-input-mode-select']"),
    );
    view.unmount();
    expect(add.current).toBeNull();
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

describe("PromptInputToolbar, PromptInputFloat and PromptInputNote", () => {
  test("each renders its slot, keeps the host's props and merges its class", () => {
    const view = mount(
      <>
        <PromptInputToolbar aria-label="Message tools" className="host-a">
          <button type="button">Tool</button>
        </PromptInputToolbar>
        <PromptInputFloat id="float" className="host-b">
          Floating
        </PromptInputFloat>
        <PromptInputNote className="host-c">Small print</PromptInputNote>
      </>,
    );
    const toolbar = view.query("[data-slot='prompt-input-toolbar']");
    expect(toolbar.tagName).toBe("DIV");
    expect(toolbar.getAttribute("aria-label")).toBe("Message tools");
    expect(toolbar.classList.contains("basis-full")).toBe(true);
    expect(toolbar.classList.contains("host-a")).toBe(true);
    expect(toolbar.textContent).toBe("Tool");

    const float = view.query("[data-slot='prompt-input-float']");
    expect(float.id).toBe("float");
    expect(float.classList.contains("absolute")).toBe(true);
    expect(float.classList.contains("host-b")).toBe(true);
    expect(float.textContent).toBe("Floating");

    const note = view.query("[data-slot='prompt-input-note']");
    expect(note.tagName).toBe("P");
    expect(note.classList.contains("host-c")).toBe(true);
    expect(note.textContent).toBe("Small print");
    view.unmount();
  });
});

const TOKENS: readonly PromptToken[] = [
  { id: "ada", kind: "mention", token: "@Ada" },
];

/** A prompt with a toolbar, as a host would put one together. */
function Prompt({
  open,
  disabled = false,
  partsDisabled,
  events,
}: {
  readonly open?: "add" | "model";
  readonly disabled?: boolean;
  readonly partsDisabled?: boolean;
  /** Records the popups' open changes and choices. */
  readonly events?: string[];
}) {
  const [value, setValue] = useState("");
  const own = partsDisabled === undefined ? {} : { disabled: partsDisabled };
  return (
    <PromptInput
      value={value}
      onValueChange={setValue}
      onSubmit={() => undefined}
      tokens={TOKENS}
      disabled={disabled}
    >
      <PromptInputSuggestions />
      <PromptInputTextarea />
      <PromptInputToolbar>
        <PromptInputAddMenu
          {...own}
          defaultOpen={open === "add"}
          onOpenChange={(next) => events?.push(`add:${next}`)}
          items={[
            { id: "f", label: "Add files", onSelect: () => events?.push("f") },
          ]}
        />
        <PromptInputModeSelect {...own} modes={MODES} />
        <PromptInputModelSelect
          {...own}
          models={MODELS}
          defaultOpen={open === "model"}
          onOpenChange={(next) => events?.push(`model:${next}`)}
          onValueChange={(id) => events?.push(`model=${id}`)}
        />
        <PromptInputButton {...own} aria-label="Voice">
          v
        </PromptInputButton>
        <PromptInputSubmit />
      </PromptInputToolbar>
    </PromptInput>
  );
}

/** A boolean rather than the element, so a failure prints a line, not a
 * React tree. */
function shown(view: { readonly container: HTMLElement }, selector: string) {
  return view.container.querySelector(selector) !== null;
}

const POPUPS = {
  add: { popup: "[role='menu']", trigger: "[aria-haspopup='menu']" },
  model: {
    popup: "[role='listbox']",
    trigger: "[data-slot='prompt-input-model-select'] [role='combobox']",
  },
} as const;

/** `Prompt` in a dialog that records its own open changes. The dialog
 * renders in a portal, so its contents are queried from `document`. */
function InDialog({
  dialog,
  open,
}: {
  readonly dialog: boolean[];
  readonly open?: "add" | "model";
}) {
  const [isOpen, setOpen] = useState(true);
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(next) => {
        dialog.push(next);
        setOpen(next);
      }}
    >
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Chat</DialogTitle>
        <Prompt {...(open === undefined ? {} : { open })} />
      </DialogContent>
    </Dialog>
  );
}

/** A prompt in a dialog whose model list the host opens with a button. */
function HostModelInDialog({ dialog }: { readonly dialog: boolean[] }) {
  const [value, setValue] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  return (
    <Dialog open onOpenChange={(next) => dialog.push(next)}>
      <DialogContent aria-describedby={undefined}>
        <DialogTitle>Chat</DialogTitle>
        <PromptInput
          value={value}
          onValueChange={setValue}
          onSubmit={() => undefined}
          tokens={TOKENS}
        >
          <PromptInputSuggestions />
          <PromptInputTextarea />
          <PromptInputToolbar>
            <PromptInputModelSelect
              models={MODELS}
              open={modelOpen}
              onOpenChange={setModelOpen}
            />
          </PromptInputToolbar>
        </PromptInput>
        <button type="button" data-host onClick={() => setModelOpen(true)}>
          Open models
        </button>
      </DialogContent>
    </Dialog>
  );
}

function typeMention(textarea: HTMLTextAreaElement) {
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  act(() => {
    textarea.focus();
    setValue?.call(textarea, "@");
    textarea.setSelectionRange(1, 1);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function inDialog<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(`[role='dialog'] ${selector}`);
  if (element === null) throw new Error(`no ${selector}`);
  return element;
}

describe("toolbar parts inside PromptInput", () => {
  for (const which of ["add", "model"] as const) {
    test(`the ${which} popup, opened by the host, closes on Escape from the textarea and focus stays there`, () => {
      const view = mount(<Prompt open={which} />);
      const textarea = view.query<HTMLTextAreaElement>("textarea");
      act(() => textarea.focus());
      expect(shown(view, POPUPS[which].popup)).toBe(true);
      press(textarea, "Escape");
      expect(shown(view, POPUPS[which].popup)).toBe(false);
      expect(
        view.query(POPUPS[which].trigger).getAttribute("aria-expanded"),
      ).toBe("false");
      expect(document.activeElement).toBe(textarea);
      view.unmount();
    });
  }

  // Safari sends the key that ends a composition with `isComposing` already
  // false and `keyCode` 229.
  for (const [how, init] of [
    ["isComposing", { isComposing: true }],
    ["keyCode 229", { isComposing: false, keyCode: 229 }],
  ] as const) {
    for (const which of ["add", "model"] as const) {
      test(`an Escape that ends an IME composition (${how}) leaves the host-opened ${which} popup open`, () => {
        const events: string[] = [];
        const view = mount(<Prompt open={which} events={events} />);
        const textarea = view.query<HTMLTextAreaElement>("textarea");
        act(() => textarea.focus());
        const event = press(textarea, "Escape", init);
        expect(event.defaultPrevented).toBe(false);
        expect(events).toEqual([]);
        expect(shown(view, POPUPS[which].popup)).toBe(true);
        view.unmount();
      });
    }
  }

  test("with the suggestion list open too, the first Escape closes only the list", () => {
    const view = mount(<Prompt open="add" />);
    const textarea = view.query<HTMLTextAreaElement>("textarea");
    const setValue = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    act(() => {
      textarea.focus();
      setValue?.call(textarea, "@");
      textarea.setSelectionRange(1, 1);
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const list = "[data-slot='prompt-input-suggestions']";
    expect(shown(view, list)).toBe(true);
    expect(shown(view, "[role='menu']")).toBe(true);

    press(textarea, "Escape");
    expect(shown(view, list)).toBe(false);
    expect(shown(view, "[role='menu']")).toBe(true);

    press(textarea, "Escape");
    expect(shown(view, "[role='menu']")).toBe(false);
    expect(document.activeElement).toBe(textarea);
    view.unmount();
  });

  test("a popup's own Escape is not handled twice", () => {
    const changes: boolean[] = [];
    const view = mount(
      <PromptInputAddMenu
        items={menuItems([])}
        onOpenChange={(open) => changes.push(open)}
      />,
    );
    const trigger = view.query("[aria-haspopup='menu']");
    click(trigger);
    press(view.query("[role='menu']"), "Escape");
    expect(changes).toEqual([true, false]);
    expect(document.activeElement).toBe(trigger);
    view.unmount();
  });

  test("Escape inside the add menu closes the menu, not an enclosing dialog", () => {
    const dialog: boolean[] = [];
    const view = mount(<InDialog dialog={dialog} />);
    const trigger = inDialog("[aria-haspopup='menu']");
    click(trigger);
    const item = inDialog("[role='menuitem']");
    expect(document.activeElement).toBe(item);
    press(item, "Escape");
    expect(dialog).toEqual([]);
    expect(document.querySelector("[role='dialog'] [role='menu']")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    view.unmount();
  });

  test("Escape on an open select closes the list, not an enclosing dialog", () => {
    const dialog: boolean[] = [];
    const view = mount(<InDialog dialog={dialog} />);
    const trigger = inDialog(POPUPS.model.trigger);
    act(() => trigger.focus());
    click(trigger);
    expect(
      document.querySelector("[role='dialog'] [role='listbox']"),
    ).not.toBeNull();
    press(trigger, "Escape");
    expect(dialog).toEqual([]);
    expect(
      document.querySelector("[role='dialog'] [role='listbox']"),
    ).toBeNull();
    expect(document.activeElement).toBe(trigger);
    view.unmount();
  });

  for (const which of ["add", "model"] as const) {
    test(`Escape from the textarea closes the host-opened ${which} popup, not an enclosing dialog`, () => {
      const dialog: boolean[] = [];
      const view = mount(<InDialog dialog={dialog} open={which} />);
      const textarea = inDialog<HTMLTextAreaElement>("textarea");
      act(() => textarea.focus());
      const popup = `[role='dialog'] ${POPUPS[which].popup}`;
      expect(document.querySelector(popup)).not.toBeNull();
      press(textarea, "Escape");
      expect(dialog).toEqual([]);
      expect(document.querySelector(popup)).toBeNull();
      expect(document.activeElement).toBe(textarea);
      view.unmount();
    });
  }

  test("Escape in an unrelated dialog closes the dialog, not a host-opened list", () => {
    const events: string[] = [];
    const dialog: boolean[] = [];
    function Page() {
      const [isOpen, setOpen] = useState(true);
      return (
        <>
          <Prompt open="model" events={events} />
          <Dialog
            open={isOpen}
            onOpenChange={(next) => {
              dialog.push(next);
              setOpen(next);
            }}
          >
            <DialogContent aria-describedby={undefined}>
              <DialogTitle>Other</DialogTitle>
              <button type="button" data-other>
                Other
              </button>
            </DialogContent>
          </Dialog>
        </>
      );
    }
    const view = mount(<Page />);
    const other = inDialog("[data-other]");
    act(() => other.focus());
    press(other, "Escape");
    expect(dialog).toEqual([false]);
    expect(events).toEqual([]);
    expect(shown(view, POPUPS.model.popup)).toBe(true);
    view.unmount();
  });

  test("Escape inside the add menu leaves a host-opened list open", () => {
    const events: string[] = [];
    const view = mount(<Prompt open="model" events={events} />);
    const trigger = view.query(POPUPS.add.trigger);
    act(() => trigger.focus());
    press(trigger, "ArrowDown");
    const item = view.query("[role='menuitem']");
    expect(document.activeElement).toBe(item);
    press(item, "Escape");
    expect(events).toEqual(["add:true", "add:false"]);
    expect(shown(view, POPUPS.add.popup)).toBe(false);
    expect(shown(view, POPUPS.model.popup)).toBe(true);
    expect(document.activeElement).toBe(trigger);
    view.unmount();
  });

  for (const first of ["popup", "list"] as const) {
    test(`in a dialog, with the ${first} opened first, Escape closes the list, then the popup, and never the dialog`, () => {
      const dialog: boolean[] = [];
      const view = mount(<HostModelInDialog dialog={dialog} />);
      const textarea = inDialog<HTMLTextAreaElement>("textarea");
      const openPopup = () => click(inDialog("[data-host]"));
      if (first === "popup") openPopup();
      typeMention(textarea);
      if (first === "list") openPopup();
      const list = "[role='dialog'] [data-slot='prompt-input-suggestions']";
      const popup = "[role='dialog'] [role='listbox'][aria-label='Model']";
      expect(document.querySelector(list)).not.toBeNull();
      expect(document.querySelector(popup)).not.toBeNull();

      press(textarea, "Escape");
      expect(dialog).toEqual([]);
      expect(document.querySelector(list)).toBeNull();
      expect(document.querySelector(popup)).not.toBeNull();

      press(textarea, "Escape");
      expect(dialog).toEqual([]);
      expect(document.querySelector(popup)).toBeNull();
      expect(document.activeElement).toBe(textarea);
      view.unmount();
    });
  }

  for (const which of ["add", "model"] as const) {
    test(`the ${which} popup, open from the start in a disabled prompt, is not shown`, () => {
      const events: string[] = [];
      const view = mount(<Prompt open={which} disabled events={events} />);
      expect(shown(view, POPUPS[which].popup)).toBe(false);
      expect(
        view.query(POPUPS[which].trigger).getAttribute("aria-expanded"),
      ).toBe("false");
      expect(events.filter((event) => !event.includes(":"))).toEqual([]);
      view.unmount();
    });

    test(`disabling the prompt closes the open ${which} popup for good`, () => {
      const events: string[] = [];
      const view = mount(<Prompt open={which} events={events} />);
      expect(shown(view, POPUPS[which].popup)).toBe(true);
      view.rerender(<Prompt open={which} disabled events={events} />);
      expect(shown(view, POPUPS[which].popup)).toBe(false);
      expect(events).toEqual([`${which}:false`]);
      view.rerender(<Prompt open={which} events={events} />);
      expect(shown(view, POPUPS[which].popup)).toBe(false);
      view.unmount();
    });
  }

  test("the parts follow PromptInput's disabled", () => {
    const view = mount(<Prompt disabled />);
    expect(view.query<HTMLTextAreaElement>("textarea").disabled).toBe(true);
    const parts = view.all(
      "[aria-haspopup='menu'], [role='combobox'], [data-slot='prompt-input-button']",
    );
    expect(parts).toHaveLength(4);
    for (const part of parts) {
      expect((part as HTMLButtonElement).disabled).toBe(true);
    }
    view.unmount();
  });

  test("a part's own disabled wins over PromptInput's", () => {
    const enabled = mount(<Prompt disabled partsDisabled={false} />);
    for (const part of enabled.all(
      "[aria-haspopup='menu'], [role='combobox'], [data-slot='prompt-input-button']",
    )) {
      expect((part as HTMLButtonElement).disabled).toBe(false);
    }
    enabled.unmount();

    const disabled = mount(<Prompt partsDisabled />);
    for (const part of disabled.all(
      "[aria-haspopup='menu'], [role='combobox'], [data-slot='prompt-input-button']",
    )) {
      expect((part as HTMLButtonElement).disabled).toBe(true);
    }
    disabled.unmount();
  });
});
