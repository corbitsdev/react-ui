import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";

import { Checkbox } from "./checkbox.js";

function mount(props: ComponentProps<typeof Checkbox>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(Checkbox, props));
  });
  return {
    input: () => container.querySelector("input") as HTMLInputElement,
    label: () => container.querySelector("label") as HTMLLabelElement,
    container,
    unmount: () => root.unmount(),
  };
}

describe("Checkbox", () => {
  test("renders a native checkbox labelled by its own label text", () => {
    const { input, label, unmount } = mount({ label: "Auto-approve", checked: false, onCheckedChange: () => {} });
    expect(input().type).toBe("checkbox");
    expect(label().textContent).toBe("Auto-approve");
    expect(label().getAttribute("for")).toBe(input().id);
    unmount();
  });

  test("clicking calls onCheckedChange with the next value", () => {
    let received: boolean | undefined;
    const { input, unmount } = mount({
      label: "Auto-approve",
      checked: false,
      onCheckedChange: (checked) => {
        received = checked;
      },
    });
    act(() => {
      input().click();
    });
    expect(received).toBe(true);
    unmount();
  });

  test("description text is wired via aria-describedby", () => {
    const { input, container, unmount } = mount({
      label: "Auto-approve",
      description: "The agent may act without asking.",
      checked: false,
      onCheckedChange: () => {},
    });
    const describedBy = input().getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    const description = container.querySelector(`#${describedBy}`);
    expect(description?.textContent).toBe("The agent may act without asking.");
    unmount();
  });

  test("omits aria-describedby when there is no description", () => {
    const { input, unmount } = mount({ label: "Auto-approve", checked: false, onCheckedChange: () => {} });
    expect(input().getAttribute("aria-describedby")).toBeNull();
    unmount();
  });

  test("indeterminate sets the DOM property, which has no HTML attribute", () => {
    const { input, unmount } = mount({
      label: "Select all",
      checked: false,
      indeterminate: true,
      onCheckedChange: () => {},
    });
    expect(input().indeterminate).toBe(true);
    expect(input().getAttribute("indeterminate")).toBeNull();
    unmount();
  });

  test("disabled disables the control", () => {
    const { input, unmount } = mount({ label: "Auto-approve", checked: false, onCheckedChange: () => {}, disabled: true });
    expect(input().disabled).toBe(true);
    unmount();
  });

  test("invalid marks the control as aria-invalid", () => {
    const { input, unmount } = mount({ label: "Agree", checked: false, onCheckedChange: () => {}, invalid: true });
    expect(input().getAttribute("aria-invalid")).toBe("true");
    unmount();
  });

  test("clicking the description text toggles the checkbox — the whole row is the label", () => {
    let received: boolean | undefined;
    const { container, input, unmount } = mount({
      label: "Auto-approve",
      description: "The agent may act without asking.",
      checked: false,
      onCheckedChange: (checked) => {
        received = checked;
      },
    });
    const describedBy = input().getAttribute("aria-describedby");
    const description = container.querySelector(`#${describedBy}`) as HTMLElement;
    act(() => {
      description.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(received).toBe(true);
    unmount();
  });

  test("without a label, renders just the bare control", () => {
    const { container, input, unmount } = mount({ checked: false, onCheckedChange: () => {}, id: "bare-checkbox" });
    expect(container.querySelector("label")).toBeNull();
    expect(input().id).toBe("bare-checkbox");
    unmount();
  });

  test("without a label, describedBy passes through to aria-describedby", () => {
    const { input, unmount } = mount({
      checked: false,
      onCheckedChange: () => {},
      id: "bare-checkbox",
      describedBy: "external-description",
    });
    expect(input().getAttribute("aria-describedby")).toBe("external-description");
    unmount();
  });
});
