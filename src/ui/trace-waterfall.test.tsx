import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { TraceWaterfall, type TraceSpan } from "./trace-waterfall.js";

function mount(spans: TraceSpan[]) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(TraceWaterfall, {
        title: "Run trace",
        spans,
      }),
    );
  });
  return { container, unmount: () => root.unmount() };
}

describe("TraceWaterfall", () => {
  test("a measured span (timingSource omitted) renders a duration bar, not a marker", () => {
    const { container, unmount } = mount([
      {
        id: "turn-1",
        label: "Turn",
        kind: "turn",
        start: 0,
        end: 0.5,
        durationLabel: "1.2s",
        phase: "ok",
      },
    ]);
    expect(container.querySelectorAll(".rotate-45").length).toBe(0);
    const bar = container.querySelector(".absolute.inset-y-0");
    expect(bar).not.toBeNull();
    unmount();
  });

  test("a measured span still renders a bar when timingSource is explicitly 'measured'", () => {
    const { container, unmount } = mount([
      {
        id: "turn-1",
        label: "Turn",
        kind: "turn",
        start: 0,
        end: 0.5,
        durationLabel: "1.2s",
        phase: "ok",
        timingSource: "measured",
      },
    ]);
    expect(container.querySelectorAll(".rotate-45").length).toBe(0);
    expect(container.querySelector(".absolute.inset-y-0")).not.toBeNull();
    unmount();
  });

  test("an ordinal span renders as a point marker, not a duration bar", () => {
    const { container, unmount } = mount([
      {
        id: "tool-1",
        label: "search_web",
        kind: "tool",
        start: 0.3,
        end: 0.3,
        durationLabel: null,
        phase: "ok",
        timingSource: "ordinal",
      },
    ]);
    expect(container.querySelector(".absolute.inset-y-0")).toBeNull();
    const marker = container.querySelector(".rotate-45");
    expect(marker).not.toBeNull();
    expect((marker as HTMLElement).style.left).toBe("30%");
    expect((marker as HTMLElement).textContent ?? "").toMatch(/approximate|not a measured duration/i);
    unmount();
  });

  test("a null durationLabel renders — in both the inline text and the accessible table", () => {
    const { container, unmount } = mount([
      {
        id: "tool-1",
        label: "search_web",
        kind: "tool",
        start: 0.3,
        end: 0.3,
        durationLabel: null,
        phase: "ok",
        timingSource: "ordinal",
      },
    ]);
    const text = container.textContent ?? "";
    expect(text).toContain("—");

    const tableCells = Array.from(container.querySelectorAll("table td")).map((cell) => cell.textContent);
    expect(tableCells).toContain("—");
    expect(tableCells.some((cell) => cell === "0ms" || cell === "")).toBe(false);
    unmount();
  });

  test("a non-null durationLabel is rendered verbatim, not replaced with —", () => {
    const { container, unmount } = mount([
      {
        id: "turn-1",
        label: "Turn",
        kind: "turn",
        start: 0,
        end: 0.5,
        durationLabel: "1.2s",
        phase: "ok",
      },
    ]);
    const tableCells = Array.from(container.querySelectorAll("table td")).map((cell) => cell.textContent);
    expect(tableCells).toContain("1.2s");
    unmount();
  });
});
