import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type * as React from "react";
import { createRoot } from "react-dom/client";

import { TopBarBreadcrumbs } from "./top-bar.js";
import type { BreadcrumbLinkProps } from "./top-bar.js";

const crumbs = [
  { label: "Workspace", href: "/workspace" },
  { label: "Project", href: "/workspace/project" },
  { label: "Settings" },
];

function mount(children: React.ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(children as never);
  });
  return {
    container,
    unmount: () => root.unmount(),
  };
}

describe("TopBarBreadcrumbs", () => {
  test("defaults to plain anchors for every crumb but the last", () => {
    const { container, unmount } = mount(createElement(TopBarBreadcrumbs, { crumbs }));

    const anchors = container.querySelectorAll("a");
    expect(anchors.length).toBe(2);
    expect(anchors[0]?.getAttribute("href")).toBe("/workspace");
    expect(anchors[0]?.textContent).toBe("Workspace");
    expect(anchors[1]?.getAttribute("href")).toBe("/workspace/project");

    const last = container.querySelector('[aria-current="page"]');
    expect(last?.tagName).toBe("SPAN");
    expect(last?.textContent).toBe("Settings");
    expect(container.querySelectorAll("a[aria-current]").length).toBe(0);

    unmount();
  });

  test("the last crumb is never a link, even when it carries an href", () => {
    const { container, unmount } = mount(
      createElement(TopBarBreadcrumbs, {
        crumbs: [{ label: "Workspace", href: "/workspace" }, { label: "Settings", href: "/workspace/settings" }],
      }),
    );

    const anchors = container.querySelectorAll("a");
    expect(anchors.length).toBe(1);
    const last = container.querySelector('[aria-current="page"]');
    expect(last?.tagName).toBe("SPAN");
    expect(last?.textContent).toBe("Settings");

    unmount();
  });

  test("renders non-last crumbs through an injected linkComponent instead of <a>", () => {
    function FakeLink({ href, children }: BreadcrumbLinkProps) {
      return createElement("button", { "data-fake-link": href }, children);
    }

    const { container, unmount } = mount(createElement(TopBarBreadcrumbs, { crumbs, linkComponent: FakeLink }));

    expect(container.querySelectorAll("a").length).toBe(0);
    const fakeLinks = container.querySelectorAll("[data-fake-link]");
    expect(fakeLinks.length).toBe(2);
    expect(fakeLinks[0]?.getAttribute("data-fake-link")).toBe("/workspace");
    expect(fakeLinks[1]?.getAttribute("data-fake-link")).toBe("/workspace/project");

    const last = container.querySelector('[aria-current="page"]');
    expect(last?.tagName).toBe("SPAN");
    expect(last?.textContent).toBe("Settings");

    unmount();
  });
});
