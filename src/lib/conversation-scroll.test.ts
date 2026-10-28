import { describe, expect, test } from "bun:test";

import {
  anchorCorrection,
  anchorShift,
  captureAnchor,
  clampScrollTop,
  classifyScroll,
  distanceFromEnd,
  extendGesture,
  glideDuration,
  glidePosition,
  rebaseGlide,
  releasedReserve,
  reservedSpace,
  settleTarget,
  type ConversationSpan,
} from "./conversation-scroll.js";

/** Items 100px tall stacked from `start`, in client coordinates. */
function stack(ids: readonly string[], start = 0, height = 100) {
  return new Map<string, ConversationSpan>(
    ids.map((id, index) => [
      id,
      { top: start + index * height, bottom: start + (index + 1) * height },
    ]),
  );
}

const VIEW = { top: 0, bottom: 300 };

describe("settleTarget", () => {
  test("puts the item's top at the container's top", () => {
    const target = settleTarget({
      scrollTop: 400,
      viewportTop: 50,
      itemTop: 230,
    });
    // The item sits 180px below the view's top; scrolling 180px further brings it there.
    expect(target).toBe(580);
    const itemTopAfter = 230 - (target - 400);
    expect(itemTopAfter).toBe(50);
  });

  test("leaves an inset clear above the item", () => {
    expect(
      settleTarget({ scrollTop: 0, viewportTop: 0, itemTop: 200, inset: 40 }),
    ).toBe(160);
  });
});

describe("reservedSpace", () => {
  test("is the viewport minus the item when nothing follows it", () => {
    expect(
      reservedSpace({ viewportHeight: 600, itemTop: 1000, contentEnd: 1080 }),
    ).toBe(520);
  });

  test("shrinks by as much as the reply grows", () => {
    const before = reservedSpace({
      viewportHeight: 600,
      itemTop: 1000,
      contentEnd: 1080,
    });
    const after = reservedSpace({
      viewportHeight: 600,
      itemTop: 1000,
      contentEnd: 1280,
    });
    expect(before - after).toBe(200);
  });

  test("is never negative", () => {
    expect(
      reservedSpace({ viewportHeight: 600, itemTop: 1000, contentEnd: 2000 }),
    ).toBe(0);
    expect(
      reservedSpace({ viewportHeight: 600, itemTop: 1000, contentEnd: 1700 }),
    ).toBe(0);
  });
});

describe("releasedReserve", () => {
  test("keeps the part of the view that hangs below the content", () => {
    // The view's bottom sits 240px past the content's end, inside the reserve.
    expect(releasedReserve({ scrollTop: 1000, distanceFromEnd: -240 })).toBe(
      240,
    );
  });

  test("is nothing once the content reaches the view's bottom", () => {
    expect(releasedReserve({ scrollTop: 1000, distanceFromEnd: 0 })).toBe(0);
    expect(releasedReserve({ scrollTop: 1000, distanceFromEnd: 500 })).toBe(0);
  });

  test("is nothing at the top, where no clamp can move the view", () => {
    // Content shorter than the view: nothing needs holding.
    expect(releasedReserve({ scrollTop: 0, distanceFromEnd: -300 })).toBe(0);
  });
});

describe("captureAnchor", () => {
  test("records the items in view, topmost first, with their offsets", () => {
    const boxes = stack(["a", "b", "c", "d", "e", "f"], -150);
    const anchor = captureAnchor(VIEW, [...boxes.keys()], (id) =>
      boxes.get(id),
    );
    expect(anchor.candidates).toEqual([
      { id: "b", offset: -50 },
      { id: "c", offset: 50 },
      { id: "d", offset: 150 },
      { id: "e", offset: 250 },
    ]);
  });

  test("finds the first visible item in a long history without measuring it all", () => {
    const ids = Array.from({ length: 1000 }, (_, index) => `m${index}`);
    const boxes = stack(ids, -50_000);
    const measured: string[] = [];
    const anchor = captureAnchor(VIEW, ids, (id) => {
      measured.push(id);
      return boxes.get(id);
    });
    expect(anchor.candidates[0]).toEqual({ id: "m500", offset: 0 });
    expect(measured.length).toBeLessThan(20);
  });

  test("captures nothing from an empty conversation", () => {
    expect(captureAnchor(VIEW, [], () => undefined).candidates).toEqual([]);
  });
});

describe("anchorCorrection", () => {
  const boxes = stack(["a", "b", "c", "d"], -50);
  const anchor = captureAnchor(VIEW, [...boxes.keys()], (id) => boxes.get(id));

  test("content inserted above restores the same offset", () => {
    // 240px of older items land above: every top moves down by 240.
    const correction = anchorCorrection(
      anchor,
      VIEW.top,
      (id) => (boxes.get(id)?.top ?? 0) + 240,
    );
    expect(correction).toBe(240);
    const restored = (boxes.get("a")?.top ?? 0) + 240 - correction;
    expect(restored - VIEW.top).toBe(-50);
  });

  test("nothing changed above means nothing moves", () => {
    expect(anchorCorrection(anchor, VIEW.top, (id) => boxes.get(id)?.top)).toBe(
      0,
    );
  });

  test("when the anchor item is gone, the next candidate restores its own offset", () => {
    // `a` is trimmed and the rest shift up by 100.
    const topOf = (id: string) =>
      id === "a" ? undefined : (boxes.get(id)?.top ?? 0) - 100;
    const correction = anchorCorrection(anchor, VIEW.top, topOf);
    expect(correction).toBe(-100);
    expect((topOf("b") ?? 0) - correction).toBe(boxes.get("b")?.top ?? NaN);
  });

  test("with no candidate left, nothing moves", () => {
    expect(anchorCorrection(anchor, VIEW.top, () => undefined)).toBe(0);
    expect(anchorCorrection({ candidates: [] }, VIEW.top, () => 0)).toBe(0);
  });
});

describe("distanceFromEnd", () => {
  test("measures to the end of the content, not of the reserved space", () => {
    expect(
      distanceFromEnd({
        scrollHeight: 2000,
        scrollTop: 1000,
        clientHeight: 600,
      }),
    ).toBe(400);
    expect(
      distanceFromEnd({
        scrollHeight: 2000,
        scrollTop: 1400,
        clientHeight: 600,
        reserved: 300,
      }),
    ).toBe(-300);
  });
});

describe("clampScrollTop", () => {
  test("keeps a target within what the container can reach", () => {
    expect(clampScrollTop(-20, 2000, 600)).toBe(0);
    expect(clampScrollTop(1800, 2000, 600)).toBe(1400);
    expect(clampScrollTop(700, 2000, 600)).toBe(700);
    expect(clampScrollTop(50, 400, 600)).toBe(0);
  });
});

describe("classifyScroll", () => {
  test("a scroll inside an open gesture is the reader's", () => {
    expect(
      classifyScroll({
        scrollTop: 10,
        written: null,
        now: 100,
        gestureUntil: 150,
      }),
    ).toBe("reader");
    expect(
      classifyScroll({
        scrollTop: 10,
        written: 400,
        now: 100,
        gestureUntil: 150,
      }),
    ).toBe("reader");
  });

  test("the container's own write is its own, even inside a gesture", () => {
    expect(
      classifyScroll({
        scrollTop: 10,
        written: 10,
        now: 100,
        gestureUntil: 150,
      }),
    ).toBe("self");
    expect(
      classifyScroll({
        scrollTop: 10,
        written: 10,
        now: 100,
        gestureUntil: Number.POSITIVE_INFINITY,
      }),
    ).toBe("self");
  });

  test("landing where the container last wrote is its own", () => {
    expect(
      classifyScroll({
        scrollTop: 400.4,
        written: 400,
        now: 200,
        gestureUntil: 150,
      }),
    ).toBe("self");
  });

  test("anything else is the layout's", () => {
    expect(
      classifyScroll({
        scrollTop: 380,
        written: 400,
        now: 200,
        gestureUntil: 150,
      }),
    ).toBe("layout");
    expect(
      classifyScroll({
        scrollTop: 380,
        written: null,
        now: 200,
        gestureUntil: 0,
      }),
    ).toBe("layout");
  });
});

describe("extendGesture", () => {
  test("outside a momentum phase, a scroll never extends the gesture", () => {
    expect(
      extendGesture({ now: 100, gestureUntil: 150, momentumUntil: 0 }),
    ).toBe(150);
  });

  test("in momentum, each scroll keeps it open another quiet period", () => {
    expect(
      extendGesture({ now: 100, gestureUntil: 150, momentumUntil: 2_000 }),
    ).toBe(250);
    // Never shortens a window that is already open longer.
    expect(
      extendGesture({ now: 100, gestureUntil: 400, momentumUntil: 2_000 }),
    ).toBe(400);
  });

  test("never past the momentum cap", () => {
    expect(
      extendGesture({ now: 1_950, gestureUntil: 2_000, momentumUntil: 2_000 }),
    ).toBe(2_000);
    expect(
      extendGesture({ now: 2_050, gestureUntil: 2_100, momentumUntil: 2_000 }),
    ).toBe(2_100);
  });
});

describe("glide", () => {
  test("takes longer for longer jumps, within bounds", () => {
    expect(glideDuration(0)).toBe(320);
    expect(glideDuration(1000)).toBe(400);
    expect(glideDuration(-1000)).toBe(400);
    expect(glideDuration(100_000)).toBe(720);
  });

  test("starts at the start and lands exactly on a moving target", () => {
    expect(glidePosition(100, 900, 0)).toBe(100);
    expect(glidePosition(100, 900, 1)).toBe(900);
    expect(glidePosition(100, 1200, 1)).toBe(1200);
    const half = glidePosition(0, 1000, 0.5);
    expect(half).toBeGreaterThan(500);
    expect(half).toBeLessThan(1000);
  });
});

describe("anchorShift", () => {
  const boxes = stack(["a", "b", "c", "d"], -50);
  const anchor = captureAnchor(VIEW, [...boxes.keys()], (id) => boxes.get(id));

  test("nothing moved means no shift", () => {
    expect(
      anchorShift(
        anchor,
        { viewportTop: VIEW.top, scrollTop: 500, capturedTop: 500 },
        (id) => boxes.get(id)?.top,
      ),
    ).toBe(0);
  });

  test("counts a clamp the browser applied as well as the correction", () => {
    // 300px trimmed above; the browser clamped scrollTop from 500 to 400, so
    // on screen the items only rose by 200.
    const shift = anchorShift(
      anchor,
      { viewportTop: VIEW.top, scrollTop: 400, capturedTop: 500 },
      (id) => (boxes.get(id)?.top ?? 0) - 200,
    );
    expect(shift).toBe(-300);
  });

  test("with no candidate left, nothing moves even if scrollTop did", () => {
    expect(
      anchorShift(
        anchor,
        { viewportTop: VIEW.top, scrollTop: 400, capturedTop: 500 },
        () => undefined,
      ),
    ).toBe(0);
  });
});

/**
 * Runs a glide frame by frame over 100px items, the way the engine does:
 * re-base on any shift since the last frame, ease towards the re-resolved
 * target, re-capture. `change` runs before frame `at` and edits the content.
 * The view's top is at client 0, so a client top is a scroll top minus
 * `scrollTop`.
 */
function simulateGlide({
  count,
  viewHeight,
  start,
  target,
  change,
}: {
  readonly count: number;
  readonly viewHeight: number;
  readonly start: number;
  readonly target: (content: Content) => number;
  readonly change?: {
    readonly at: number;
    readonly apply: (content: Content) => void;
  };
}) {
  const content: Content = {
    ids: Array.from({ length: count }, (_, index) => `m${index}`),
    offset: 0,
  };
  const topOf = (id: string) =>
    content.ids.includes(id)
      ? Number(id.slice(1)) * 100 + content.offset
      : undefined;
  const height = () => content.ids.length * 100;
  const view = { top: 0, bottom: viewHeight };
  let from = start;
  let scrollTop = start;
  const capture = () => ({
    anchor: captureAnchor(view, content.ids, (id) => {
      const top = topOf(id);
      return top === undefined
        ? undefined
        : { top: top - scrollTop, bottom: top + 100 - scrollTop };
    }),
    capturedTop: scrollTop,
  });
  let captured = capture();
  const positions: number[] = [];
  const offsets: number[] = [];
  for (let frame = 0; frame <= 10; frame += 1) {
    if (change !== undefined && frame === change.at) {
      change.apply(content);
      // The browser keeps scrollTop, clamped to what it can reach.
      scrollTop = clampScrollTop(scrollTop, height(), viewHeight);
    }
    const shift = anchorShift(
      captured.anchor,
      { viewportTop: 0, scrollTop, capturedTop: captured.capturedTop },
      (id) => {
        const top = topOf(id);
        return top === undefined ? undefined : top - scrollTop;
      },
    );
    if (Math.abs(shift) > 0.5) {
      const next = rebaseGlide({
        start: from,
        capturedTop: captured.capturedTop,
        shift,
      });
      from = next.start;
      scrollTop = next.scrollTop;
    }
    scrollTop = glidePosition(from, target(content), frame / 10);
    captured = capture();
    positions.push(scrollTop);
    offsets.push((topOf("m24") ?? Number.NaN) - scrollTop);
  }
  return { positions, offsets, height: height() };
}

type Content = { ids: string[]; offset: number };

describe("a glide over content that moves above it", () => {
  test("a page landing above mid-glide lands on the re-resolved target", () => {
    const toItem = (content: Content) => 200 + content.offset;
    const plain = simulateGlide({
      count: 30,
      viewHeight: 400,
      start: 2000,
      target: toItem,
    });
    const loaded = simulateGlide({
      count: 30,
      viewHeight: 400,
      start: 2000,
      target: toItem,
      change: {
        at: 5,
        apply: (content) => {
          content.offset += 640;
        },
      },
    });
    expect(Math.abs((loaded.positions.at(-1) ?? 0) - 840)).toBeLessThanOrEqual(
      1,
    );
    // The same path through the content, 640px further down: nothing jumps.
    loaded.positions.forEach((position, frame) => {
      const expected = (plain.positions[frame] ?? 0) + (frame >= 5 ? 640 : 0);
      expect(Math.abs(position - expected)).toBeLessThanOrEqual(1);
    });
  });

  test("trimming above while gliding to the end only moves the view by the trim", () => {
    const toEnd = (content: Content) =>
      clampScrollTop(
        content.ids.length * 100 - 400,
        content.ids.length * 100,
        400,
      );
    const plain = simulateGlide({
      count: 30,
      viewHeight: 400,
      start: 2000,
      target: toEnd,
    });
    const trimmed = simulateGlide({
      count: 30,
      viewHeight: 400,
      start: 2000,
      target: toEnd,
      change: {
        // At frame 5 the view is past the trimmed end, so the browser clamps.
        at: 5,
        apply: (content) => {
          content.ids.splice(0, 7);
          content.offset -= 700;
        },
      },
    });
    expect(trimmed.height).toBe(2300);
    expect(
      Math.abs((trimmed.positions.at(-1) ?? 0) - 1900),
    ).toBeLessThanOrEqual(1);
    // An item in view sits exactly where it would have without the trim, on
    // every frame: the reader sees no hop and no backwards step.
    trimmed.offsets.forEach((offset, frame) => {
      expect(
        Math.abs(offset - (plain.offsets[frame] ?? 0)),
      ).toBeLessThanOrEqual(1);
      if (frame > 0)
        expect(offset).toBeLessThanOrEqual(trimmed.offsets[frame - 1] ?? 0);
    });
  });
});
