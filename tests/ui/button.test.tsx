import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { Button, buttonVariants } from "../../src/ui/button.js";

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
    expect(className).toContain("text-primary-emphasis");
    expect(className).toContain("hover:underline");
    expect(className).not.toContain("bg-primary");
    expect(className).not.toContain("border-input");
    mounted.unmount();
  });

  // Orange as fill (bg-primary/text-primary-foreground) clears AA; orange as
  // *text* on the page ground does not (#e98428 on white is 2.69:1) — only
  // --primary-emphasis is calibrated for that use. A bare `text-primary` token
  // on the link variant is exactly the class of bug the pair-based contrast
  // gate can't see, since it only checks declared token pairs, not which
  // token an unrelated variant happens to reach for.
  test("never emits raw text-primary, only text-primary-emphasis", () => {
    const className = buttonVariants({ variant: "link" });
    const tokens = className.split(/\s+/);
    expect(tokens).not.toContain("text-primary");
    expect(tokens).toContain("text-primary-emphasis");
  });

  // link reads as inline text, not a control — every other variant gets a
  // fixed h-*/px-* box from its size, link must opt out regardless of which
  // size prop is passed (including the implicit md default).
  test("carries no fixed height or horizontal padding classes, at every size", () => {
    for (const size of [undefined, "sm", "md", "lg", "icon"] as const) {
      const tokens = buttonVariants({ variant: "link", size }).split(/\s+/);
      expect(tokens.some((token) => /^h-(?!auto)/.test(token))).toBe(false);
      expect(tokens.some((token) => /^px-(?!0$)/.test(token))).toBe(false);
    }
  });
});
