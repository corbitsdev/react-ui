import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, mock, test } from "bun:test";

import { StatGrid, StatGridItem } from "../../src/ui/stat-grid.js";

type Mounted = {
  container: HTMLElement;
  unmount: () => void;
};

function render(node: React.ReactElement): Mounted {
  const container = document.createElement("div");
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

const SHARED_LAYOUT = ["flex", "flex-col", "gap-1.5", "rounded-[12px]", "border", "border-border", "bg-card", "p-4"];

describe("StatGridItem interaction", () => {
  test("static tile is a non-interactive div with shared layout classes", () => {
    const mounted = render(<StatGridItem label="Runs" value="42" />);
    const tile = mounted.container.querySelector('[data-slot="stat-grid-item"]');
    expect(tile).not.toBeNull();
    expect(tile?.tagName).toBe("DIV");
    expect(mounted.container.querySelector("button")).toBeNull();
    const className = tile?.getAttribute("class") ?? "";
    for (const token of SHARED_LAYOUT) {
      expect(className).toContain(token);
    }
    expect(className).not.toContain("hover:border-primary-emphasis");
    expect(className).not.toContain("cursor-pointer");
    expect(tile?.textContent).toContain("Runs");
    expect(tile?.textContent).toContain("42");
    mounted.unmount();
  });

  test("interactive tile is a button with the same layout and click activation", () => {
    const onClick = mock(() => {});
    const mounted = render(<StatGridItem label="Runs" value="42" onClick={onClick} />);
    const tile = mounted.container.querySelector('[data-slot="stat-grid-item"]');
    expect(tile).not.toBeNull();
    expect(tile?.tagName).toBe("BUTTON");
    expect(tile?.getAttribute("type")).toBe("button");
    const className = tile?.getAttribute("class") ?? "";
    for (const token of SHARED_LAYOUT) {
      expect(className).toContain(token);
    }
    expect(className).toContain("w-full");
    expect(className).toContain("text-left");
    expect(className).toContain("hover:border-primary-emphasis");
    expect(className).toContain("cursor-pointer");
    // Accessible name comes from the label + value content.
    expect(tile?.textContent).toContain("Runs");
    expect(tile?.textContent).toContain("42");

    act(() => {
      tile?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(onClick).toHaveBeenCalledTimes(1);
    mounted.unmount();
  });

  test("emphasis padding is shared by static and interactive shells", () => {
    const staticMount = render(<StatGridItem label="A" value="1" emphasis />);
    const interactiveMount = render(<StatGridItem label="B" value="2" emphasis onClick={() => {}} />);
    const staticClass = staticMount.container.querySelector('[data-slot="stat-grid-item"]')?.getAttribute("class") ?? "";
    const interactiveClass =
      interactiveMount.container.querySelector('[data-slot="stat-grid-item"]')?.getAttribute("class") ?? "";
    expect(staticClass).toContain("p-5");
    expect(staticClass).toContain("shadow-sm");
    expect(interactiveClass).toContain("p-5");
    expect(interactiveClass).toContain("shadow-sm");
    staticMount.unmount();
    interactiveMount.unmount();
  });

  test("StatGrid still lays out mixed static and interactive children", () => {
    const mounted = render(
      <StatGrid columns={2}>
        <StatGridItem label="Static" value="1" />
        <StatGridItem label="Clickable" value="2" onClick={() => {}} />
      </StatGrid>,
    );
    const tiles = mounted.container.querySelectorAll('[data-slot="stat-grid-item"]');
    expect(tiles.length).toBe(2);
    expect(tiles[0]?.tagName).toBe("DIV");
    expect(tiles[1]?.tagName).toBe("BUTTON");
    mounted.unmount();
  });
});
