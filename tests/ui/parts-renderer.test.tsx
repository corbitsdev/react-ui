import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import type { Part } from "../../src/lib/chat-parts.js";
import { PartsRenderer } from "../../src/ui/parts-renderer.js";

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

describe("PartsRenderer", () => {
  test("renders nothing for an empty parts array", () => {
    const mounted = render(<PartsRenderer parts={[]} />);
    expect(mounted.container.querySelector("[data-slot='parts-renderer']")).toBeNull();
    mounted.unmount();
  });

  test("renders a text part as prose", () => {
    const parts: Part[] = [{ kind: "text", text: "Here's the summary." }];
    const mounted = render(<PartsRenderer parts={parts} />);
    expect(mounted.container.textContent).toContain("Here's the summary.");
    mounted.unmount();
  });

  test("renders a reasoning part collapsed, with its duration in the summary", () => {
    const parts: Part[] = [{ kind: "reasoning", text: "Considering two approaches.", durationMs: 2300 }];
    const mounted = render(<PartsRenderer parts={parts} />);
    const details = mounted.container.querySelector("[data-slot='reasoning-part']");
    expect(details?.hasAttribute("open")).toBe(false);
    expect(mounted.container.textContent).toContain("Thought for 2.3s");
    expect(mounted.container.textContent).toContain("Considering two approaches.");
    mounted.unmount();
  });

  test("reasoning part omits the duration clause when duration is unknown", () => {
    const parts: Part[] = [{ kind: "reasoning", text: "Still working it out." }];
    const mounted = render(<PartsRenderer parts={parts} />);
    expect(mounted.container.textContent).toContain("Thought");
    expect(mounted.container.textContent).not.toContain("Thought for");
    mounted.unmount();
  });

  test("renders a tool-trace part through ToolBlock, mapping status and output", () => {
    const parts: Part[] = [
      {
        kind: "tool-trace",
        toolCallId: "call-1",
        name: "search",
        status: "output-available",
        output: "3 results",
      },
    ];
    const mounted = render(<PartsRenderer parts={parts} />);
    const toolBlock = mounted.container.querySelector("[data-slot='tool-block']");
    expect(toolBlock?.getAttribute("data-status")).toBe("output-available");
    mounted.unmount();
  });

  test("renders a file part as an attachment chip, linked when a url is present", () => {
    const parts: Part[] = [{ kind: "file", name: "report.pdf", mediaType: "application/pdf", url: "https://x/1" }];
    const mounted = render(<PartsRenderer parts={parts} />);
    const chip = mounted.container.querySelector("[data-slot='file-part']");
    expect(chip?.tagName).toBe("A");
    expect(chip?.getAttribute("href")).toBe("https://x/1");
    expect(mounted.container.textContent).toContain("report.pdf");
    mounted.unmount();
  });

  test("renders a file part with no url as an inert chip", () => {
    const parts: Part[] = [{ kind: "file", name: "notes.txt", mediaType: "text/plain" }];
    const mounted = render(<PartsRenderer parts={parts} />);
    const chip = mounted.container.querySelector("[data-slot='file-part']");
    expect(chip?.tagName).toBe("SPAN");
    mounted.unmount();
  });

  test("renders an event part as an inline system line", () => {
    const parts: Part[] = [{ kind: "event", event: "channel.agent-joined" }];
    const mounted = render(<PartsRenderer parts={parts} />);
    expect(mounted.container.querySelector("[data-slot='event-part']")?.textContent).toContain(
      "channel agent joined",
    );
    mounted.unmount();
  });

  test("renders an unknown block type as a labeled fallback card with its raw payload", () => {
    const parts: Part[] = [{ kind: "block", block: { type: "poll", data: { title: "Ship it?" } } }];
    const mounted = render(<PartsRenderer parts={parts} />);
    expect(mounted.container.querySelector("[data-slot='block-card-title']")?.textContent).toBe("poll");
    expect(mounted.container.textContent).toContain("Ship it?");
    mounted.unmount();
  });

  test("renders interleaved parts in the given order", () => {
    const parts: Part[] = [
      { kind: "reasoning", text: "thinking" },
      { kind: "tool-trace", toolCallId: "c1", name: "search", status: "running" },
      { kind: "text", text: "answer" },
    ];
    const mounted = render(<PartsRenderer parts={parts} />);
    const root = mounted.container.querySelector("[data-slot='parts-renderer']");
    const kinds = Array.from(root?.children ?? []).map((child) => child.getAttribute("data-slot"));
    expect(kinds).toEqual(["reasoning-part", "tool-block", null]);
    mounted.unmount();
  });
});
