import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { RichEmptyState } from "../../src/ui/rich-empty-state.js";

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

describe("RichEmptyState action size", () => {
  test("defaults its action button to size md", () => {
    const mounted = render(
      <RichEmptyState title="Empty" description="Nothing here" actions={[{ label: "Go", variant: "primary" }]} />,
    );
    const button = mounted.container.querySelector("[data-slot='button']");
    expect(button?.getAttribute("class") ?? "").toContain("h-9");
    mounted.unmount();
  });

  test("actionSize='sm' shrinks the action button to match denser chrome", () => {
    const mounted = render(
      <RichEmptyState
        title="Empty"
        description="Nothing here"
        actionSize="sm"
        actions={[{ label: "Go", variant: "primary" }]}
      />,
    );
    const button = mounted.container.querySelector("[data-slot='button']");
    expect(button?.getAttribute("class") ?? "").toContain("h-8");
    mounted.unmount();
  });
});
