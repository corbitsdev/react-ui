import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { Button } from "../../src/ui/button.js";

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

describe("Button link variant", () => {
  test("carries the underline treatment and no fill or border", () => {
    const mounted = render(<Button variant="link">Learn more</Button>);
    const className = mounted.container.querySelector("button")?.getAttribute("class") ?? "";
    expect(className).toContain("text-primary");
    expect(className).toContain("hover:underline");
    expect(className).not.toContain("bg-primary");
    expect(className).not.toContain("border-input");
    mounted.unmount();
  });
});
