import { act, createRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "bun:test";

import { useTabs } from "../hooks/use-tabs.js";
import { PanelTab, PanelTabAdd, PanelTabs } from "./panel-tabs.js";

type Tab = { readonly value: string; readonly title: string };

const TABS: readonly Tab[] = [
  { value: "notes", title: "Notes" },
  { value: "draft", title: "Draft" },
  { value: "log", title: "Log" },
];

function Strip({ withAdd = false }: { readonly withAdd?: boolean }) {
  const { tabs, tabsProps, paneProps } = useTabs<Tab>({ defaultTabs: TABS });
  return (
    <section data-slot="panel" tabIndex={-1}>
      <PanelTabs label="Open items" {...tabsProps}>
        {tabs.map((tab) => (
          <PanelTab key={tab.value} value={tab.value}>
            {tab.title}
          </PanelTab>
        ))}
      </PanelTabs>
      {withAdd ? <PanelTabAdd /> : null}
      {tabsProps.value === null ? null : (
        <div {...paneProps(tabsProps.value)}>{tabsProps.value}</div>
      )}
    </section>
  );
}

function ControlledStrip() {
  const [selected, setSelected] = useState<string | null>("draft");
  const { tabs, tabsProps } = useTabs<Tab>({
    defaultTabs: TABS,
    value: selected,
    onValueChange: setSelected,
  });
  return (
    <section data-slot="panel" tabIndex={-1}>
      <PanelTabs label="Open items" {...tabsProps}>
        {tabs.map((tab) => (
          <PanelTab key={tab.value} value={tab.value}>
            {tab.title}
          </PanelTab>
        ))}
      </PanelTabs>
    </section>
  );
}

let root: Root | null = null;
let container: HTMLElement | null = null;

function mount(node: React.ReactElement): HTMLElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  const target = container;
  act(() => {
    root = createRoot(target);
    root.render(node);
  });
  return target;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

function tabs(host: HTMLElement): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>("[role='tab']")];
}

function tab(host: HTMLElement, name: string): HTMLElement {
  const found = tabs(host).find((element) => element.textContent === name);
  if (found === undefined) throw new Error(`no tab named ${name}`);
  return found;
}

function press(target: HTMLElement, key: string, init: KeyboardEventInit = {}) {
  act(() => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, ...init }),
    );
  });
}

describe("PanelTabs", () => {
  test("only the selected tab is a tab stop and names its pane", () => {
    const host = mount(<Strip />);
    expect(tabs(host).map((element) => element.tabIndex)).toEqual([0, -1, -1]);
    const notes = tab(host, "Notes");
    expect(notes.getAttribute("aria-selected")).toBe("true");
    const pane = host.querySelector("[role='tabpanel']");
    expect(notes.getAttribute("aria-controls")).toBe(pane?.id ?? "missing");
    expect(pane?.getAttribute("aria-labelledby")).toBe(notes.id);
    expect(tab(host, "Draft").hasAttribute("aria-controls")).toBe(false);
  });

  test("arrows, Home and End select and focus as they go", () => {
    const host = mount(<Strip />);
    tab(host, "Notes").focus();
    press(tab(host, "Notes"), "ArrowRight");
    expect(document.activeElement).toBe(tab(host, "Draft"));
    expect(tab(host, "Draft").getAttribute("aria-selected")).toBe("true");
    press(tab(host, "Draft"), "End");
    expect(document.activeElement).toBe(tab(host, "Log"));
    press(tab(host, "Log"), "ArrowRight");
    expect(document.activeElement).toBe(tab(host, "Notes"));
    press(tab(host, "Notes"), "ArrowLeft");
    expect(document.activeElement).toBe(tab(host, "Log"));
    press(tab(host, "Log"), "Home");
    expect(document.activeElement).toBe(tab(host, "Notes"));
  });

  test("Delete closes the focused tab and focuses the one that takes over", () => {
    const host = mount(<Strip />);
    tab(host, "Notes").focus();
    press(tab(host, "Notes"), "Delete");
    expect(tabs(host).map((element) => element.textContent)).toEqual([
      "Draft",
      "Log",
    ]);
    expect(document.activeElement).toBe(tab(host, "Draft"));
    expect(tab(host, "Draft").tabIndex).toBe(0);
  });

  test("Backspace, the Mac delete key, closes the focused tab too", () => {
    const host = mount(<Strip />);
    expect(tab(host, "Notes").getAttribute("aria-keyshortcuts")).toStartWith(
      "Delete Backspace ",
    );
    tab(host, "Notes").focus();
    press(tab(host, "Notes"), "Backspace");
    expect(tabs(host).map((element) => element.textContent)).toEqual([
      "Draft",
      "Log",
    ]);
    expect(document.activeElement).toBe(tab(host, "Draft"));
  });

  test("with a controlled selection, Delete focuses the tab that takes over", () => {
    const host = mount(<ControlledStrip />);
    tab(host, "Draft").focus();
    press(tab(host, "Draft"), "Delete");
    expect(tabs(host).map((element) => element.textContent)).toEqual([
      "Notes",
      "Log",
    ]);
    expect(tab(host, "Log").getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(tab(host, "Log"));
  });

  test("under dir=rtl, ArrowLeft goes to the next tab", () => {
    const host = mount(
      <div dir="rtl" style={{ direction: "rtl" }}>
        <Strip />
      </div>,
    );
    tab(host, "Notes").focus();
    press(tab(host, "Notes"), "ArrowLeft");
    expect(document.activeElement).toBe(tab(host, "Draft"));
  });

  test("host props cannot unlink a tab, and ref lands on its root", () => {
    const rootRef = createRef<HTMLDivElement>();
    const host = mount(
      <PanelTabs label="Open items" value="a" onValueChange={() => {}}>
        <PanelTab
          value="a"
          ref={rootRef}
          {...{ id: "mine", tabIndex: 3, "aria-selected": false }}
        >
          A
        </PanelTab>
      </PanelTabs>,
    );
    const button = tab(host, "A");
    expect(button.id).not.toBe("mine");
    expect(button.tabIndex).toBe(0);
    expect(button.getAttribute("aria-selected")).toBe("true");
    expect(button.parentElement).toBe(rootRef.current);
    expect(button.parentElement?.dataset["slot"]).toBe("panel-tab");
  });

  test("closing the last tab sends focus to the +", () => {
    const host = mount(<Strip withAdd />);
    tab(host, "Notes").focus();
    for (const _ of TABS)
      press(document.activeElement as HTMLElement, "Delete");
    expect(tabs(host)).toEqual([]);
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Open a tab",
    );
  });

  test("Ctrl or Cmd with Shift and an arrow moves the tab, keeping focus", () => {
    const host = mount(<Strip />);
    tab(host, "Notes").focus();
    press(tab(host, "Notes"), "ArrowRight", { ctrlKey: true, shiftKey: true });
    expect(tabs(host).map((element) => element.textContent)).toEqual([
      "Draft",
      "Notes",
      "Log",
    ]);
    expect(document.activeElement).toBe(tab(host, "Notes"));
    press(tab(host, "Notes"), "ArrowRight", { metaKey: true, shiftKey: true });
    press(tab(host, "Notes"), "ArrowRight", { metaKey: true, shiftKey: true });
    expect(tabs(host).map((element) => element.textContent)).toEqual([
      "Draft",
      "Log",
      "Notes",
    ]);
    expect(tab(host, "Notes").getAttribute("aria-selected")).toBe("true");
  });

  test("the × and a middle-click close a tab without taking focus", () => {
    const host = mount(<Strip />);
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();
    const draft = tab(host, "Draft").closest<HTMLElement>(
      "[data-slot='panel-tab']",
    );
    act(() => {
      draft
        ?.querySelector<HTMLElement>("[data-slot='panel-tab-close']")
        ?.click();
    });
    expect(tabs(host).map((element) => element.textContent)).toEqual([
      "Notes",
      "Log",
    ]);
    const log = tab(host, "Log").closest<HTMLElement>(
      "[data-slot='panel-tab']",
    );
    act(() => {
      log?.dispatchEvent(
        new MouseEvent("auxclick", { button: 1, bubbles: true }),
      );
    });
    expect(tabs(host).map((element) => element.textContent)).toEqual(["Notes"]);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  test("a tab outside PanelTabs throws", () => {
    const original = console.error;
    console.error = () => {};
    try {
      expect(() => mount(<PanelTab value="x">X</PanelTab>)).toThrow(
        "PanelTab must be inside PanelTabs.",
      );
    } finally {
      console.error = original;
    }
  });
});
