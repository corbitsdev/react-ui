import { describe, expect, test } from "bun:test";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";

import { CommandPalette, type CommandPaletteGroup } from "./command-palette.js";

const GROUPS: CommandPaletteGroup[] = [
  {
    id: "pages",
    heading: "Pages",
    items: [
      { id: "page-1", title: "Settings" },
      { id: "page-2", title: "Billing" },
    ],
  },
  {
    id: "entities",
    heading: "Results",
    items: [{ id: "entity-1", title: "Q3 Launch Plan", subtitle: "Artifact" }],
  },
];

function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const selected: string[] = [];
  let closed = false;

  function Host() {
    const [open, setOpen] = useState(true);
    return createElement(CommandPalette, {
      open,
      onOpenChange: (next: boolean) => {
        setOpen(next);
        if (!next) closed = true;
      },
      query: "",
      onQueryChange: () => {},
      groups: GROUPS,
      onSelect: (id: string) => selected.push(id),
    });
  }

  act(() => {
    root.render(createElement(Host));
  });

  return {
    container,
    selected,
    isClosed: () => closed,
    input: () => document.body.querySelector("input") as HTMLInputElement,
    unmount: () => root.unmount(),
  };
}

function press(target: HTMLElement, key: string) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

describe("CommandPalette", () => {
  test("renders every group heading and item title, never a raw id", () => {
    const { unmount } = mount();
    const text = document.body.textContent ?? "";
    expect(text).toContain("Pages");
    expect(text).toContain("Settings");
    expect(text).toContain("Q3 Launch Plan");
    expect(text).not.toContain("page-1");
    expect(text).not.toContain("entity-1");
    unmount();
  });

  test("ArrowDown then Enter selects the second visible item", () => {
    const { input, selected, unmount } = mount();
    press(input(), "ArrowDown");
    press(input(), "Enter");
    expect(selected).toEqual(["page-2"]);
    unmount();
  });

  test("Escape closes the palette", () => {
    const { input, isClosed, unmount } = mount();
    press(input(), "Escape");
    expect(isClosed()).toBe(true);
    unmount();
  });

  test("loading state renders without any group content", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(CommandPalette, {
          open: true,
          onOpenChange: () => {},
          query: "",
          onQueryChange: () => {},
          groups: [],
          onSelect: () => {},
          loading: true,
        }),
      );
    });
    expect(document.body.textContent ?? "").toMatch(/searching/i);
    root.unmount();
  });

  test("empty state renders when there are no groups and no query", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(CommandPalette, {
          open: true,
          onOpenChange: () => {},
          query: "",
          onQueryChange: () => {},
          groups: [],
          onSelect: () => {},
        }),
      );
    });
    expect(document.body.textContent ?? "").toMatch(/type to search/i);
    root.unmount();
  });

  test("load more renders and invokes onLoadMore", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let loadMoreCalls = 0;
    act(() => {
      root.render(
        createElement(CommandPalette, {
          open: true,
          onOpenChange: () => {},
          query: "",
          onQueryChange: () => {},
          groups: GROUPS,
          onSelect: () => {},
          hasMore: true,
          onLoadMore: () => {
            loadMoreCalls += 1;
          },
        }),
      );
    });
    const button = document.body.querySelector("[data-slot='command-palette-load-more']") as HTMLButtonElement;
    expect(button).not.toBeNull();
    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(loadMoreCalls).toBe(1);
    root.unmount();
  });
});
