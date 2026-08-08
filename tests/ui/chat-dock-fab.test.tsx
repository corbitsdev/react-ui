import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { ChatDockFab } from "../../src/ui/chat-dock.js";

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

describe("ChatDockFab unread badge", () => {
  test("renders no badge when unreadCount is 0 or omitted", () => {
    const mounted = render(<ChatDockFab onOpen={() => {}} />);
    expect(mounted.container.querySelector('[data-slot="chat-dock-fab-badge"]')).toBeNull();
    expect(mounted.container.querySelector("button")?.getAttribute("aria-label")).toBe("Open chat");
    mounted.unmount();
  });

  test("renders the exact count when unreadCount is positive and small", () => {
    const mounted = render(<ChatDockFab onOpen={() => {}} unreadCount={5} />);
    const badge = mounted.container.querySelector('[data-slot="chat-dock-fab-badge"]');
    expect(badge?.textContent).toBe("5");
    expect(mounted.container.querySelector("button")?.getAttribute("aria-label")).toBe("Open chat, 5 unread");
    mounted.unmount();
  });

  test("caps the displayed count at 9+", () => {
    const mounted = render(<ChatDockFab onOpen={() => {}} unreadCount={42} />);
    const badge = mounted.container.querySelector('[data-slot="chat-dock-fab-badge"]');
    expect(badge?.textContent).toBe("9+");
    mounted.unmount();
  });

  test("hides the badge again once unreadCount drops back to 0", () => {
    const mounted = render(<ChatDockFab onOpen={() => {}} unreadCount={3} />);
    expect(mounted.container.querySelector('[data-slot="chat-dock-fab-badge"]')).not.toBeNull();
    mounted.unmount();

    const remounted = render(<ChatDockFab onOpen={() => {}} unreadCount={0} />);
    expect(remounted.container.querySelector('[data-slot="chat-dock-fab-badge"]')).toBeNull();
    remounted.unmount();
  });
});
