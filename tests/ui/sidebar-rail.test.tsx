import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { SidebarRail, type SidebarRailItem } from "../../src/ui/sidebar-rail.js";

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

describe("SidebarRail item rest props", () => {
  test("forwards data-* attributes onto the rendered button", () => {
    const items: readonly SidebarRailItem[] = [
      { id: "channels", label: "Channels", icon: null, "data-ctx-target": "rail-channels" },
      { id: "routines", label: "Routines", icon: null },
    ];
    const mounted = render(<SidebarRail items={items} activeId="channels" onSelect={() => {}} />);
    const target = mounted.container.querySelector("[data-ctx-target='rail-channels']");
    expect(target).not.toBeNull();
    expect(target?.tagName).toBe("BUTTON");
    mounted.unmount();
  });

  test("renders each item's id as the button's DOM id", () => {
    const items: readonly SidebarRailItem[] = [{ id: "channels", label: "Channels", icon: null }];
    const mounted = render(<SidebarRail items={items} activeId="channels" onSelect={() => {}} />);
    const button = mounted.container.querySelector("button");
    expect(button?.id).toBe("channels");
    mounted.unmount();
  });

  test("a consumer's data-* attribute cannot clobber the component's own onClick handling", () => {
    let selected = "";
    const items: readonly SidebarRailItem[] = [{ id: "channels", label: "Channels", icon: null, "data-ctx-target": "rail-channels" }];
    const mounted = render(<SidebarRail items={items} activeId="" onSelect={(id) => (selected = id)} />);
    const button = mounted.container.querySelector("button") as HTMLButtonElement;
    act(() => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(selected).toBe("channels");
    mounted.unmount();
  });
});
