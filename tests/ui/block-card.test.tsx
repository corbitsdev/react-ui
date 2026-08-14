import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { BlockCard, RiskBadge } from "../../src/ui/block-card.js";

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

describe("BlockCard", () => {
  test("renders zero-radius bordered frame with title and body", () => {
    const mounted = render(<BlockCard title="Cancel order">Body content</BlockCard>);
    const card = mounted.container.querySelector("[data-slot='block-card']");
    expect(card?.getAttribute("class") ?? "").toContain("rounded-none");
    expect(mounted.container.querySelector("[data-slot='block-card-title']")?.textContent).toBe("Cancel order");
    expect(mounted.container.textContent).toContain("Body content");
    mounted.unmount();
  });

  test("header pulse dot is decorative and not announced twice", () => {
    const mounted = render(<BlockCard title="Cancel order">Body</BlockCard>);
    const header = mounted.container.querySelector("[data-slot='block-card-header']");
    const dot = header?.firstElementChild;
    expect(dot?.getAttribute("aria-hidden")).toBe("true");
    mounted.unmount();
  });
});

describe("RiskBadge", () => {
  test.each([
    ["low", "text-muted-foreground"],
    ["medium", "text-warn"],
    ["high", "text-destructive"],
  ] as const)("level %s carries its own tone class", (level, toneClass) => {
    const mounted = render(<RiskBadge level={level} label="Risk" />);
    const badge = mounted.container.querySelector("[data-slot='risk-badge']");
    expect(badge?.getAttribute("data-risk")).toBe(level);
    expect(badge?.getAttribute("class") ?? "").toContain(toneClass);
    mounted.unmount();
  });

  test("renders the label as real text, and an optional note alongside it", () => {
    const mounted = render(<RiskBadge level="high" label="High risk" note="No undo" />);
    expect(mounted.container.textContent).toContain("High risk");
    expect(mounted.container.textContent).toContain("No undo");
    mounted.unmount();
  });

  test("omits the note span when not provided", () => {
    const mounted = render(<RiskBadge level="low" label="Low risk" />);
    const badge = mounted.container.querySelector("[data-slot='risk-badge']");
    expect(badge?.children.length).toBe(2);
    mounted.unmount();
  });
});
