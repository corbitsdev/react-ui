import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { RadioGroup, RadioOption } from "./radio-group.js";

function mount(value: string, onValueChange: (value: string) => void) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(RadioGroup, {
        name: "mode",
        label: "Mode",
        value,
        onValueChange,
        children: [
          createElement(RadioOption, { key: "agent", value: "agent", label: "Agent", description: "Runs on its own." }),
          createElement(RadioOption, { key: "chat", value: "chat", label: "Chat" }),
        ],
      }),
    );
  });
  return {
    group: () => container.querySelector('[role="radiogroup"]') as HTMLElement,
    inputs: () => Array.from(container.querySelectorAll('input[type="radio"]')) as HTMLInputElement[],
    container,
    unmount: () => root.unmount(),
  };
}

describe("RadioGroup / RadioOption", () => {
  test("the container carries role=radiogroup and an accessible name", () => {
    const { group, unmount } = mount("agent", () => {});
    expect(group().getAttribute("aria-label")).toBe("Mode");
    unmount();
  });

  test("options share the same name so arrow-key roving works between them", () => {
    const { inputs, unmount } = mount("agent", () => {});
    const names = inputs().map((input) => input.name);
    expect(new Set(names).size).toBe(1);
    unmount();
  });

  test("only the option matching value is checked", () => {
    const { inputs, unmount } = mount("chat", () => {});
    const all = inputs();
    expect(all[0]?.checked).toBe(false);
    expect(all[1]?.checked).toBe(true);
    unmount();
  });

  test("selecting an option calls onValueChange with its value", () => {
    let received: string | undefined;
    const { inputs, unmount } = mount("agent", (value) => {
      received = value;
    });
    act(() => {
      inputs()[1]?.click();
    });
    expect(received).toBe("chat");
    unmount();
  });

  test("description text is wired via aria-describedby", () => {
    const { inputs, container, unmount } = mount("agent", () => {});
    const describedBy = inputs()[0]?.getAttribute("aria-describedby") ?? null;
    expect(describedBy).not.toBeNull();
    const description = container.querySelector(`#${describedBy}`);
    expect(description?.textContent).toBe("Runs on its own.");
    unmount();
  });

  test("an option without a description has no aria-describedby", () => {
    const { inputs, unmount } = mount("agent", () => {});
    expect(inputs()[1]?.getAttribute("aria-describedby") ?? null).toBeNull();
    unmount();
  });

  test("clicking the description text selects the option — the whole row is the label", () => {
    let received: string | undefined;
    const { container, inputs, unmount } = mount("chat", (value) => {
      received = value;
    });
    const describedBy = inputs()[0]?.getAttribute("aria-describedby") ?? null;
    const description = container.querySelector(`#${describedBy}`) as HTMLElement;
    act(() => {
      description.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(received).toBe("agent");
    unmount();
  });

  test("without a label, renders just the bare control", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(RadioGroup, {
          name: "bare",
          label: "Mode",
          value: "agent",
          onValueChange: () => {},
          children: createElement(RadioOption, { key: "agent", value: "agent", id: "bare-radio" }),
        }),
      );
    });
    expect(container.querySelector("label")).toBeNull();
    expect((container.querySelector("input") as HTMLInputElement).id).toBe("bare-radio");
    root.unmount();
  });

  test("without a label, describedBy passes through to aria-describedby", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(RadioGroup, {
          name: "bare",
          label: "Mode",
          value: "agent",
          onValueChange: () => {},
          children: createElement(RadioOption, {
            key: "agent",
            value: "agent",
            id: "bare-radio",
            describedBy: "external-description",
          }),
        }),
      );
    });
    expect((container.querySelector("input") as HTMLInputElement).getAttribute("aria-describedby")).toBe(
      "external-description",
    );
    root.unmount();
  });

  test("throws when RadioOption is rendered outside a RadioGroup", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    expect(() => {
      act(() => {
        root.render(createElement(RadioOption, { value: "solo", label: "Solo" }));
      });
    }).toThrow();
    root.unmount();
  });
});
