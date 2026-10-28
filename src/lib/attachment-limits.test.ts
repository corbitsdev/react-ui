import { describe, expect, test } from "bun:test";

import { checkAttachments } from "./attachment-limits.js";

const file = (name: string, size = 10) => ({ name, size });

describe("checkAttachments", () => {
  test("accepts everything when no limit applies", () => {
    const incoming = [file("a"), file("b")];

    expect(checkAttachments([], incoming, {})).toEqual({
      accepted: incoming,
      rejected: [],
    });
  });

  test("rejects past the count limit, counting what is already attached", () => {
    const result = checkAttachments(
      [file("held")],
      [file("a"), file("b"), file("c")],
      { maxFiles: 3 },
    );

    expect(result.accepted).toEqual([file("a"), file("b")]);
    expect(result.rejected).toEqual([{ file: file("c"), reason: "too-many" }]);
  });

  test("rejects everything when the draft is already over the count limit", () => {
    const result = checkAttachments([file("x"), file("y")], [file("a")], {
      maxFiles: 1,
    });

    expect(result.accepted).toEqual([]);
    expect(result.rejected).toEqual([{ file: file("a"), reason: "too-many" }]);
  });

  test("rejects past the size limit", () => {
    const result = checkAttachments(
      [],
      [file("small", 100), file("exact", 200), file("big", 201)],
      { maxFileBytes: 200 },
    );

    expect(result.accepted).toEqual([file("small", 100), file("exact", 200)]);
    expect(result.rejected).toEqual([
      { file: file("big", 201), reason: "too-large" },
    ]);
  });

  test("rejects duplicates by name plus size, against held and incoming files", () => {
    const result = checkAttachments(
      [file("held", 5)],
      [file("held", 5), file("held", 6), file("new"), file("new")],
      {},
    );

    expect(result.accepted).toEqual([file("held", 6), file("new")]);
    expect(result.rejected).toEqual([
      { file: file("held", 5), reason: "duplicate" },
      { file: file("new"), reason: "duplicate" },
    ]);
  });

  test("a rejected file does not use up room or count as seen", () => {
    const result = checkAttachments(
      [],
      [file("big", 999), file("a"), file("big", 999)],
      { maxFiles: 1, maxFileBytes: 100 },
    );

    expect(result.accepted).toEqual([file("a")]);
    expect(result.rejected.map((rejection) => rejection.reason)).toEqual([
      "too-large",
      "too-large",
    ]);
  });

  test("keeps incoming order in both lists", () => {
    const incoming = [
      file("one"),
      file("huge", 500),
      file("two"),
      file("one"),
      file("three"),
      file("four"),
    ];
    const result = checkAttachments([], incoming, {
      maxFiles: 3,
      maxFileBytes: 100,
    });

    expect(result.accepted.map((accepted) => accepted.name)).toEqual([
      "one",
      "two",
      "three",
    ]);
    expect(
      result.rejected.map(({ file: rejected, reason }) => [
        rejected.name,
        reason,
      ]),
    ).toEqual([
      ["huge", "too-large"],
      ["one", "duplicate"],
      ["four", "too-many"],
    ]);
  });

  test("returns the caller's own file objects", () => {
    const blob = new File(["hi"], "note.txt", { type: "text/plain" });
    const result = checkAttachments([], [blob], {});

    expect(result.accepted[0]).toBe(blob);
  });
});
