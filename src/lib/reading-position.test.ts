import { describe, expect, test } from "bun:test";

import {
  currentTurn,
  readingPosition,
  samePosition,
} from "./reading-position.js";

const IDS = ["intro", "q1", "a1", "q2", "a2", "q3", "a3"];
const TURNS = new Set(["q1", "q2", "q3"]);

function tops(values: Record<string, number>) {
  return (id: string) => values[id];
}

describe("readingPosition", () => {
  test("maps items on screen to their turns, once each, in order", () => {
    const position = readingPosition({
      ids: IDS,
      turnIds: TURNS,
      visible: new Set(["a1", "q2", "a2"]),
      turnTop: tops({ q1: -200, q2: 40 }),
      line: 100,
    });
    expect(position.visibleIds).toEqual(["q1", "q2"]);
  });

  test("items before the first turn belong to no turn", () => {
    const position = readingPosition({
      ids: IDS,
      turnIds: TURNS,
      visible: new Set(["intro"]),
      turnTop: tops({}),
      line: 100,
    });
    expect(position).toEqual({ lineId: null, visibleIds: [] });
  });

  test("without turn ids every item is a turn", () => {
    const position = readingPosition({
      ids: IDS,
      turnIds: null,
      visible: new Set(["a1", "q2"]),
      turnTop: tops({ a1: -10, q2: 300 }),
      line: 100,
    });
    expect(position).toEqual({ lineId: "a1", visibleIds: ["a1", "q2"] });
  });

  test("the turn being read is the last whose start crossed the line", () => {
    const position = readingPosition({
      ids: IDS,
      turnIds: TURNS,
      visible: new Set(["a1", "q2", "a2", "q3"]),
      turnTop: tops({ q1: -400, q2: 100, q3: 101 }),
      line: 100,
    });
    expect(position.lineId).toBe("q2");
  });

  test("with no start above the line the first turn on screen is read", () => {
    const position = readingPosition({
      ids: IDS,
      turnIds: TURNS,
      visible: new Set(["q2", "a2"]),
      turnTop: tops({ q2: 150 }),
      line: 100,
    });
    expect(position.lineId).toBe("q2");
  });

  test("a turn whose start is not registered never crosses the line", () => {
    const position = readingPosition({
      ids: ["q1", "a1", "q2", "a2"],
      turnIds: TURNS,
      visible: new Set(["a1", "a2"]),
      turnTop: tops({ q1: -50 }),
      line: 100,
    });
    expect(position.lineId).toBe("q1");
  });
});

describe("currentTurn", () => {
  const position = { lineId: "q1", visibleIds: ["q1", "q2"], pinnedId: null };

  test("is the turn on the reading line away from the end", () => {
    expect(currentTurn(position, false)).toBe("q1");
  });

  test("is the last turn on screen at the end", () => {
    expect(currentTurn(position, true)).toBe("q2");
  });

  test("is the turn jumped to while it is pinned", () => {
    expect(currentTurn({ ...position, pinnedId: "q1" }, true)).toBe("q1");
  });

  test("is null with nothing on screen", () => {
    expect(
      currentTurn({ lineId: null, visibleIds: [], pinnedId: null }, true),
    ).toBeNull();
  });
});

describe("samePosition", () => {
  test("compares the line and the turns on screen by value", () => {
    const a = { lineId: "q1", visibleIds: ["q1", "q2"] };
    expect(samePosition(a, { lineId: "q1", visibleIds: ["q1", "q2"] })).toBe(
      true,
    );
    expect(samePosition(a, { lineId: "q2", visibleIds: ["q1", "q2"] })).toBe(
      false,
    );
    expect(samePosition(a, { lineId: "q1", visibleIds: ["q1"] })).toBe(false);
  });
});
