import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";

import { ToolPicker } from "./tool-picker.js";

const ITEMS: ComponentProps<typeof ToolPicker>["items"] = [
  { id: "slack-post", name: "Post message", package: "slack" },
  { id: "slack-react", name: "Add reaction", package: "slack" },
  {
    id: "linear-create",
    name: "Create issue",
    package: "linear",
    status: "pending",
  },
  {
    id: "linear-close",
    name: "Close issue",
    package: "linear",
    status: "disabled",
  },
  { id: "gmail-send", name: "Send email", package: "google-drive" },
];

function mount(props: Partial<ComponentProps<typeof ToolPicker>> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(ToolPicker, {
        items: ITEMS,
        value: [],
        onChange: () => {},
        ...props,
      }),
    );
  });
  return {
    options: () =>
      [...container.querySelectorAll('[role="option"]')] as HTMLDivElement[],
    optionByName: (name: string) =>
      [...container.querySelectorAll('[role="option"]')].find((el) =>
        el.textContent?.includes(name),
      ) as HTMLDivElement,
    container,
    unmount: () => act(() => root.unmount()),
  };
}

describe("ToolPicker", () => {
  test("groups items by package with humanized headings, not raw slugs", () => {
    const { container, unmount } = mount();
    const headings = [
      ...container.querySelectorAll('p[role="presentation"], p'),
    ].map((el) => el.textContent);
    expect(headings).toContain("Slack");
    expect(headings).toContain("Linear");
    expect(headings).toContain("Google Drive");
    expect(headings).not.toContain("slack");
    expect(headings).not.toContain("google-drive");
    unmount();
  });

  test("keeps a package string that is already a display name", () => {
    const { container, unmount } = mount({
      items: [{ id: "x", name: "Post message", package: "Slack" }],
    });
    const headings = [...container.querySelectorAll("p")].map(
      (el) => el.textContent,
    );
    expect(headings).toContain("Slack");
    unmount();
  });

  test("single select: clicking an item replaces the current value", () => {
    let value: readonly string[] = [];
    const { optionByName, unmount } = mount({
      value,
      onChange: (next) => {
        value = next;
      },
    });
    act(() => {
      optionByName("Post message").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    expect(value).toEqual(["slack-post"]);
    unmount();
  });

  test("single select: clicking the already-selected item deselects it", () => {
    let value: readonly string[] = ["slack-post"];
    const { optionByName, unmount } = mount({
      value,
      onChange: (next) => {
        value = next;
      },
    });
    act(() => {
      optionByName("Post message").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    expect(value).toEqual([]);
    unmount();
  });

  test("multi select: accumulates selections across packages", () => {
    let value: readonly string[] = ["slack-post"];
    const { optionByName, unmount } = mount({
      multiple: true,
      value,
      onChange: (next) => {
        value = next;
      },
    });
    act(() => {
      optionByName("Add reaction").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    expect(value).toEqual(["slack-post", "slack-react"]);
    unmount();
  });

  test("a disabled item cannot be selected", () => {
    let called = false;
    const { optionByName, unmount } = mount({
      onChange: () => {
        called = true;
      },
    });
    act(() => {
      optionByName("Close issue").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    expect(called).toBe(false);
    unmount();
  });

  test("search filters the visible options", () => {
    const { container, options, unmount } = mount();
    const input = container.querySelector("input") as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "linear");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(options().length).toBe(2);
    unmount();
  });

  test("loading state shows a loading message instead of the catalog", () => {
    const { container, unmount } = mount({ loading: true });
    expect(container.textContent).toContain("Loading…");
    expect(container.querySelectorAll('[role="option"]').length).toBe(0);
    unmount();
  });

  test("empty catalog shows a catalog-empty state, not a failed search", () => {
    const { container, unmount } = mount({ items: [] });
    expect(container.textContent).toContain("Nothing in the catalog yet.");
    expect(container.textContent).not.toContain("Try a different search.");
    unmount();
  });

  test("a search with no hits shows no-matches copy", () => {
    const { container, unmount } = mount();
    const input = container.querySelector("input") as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "zzzz-no-such-tool");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(container.textContent).toContain("No tools match");
    expect(container.textContent).toContain("try a different search.");
    expect(container.textContent).not.toContain("Nothing in the catalog yet.");
    unmount();
  });

  test("Escape clears the search query and does not swallow a second Escape", () => {
    const { container, options, unmount } = mount();
    const input = container.querySelector("input") as HTMLInputElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, "linear");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(options().length).toBe(2);

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Escape",
          bubbles: true,
          cancelable: true,
        }),
      );
    });
    expect(options().length).toBe(5);

    const second = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      input.dispatchEvent(second);
    });
    expect(second.defaultPrevented).toBe(false);
    unmount();
  });
});
