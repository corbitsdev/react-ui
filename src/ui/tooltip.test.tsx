import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { InfoTooltip, Tooltip, type TooltipProps } from "./tooltip.js";

function requireButton(
  root: ParentNode,
  selector = "button",
): HTMLButtonElement {
  const element = root.querySelector(selector);
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Expected HTMLButtonElement for selector "${selector}"`);
  }
  return element;
}

function requireDescribedByContent(button: HTMLButtonElement): HTMLElement {
  const id = button.getAttribute("aria-describedby");
  expect(id).not.toBeNull();
  if (id === null) {
    throw new Error("Expected aria-describedby attribute");
  }
  const content = document.getElementById(id);
  expect(content).not.toBeNull();
  if (content === null) {
    throw new Error(`Expected element with id "${id}"`);
  }
  return content;
}

function mountInfo(label: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(InfoTooltip, { label }));
  });
  return {
    trigger: () => requireButton(container),
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function mountTooltip(props: TooltipProps) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(Tooltip, props));
  });
  return {
    container,
    rerender: (next: TooltipProps) => {
      act(() => {
        root.render(createElement(Tooltip, next));
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("InfoTooltip", () => {
  test("the trigger is a focusable button", () => {
    const { trigger, unmount } = mountInfo(
      "Positioned by event order, not real timing.",
    );
    const button = trigger();
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    unmount();
  });

  test("focusing the trigger associates and reveals the tooltip content", async () => {
    const { trigger, unmount } = mountInfo(
      "Positioned by event order, not real timing.",
    );
    const button = trigger();

    act(() => {
      button.focus();
    });
    // Radix opens on the next tick after a focus/pointer event.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const content = requireDescribedByContent(button);
    expect(content.textContent).toContain(
      "Positioned by event order, not real timing.",
    );
    unmount();
  });

  test("Escape dismisses the tooltip", async () => {
    const { trigger, unmount } = mountInfo(
      "Positioned by event order, not real timing.",
    );
    const button = trigger();

    act(() => {
      button.focus();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const contentWhileOpen = requireDescribedByContent(button);
    const contentIdWhileOpen = contentWhileOpen.id;

    act(() => {
      button.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(button.getAttribute("aria-describedby")).toBeNull();
    expect(document.getElementById(contentIdWhileOpen)).toBeNull();
    unmount();
  });
});

describe("Tooltip", () => {
  test("wraps a focusable element as the trigger and preserves element attributes", () => {
    const { container, unmount } = mountTooltip({
      label: "Custom note",
      children: (
        <button type="button" id="my-action" className="custom-trigger">
          Trigger
        </button>
      ),
    });
    const button = requireButton(container, "#my-action");
    expect(button.tagName).toBe("BUTTON");
    expect(button.classList.contains("custom-trigger")).toBe(true);
    unmount();
  });

  test("focusing the trigger reveals the tooltip and associates via aria-describedby", async () => {
    const { container, unmount } = mountTooltip({
      label: "Helpful contextual detail",
      children: <button type="button">Inspect</button>,
    });
    const button = requireButton(container);

    act(() => {
      button.focus();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const content = requireDescribedByContent(button);
    expect(content.textContent).toContain("Helpful contextual detail");
    unmount();
  });

  test("renders rich ReactNode content in the tooltip bubble", async () => {
    const { container, unmount } = mountTooltip({
      label: (
        <span data-testid="rich-label">
          Formatted <strong>bold</strong> note
        </span>
      ),
      children: <button type="button">Details</button>,
    });
    const button = requireButton(container);

    act(() => {
      button.focus();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const content = requireDescribedByContent(button);
    expect(content.querySelector("[data-testid='rich-label']")).not.toBeNull();
    expect(content.querySelector("strong")?.textContent).toBe("bold");
    unmount();
  });

  test("Escape dismisses the open tooltip", async () => {
    const { container, unmount } = mountTooltip({
      label: "Dismiss me with escape",
      children: <button type="button">Target</button>,
    });
    const button = requireButton(container);

    act(() => {
      button.focus();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const contentWhileOpen = requireDescribedByContent(button);
    const describedBy = contentWhileOpen.id;

    act(() => {
      button.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(button.getAttribute("aria-describedby")).toBeNull();
    expect(document.getElementById(describedBy)).toBeNull();
    unmount();
  });

  test("accepts custom side and className on the tooltip content", async () => {
    const { container, unmount } = mountTooltip({
      label: "Side note",
      side: "right",
      className: "custom-tooltip-class",
      children: <button type="button">Side trigger</button>,
    });
    const button = requireButton(container);

    act(() => {
      button.focus();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const content = requireDescribedByContent(button);
    expect(content.getAttribute("data-side")).toBe("right");
    expect(content.classList.contains("custom-tooltip-class")).toBe(true);
    unmount();
  });

  test("supports controlled open state and onOpenChange", async () => {
    const events: boolean[] = [];
    const { container, rerender, unmount } = mountTooltip({
      label: "Controlled note",
      open: true,
      onOpenChange: (next) => {
        events.push(next);
      },
      children: <button type="button">Controlled trigger</button>,
    });
    const button = requireButton(container);
    const content = requireDescribedByContent(button);
    expect(content.textContent).toContain("Controlled note");

    act(() => {
      button.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(events).toEqual([false]);

    rerender({
      label: "Controlled note",
      open: false,
      onOpenChange: (next) => {
        events.push(next);
      },
      children: <button type="button">Controlled trigger</button>,
    });
    expect(button.getAttribute("aria-describedby")).toBeNull();
    unmount();
  });
});
