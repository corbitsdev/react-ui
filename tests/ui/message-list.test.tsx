import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { MessageList } from "../../src/ui/message-list.js";

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

describe("MessageList", () => {
  test("renders its children inside the scroll container", () => {
    const mounted = render(
      <MessageList itemCount={1}>
        <p>Hello</p>
      </MessageList>,
    );
    const list = mounted.container.querySelector("[data-slot='message-list']");
    expect(list?.textContent).toContain("Hello");
    mounted.unmount();
  });
});
