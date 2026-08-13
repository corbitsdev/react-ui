import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { FilterChip } from "../../src/ui/filter-chip.js";

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

describe("FilterChip unselected affordance", () => {
  test("unselected renders a real border, not a bare-text button", () => {
    const mounted = render(<FilterChip>Live</FilterChip>);
    const button = mounted.container.querySelector("button");
    const className = button?.getAttribute("class") ?? "";
    expect(className).toContain("border-border");
    expect(className).not.toContain("border-transparent");
    mounted.unmount();
  });

  test("selected keeps its own card treatment", () => {
    const mounted = render(<FilterChip selected>Live</FilterChip>);
    const button = mounted.container.querySelector("button");
    expect(button?.getAttribute("aria-pressed")).toBe("true");
    expect(button?.getAttribute("class") ?? "").toContain("bg-card");
    mounted.unmount();
  });
});
