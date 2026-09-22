import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";

import { Tabs } from "./tabs.js";

type Id = "brief" | "design" | "packet";
type Props = ComponentProps<typeof Tabs<Id>>;

const BASE: Pick<Props, "tabs" | "active" | "onChange" | "label"> = {
  tabs: [
    { id: "brief", label: "Brief" },
    { id: "design", label: "Design" },
    { id: "packet", label: "Packet" },
  ],
  active: "brief",
  onChange: () => {},
  label: "Artifacts",
};

function mount(overrides: Partial<Props> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const props: Props = { ...BASE, ...overrides, children: () => null };
  act(() => {
    root.render(createElement(Tabs<Id>, props));
  });
  return {
    tablist: () => container.querySelector("[role=tablist]") as HTMLElement,
    tabs: () => Array.from(container.querySelectorAll("[role=tab]")),
    container,
    unmount: () => root.unmount(),
  };
}

describe("Tabs", () => {
  test("icon slot renders a glyph hidden from assistive tech", () => {
    const { tabs, unmount } = mount({
      tabs: [
        { id: "brief", label: "Brief", icon: createElement("svg", { "data-kind": "doc" }) },
        { id: "design", label: "Design" },
        { id: "packet", label: "Packet" },
      ],
    });
    const wrapper = tabs()[0]?.querySelector("[aria-hidden]");
    expect(wrapper?.querySelector("svg[data-kind=doc]")).not.toBeNull();
    expect(tabs()[1]?.querySelector("svg")).toBeNull();
    unmount();
  });

  test("marker slot renders after the label — a live dot is the caller's to style", () => {
    const { tabs, unmount } = mount({
      tabs: [
        { id: "brief", label: "Brief", marker: createElement("span", { className: "dot" }) },
        { id: "design", label: "Design" },
        { id: "packet", label: "Packet" },
      ],
    });
    expect(tabs()[0]?.querySelector(".dot")).not.toBeNull();
    unmount();
  });

  test("scrollable swaps wrapping for a horizontal scroller and keeps selection", () => {
    let received: Id | undefined;
    const { tablist, tabs, unmount } = mount({
      scrollable: true,
      onChange: (id) => {
        received = id;
      },
    });
    expect(tablist().className).toContain("overflow-x-auto");
    expect(tablist().className).toContain("flex-nowrap");
    expect(tablist().className).not.toContain("flex-wrap");
    act(() => {
      (tabs()[2] as HTMLElement | undefined)?.click();
    });
    expect(received).toBe("packet");
    unmount();
  });
});
