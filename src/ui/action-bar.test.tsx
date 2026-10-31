import { describe, expect, mock, test } from "bun:test";
import { act, createRef, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { ActionBar, type ActionBarGroup } from "./action-bar.js";
import { Menu, MenuTrigger } from "./menu.js";

function render(element: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(element));
  return {
    container,
    rerender: (next: ReactElement) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const button = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`)!;

function press(target: HTMLElement, key: string) {
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

const groups: readonly ActionBarGroup[] = [
  [
    { id: "zoom-out", label: "Zoom out" },
    { id: "locked", label: "Locked", disabled: true },
    { id: "zoom-in", label: "Zoom in" },
  ],
  [
    { id: "status", label: "Saved", note: true },
    {
      id: "screens",
      label: "Screens",
      row: [
        { id: "home", label: "Home", text: "Home", active: true },
        { id: "settings", label: "Settings", text: "Settings" },
      ],
    },
  ],
];

describe("ActionBar", () => {
  test("is one tab stop whose arrow keys skip disabled controls and wrap", () => {
    const mounted = render(<ActionBar label="Controls" groups={groups} />);
    const tabbable = [
      ...mounted.container.querySelectorAll("button[tabindex='0']"),
    ];
    expect(tabbable).toEqual([button(mounted.container, "Zoom out")]);

    act(() => button(mounted.container, "Zoom out").focus());
    press(button(mounted.container, "Zoom out"), "ArrowRight");
    expect(document.activeElement).toBe(button(mounted.container, "Zoom in"));
    press(button(mounted.container, "Zoom in"), "ArrowRight");
    expect(document.activeElement).toBe(button(mounted.container, "Home"));
    press(button(mounted.container, "Home"), "End");
    expect(document.activeElement).toBe(button(mounted.container, "Settings"));
    press(button(mounted.container, "Settings"), "ArrowRight");
    expect(document.activeElement).toBe(button(mounted.container, "Zoom out"));
    press(button(mounted.container, "Zoom out"), "ArrowLeft");
    expect(document.activeElement).toBe(button(mounted.container, "Settings"));
    expect(button(mounted.container, "Settings").getAttribute("tabindex")).toBe(
      "0",
    );
    mounted.unmount();
  });

  test("leaves collapsing to the host when controlled", () => {
    const onCollapsedChange = mock((_collapsed: boolean) => {});
    const bar = (collapsed: boolean) => (
      <ActionBar
        label="Controls"
        groups={groups}
        placement="floating"
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
      />
    );
    const mounted = render(bar(false));

    act(() => button(mounted.container, "Hide controls").click());
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    expect(mounted.container.querySelector("[role='toolbar']")).not.toBeNull();

    mounted.rerender(bar(true));
    expect(mounted.container.querySelector("[role='toolbar']")).toBeNull();
    expect(document.activeElement).toBe(
      button(mounted.container, "Show controls"),
    );

    act(() => button(mounted.container, "Show controls").click());
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    mounted.rerender(bar(false));
    expect(document.activeElement).toBe(
      button(mounted.container, "Hide controls"),
    );
    mounted.unmount();
  });

  test("hands renderTrigger a button that forwards its ref to an asChild trigger", () => {
    const ref = createRef<HTMLButtonElement>();
    const mounted = render(
      <ActionBar
        label="Controls"
        groups={[
          [
            {
              id: "version",
              label: "Version",
              text: "v4",
              ref,
              renderTrigger: (trigger) => (
                <Menu>
                  <MenuTrigger asChild>{trigger}</MenuTrigger>
                </Menu>
              ),
            },
          ],
        ]}
      />,
    );
    const trigger = button(mounted.container, "Version");
    expect(ref.current).toBe(trigger);
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("tabindex")).toBe("0");
    mounted.unmount();
  });
});
