import { describe, expect, test } from "bun:test";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";

import { CommandPalette, CommandPaletteInline, type CommandPaletteGroup } from "./command-palette.js";

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

  test("inputAccessory renders leading the input, inside the input row", () => {
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
          groups: GROUPS,
          onSelect: () => {},
          inputAccessory: createElement("span", { "data-testid": "scope-chip" }, "This bench"),
        }),
      );
    });
    const accessory = document.body.querySelector("[data-slot='command-palette-input-accessory']");
    expect(accessory).not.toBeNull();
    expect(accessory?.textContent).toBe("This bench");
    const input = document.body.querySelector("input");
    expect(input).not.toBeNull();
    const position = accessory!.compareDocumentPosition(input!);
    expect(Boolean(position & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    root.unmount();
  });

  test("footer renders below the results as a legend strip", () => {
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
          groups: GROUPS,
          onSelect: () => {},
          footer: "↑↓ to navigate",
        }),
      );
    });
    const footer = document.body.querySelector("[data-slot='command-palette-footer']");
    expect(footer).not.toBeNull();
    expect(footer?.textContent).toBe("↑↓ to navigate");
    root.unmount();
  });

  test("omits the accessory and footer slots when not provided", () => {
    const { unmount } = mount();
    expect(document.body.querySelector("[data-slot='command-palette-input-accessory']")).toBeNull();
    expect(document.body.querySelector("[data-slot='command-palette-footer']")).toBeNull();
    unmount();
  });
});

function mountInline(props: { readonly startOpen?: boolean } = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const selected: string[] = [];
  const openChanges: boolean[] = [];

  function Host() {
    const [open, setOpen] = useState(props.startOpen ?? true);
    return createElement(CommandPaletteInline, {
      open,
      onOpenChange: (next: boolean) => {
        openChanges.push(next);
        setOpen(next);
      },
      query: "",
      onQueryChange: () => {},
      groups: GROUPS,
      onSelect: (id: string) => selected.push(id),
      leading: createElement("button", { type: "button", "data-testid": "magnifier" }, "Search"),
    });
  }

  act(() => {
    root.render(createElement(Host));
  });

  return {
    selected,
    openChanges,
    field: () => container.querySelector("[data-slot='command-palette-inline-field']"),
    results: () => container.querySelector("[data-slot='command-palette-inline-results']"),
    magnifier: () => container.querySelector("[data-testid='magnifier']") as HTMLButtonElement,
    input: () => container.querySelector("input") as HTMLInputElement | null,
    unmount: () => {
      root.unmount();
      container.remove();
    },
  };
}

describe("CommandPaletteInline", () => {
  test("collapsed renders the leading slot alone — no input, no results panel", () => {
    const { magnifier, input, results, unmount } = mountInline({ startOpen: false });
    expect(magnifier()).not.toBeNull();
    expect(input()).toBeNull();
    expect(results()).toBeNull();
    unmount();
  });

  test("open renders the input inside the field and focuses it", () => {
    const { field, input, unmount } = mountInline();
    const element = input();
    expect(element).not.toBeNull();
    expect(field()?.contains(element)).toBe(true);
    expect(document.activeElement).toBe(element);
    unmount();
  });

  test("results are anchored under the field, not in a dialog", () => {
    const { results, unmount } = mountInline();
    const panel = results();
    expect(panel).not.toBeNull();
    expect(panel?.textContent).toContain("Q3 Launch Plan");
    expect(document.body.querySelector("[role='dialog']")).toBeNull();
    expect(document.body.querySelector("[aria-modal]")).toBeNull();
    unmount();
  });

  test("Escape in the input collapses back to the leading slot", () => {
    const { input, openChanges, results, unmount } = mountInline();
    press(input()!, "Escape");
    expect(openChanges).toEqual([false]);
    expect(results()).toBeNull();
    unmount();
  });

  test("a pointer press outside collapses it; one inside does not", () => {
    const { magnifier, openChanges, unmount } = mountInline();
    act(() => {
      magnifier().dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });
    expect(openChanges).toEqual([]);
    act(() => {
      document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });
    expect(openChanges).toEqual([false]);
    unmount();
  });

  test("clicking a result selects it and collapses", () => {
    const { results, selected, openChanges, unmount } = mountInline();
    const row = results()?.querySelector("[role='option']") as HTMLElement;
    act(() => {
      row.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(selected).toEqual(["page-1"]);
    expect(openChanges).toEqual([false]);
    unmount();
  });
});
