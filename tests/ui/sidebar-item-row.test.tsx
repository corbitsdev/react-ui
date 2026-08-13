import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { SidebarItemRow } from "../../src/ui/sidebar-item-row.js";

type Mounted = {
  container: HTMLElement;
  unmount: () => void;
};

function render(node: React.ReactElement): Mounted {
  const container = document.createElement("ul");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("SidebarItemRow theming tokens", () => {
  test("selected row's background reads the --sidebar-row-selected-bg token, not a hardcoded utility", () => {
    const mounted = render(<SidebarItemRow name="general" selected />);
    const row = mounted.container.querySelector("[data-slot='sidebar-item-row'] > div");
    const className = row?.getAttribute("class") ?? "";
    expect(className).toContain("bg-[var(--sidebar-row-selected-bg)]");
    expect(className).not.toContain("bg-primary/10");
    mounted.unmount();
  });

  test("row and its button read the --sidebar-row-radius token, not a hardcoded rounded-md", () => {
    const mounted = render(<SidebarItemRow name="general" />);
    const row = mounted.container.querySelector("[data-slot='sidebar-item-row'] > div");
    const button = mounted.container.querySelector("button");
    expect(row?.getAttribute("class") ?? "").toContain("rounded-[var(--sidebar-row-radius)]");
    expect(button?.getAttribute("class") ?? "").toContain("rounded-[var(--sidebar-row-radius)]");
    expect(row?.getAttribute("class") ?? "").not.toContain("rounded-md");
    mounted.unmount();
  });
});
