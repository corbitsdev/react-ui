import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { AuthLayout } from "../../src/blocks/login/auth-layout.js";

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

describe("AuthLayout panel slot", () => {
  test("renders nothing decorative when panel is omitted", () => {
    const mounted = render(<AuthLayout>Form</AuthLayout>);
    const panel = mounted.container.querySelector('[aria-hidden="true"]');
    expect(panel?.textContent).toBe("");
    mounted.unmount();
  });

  test("renders whatever node is passed as the panel", () => {
    const mounted = render(
      <AuthLayout panel={<div data-testid="custom-panel">custom</div>}>Form</AuthLayout>,
    );
    expect(mounted.container.querySelector('[data-testid="custom-panel"]')).not.toBeNull();
    mounted.unmount();
  });
});
