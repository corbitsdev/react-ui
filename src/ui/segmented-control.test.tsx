import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";

import { SegmentedControl } from "./segmented-control.js";

type Id = "light" | "system" | "dark";
type Props = ComponentProps<typeof SegmentedControl<Id>>;

const OPTIONS: Props["options"] = [
  { id: "light", label: "Light" },
  { id: "system", label: "System" },
  { id: "dark", label: "Dark" },
];

function mount(props: Partial<Props> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const full: Props = { options: OPTIONS, value: "system", onValueChange: () => {}, label: "Theme", ...props };
  act(() => {
    root.render(createElement(SegmentedControl<Id>, full));
  });
  return {
    group: () => container.querySelector("[role=group]") as HTMLElement,
    buttons: () => Array.from(container.querySelectorAll("button")),
    container,
    unmount: () => root.unmount(),
  };
}

describe("SegmentedControl", () => {
  test("names the set and marks the current segment pressed", () => {
    const { group, buttons, unmount } = mount();
    expect(group().getAttribute("aria-label")).toBe("Theme");
    const pressed = buttons().map((b) => b.getAttribute("aria-pressed"));
    expect(pressed).toEqual(["false", "true", "false"]);
    unmount();
  });

  test("pressing a segment reports its id", () => {
    let received: Id | undefined;
    const { buttons, unmount } = mount({ onValueChange: (id) => { received = id; } });
    act(() => {
      buttons()[2]?.click();
    });
    expect(received).toBe("dark");
    unmount();
  });

  test("pressing the current segment still reports — the host decides idempotence", () => {
    let received: Id | undefined;
    const { buttons, unmount } = mount({ onValueChange: (id) => { received = id; } });
    act(() => {
      buttons()[1]?.click();
    });
    expect(received).toBe("system");
    unmount();
  });
});
