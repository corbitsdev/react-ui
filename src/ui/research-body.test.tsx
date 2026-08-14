import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { ResearchBody, type ResearchBrief } from "./research-body.js";

function mount(brief: ResearchBrief) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(createElement(ResearchBody, { brief }));
  });

  return {
    container,
    unmount: () => root.unmount(),
  };
}

describe("ResearchBody", () => {
  test("a javascript: citation URL renders as inert text, not a live link", () => {
    const brief: ResearchBrief = {
      topic: "Test topic",
      sourceCount: 1,
      itemCount: 1,
      citations: [{ url: "javascript:alert(1)", title: "Malicious citation", source: "Untrusted feed" }],
    };

    const { container, unmount } = mount(brief);

    expect(container.textContent).toContain("Malicious citation");
    const anchors = Array.from(container.querySelectorAll("a"));
    expect(anchors.some((a) => a.getAttribute("href")?.startsWith("javascript:"))).toBe(false);
    expect(anchors).toHaveLength(0);

    unmount();
  });

  test("an https: citation URL still renders as a live link", () => {
    const brief: ResearchBrief = {
      topic: "Test topic",
      sourceCount: 1,
      itemCount: 1,
      citations: [{ url: "https://example.com/report", title: "Safe citation", source: "Trusted feed" }],
    };

    const { container, unmount } = mount(brief);

    const anchor = container.querySelector("a");
    expect(anchor?.getAttribute("href")).toBe("https://example.com/report");

    unmount();
  });

  test("a javascript: quote source URL renders no link", () => {
    const brief: ResearchBrief = {
      topic: "Test topic",
      sourceCount: 1,
      itemCount: 1,
      quotes: [{ quote: "A quoted line.", source: "Untrusted feed", url: "javascript:alert(1)" }],
    };

    const { container, unmount } = mount(brief);

    expect(container.querySelectorAll("a")).toHaveLength(0);

    unmount();
  });

  test("a javascript: cluster item URL renders no link", () => {
    const brief: ResearchBrief = {
      topic: "Test topic",
      sourceCount: 1,
      itemCount: 1,
      clusters: [
        {
          id: "c1",
          title: "Cluster",
          items: [{ url: "javascript:alert(1)", title: "Item", source: "Untrusted feed" }],
        },
      ],
    };

    const { container, unmount } = mount(brief);

    expect(container.querySelectorAll("a")).toHaveLength(0);

    unmount();
  });
});
