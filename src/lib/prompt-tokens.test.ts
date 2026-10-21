import { describe, expect, test } from "bun:test";

import {
  findActivePromptToken,
  insertPromptToken,
  matchPromptTokens,
  splitPromptSegments,
  type PromptToken,
} from "./prompt-tokens.js";

const ADA: PromptToken = { id: "ada", kind: "mention", token: "@Ada" };
const ADAM: PromptToken = { id: "adam", kind: "mention", token: "@Adam" };
const BRIEF: PromptToken = { id: "brief", kind: "command", token: "/brief" };
const TOKENS = [ADA, ADAM, BRIEF];

describe("findActivePromptToken", () => {
  test("a caret inside @ad finds the mention and its full extent", () => {
    expect(findActivePromptToken("hi @ad there", 5)).toEqual({
      kind: "mention",
      query: "ad",
      start: 3,
      end: 6,
    });
  });

  test("a caret right after a bare @ finds an empty query", () => {
    expect(findActivePromptToken("ask @", 5)).toEqual({
      kind: "mention",
      query: "",
      start: 4,
      end: 5,
    });
  });

  test("an email address is not a mention", () => {
    expect(findActivePromptToken("mail ada@example", 16)).toBeNull();
  });

  test("a slash counts only at the start of a line", () => {
    expect(findActivePromptToken("/bri", 4)).toEqual({
      kind: "command",
      query: "bri",
      start: 0,
      end: 4,
    });
    expect(findActivePromptToken("first\n/bri", 10)?.kind).toBe("command");
    expect(findActivePromptToken("and /bri", 8)).toBeNull();
    expect(findActivePromptToken("and/or", 6)).toBeNull();
  });

  test("a caret outside any token finds nothing", () => {
    expect(findActivePromptToken("@Ada hello", 10)).toBeNull();
    expect(findActivePromptToken("", 0)).toBeNull();
  });

  test("letters beyond ASCII are part of the token", () => {
    expect(findActivePromptToken("@Zoë", 4)?.query).toBe("Zoë");
  });
});

describe("matchPromptTokens", () => {
  test("keeps tokens of the same kind that start with what is typed", () => {
    const active = findActivePromptToken("@ad", 3);
    if (active === null) throw new Error("expected an active token");
    expect(matchPromptTokens(TOKENS, active)).toEqual([ADA, ADAM]);
  });

  test("ignores case and other kinds", () => {
    const active = findActivePromptToken("/BR", 3);
    if (active === null) throw new Error("expected an active token");
    expect(matchPromptTokens(TOKENS, active)).toEqual([BRIEF]);
  });
});

describe("insertPromptToken", () => {
  test("replaces the token and adds a space with the caret after it", () => {
    const active = findActivePromptToken("ask @ad", 7);
    if (active === null) throw new Error("expected an active token");
    expect(insertPromptToken("ask @ad", active, ADA)).toEqual({
      value: "ask @Ada ",
      caret: 9,
    });
  });

  test("reuses a space that already follows", () => {
    const active = findActivePromptToken("ask @ad now", 6);
    if (active === null) throw new Error("expected an active token");
    expect(insertPromptToken("ask @ad now", active, ADA)).toEqual({
      value: "ask @Ada now",
      caret: 9,
    });
  });
});

describe("splitPromptSegments", () => {
  test("splits known tokens out of plain text", () => {
    expect(splitPromptSegments("/brief for @Ada, please", TOKENS)).toEqual([
      { text: "/brief", token: BRIEF },
      { text: " for " },
      { text: "@Ada", token: ADA },
      { text: ", please" },
    ]);
  });

  test("matches whole words only and prefers the longest token", () => {
    expect(splitPromptSegments("@Adam x@Ada @Adah", TOKENS)).toEqual([
      { text: "@Adam", token: ADAM },
      { text: " x@Ada @Adah" },
    ]);
  });

  test("a command highlights only at the start of a line", () => {
    expect(splitPromptSegments("run /brief\n/brief", TOKENS)).toEqual([
      { text: "run /brief\n" },
      { text: "/brief", token: BRIEF },
    ]);
  });

  test("text with no tokens is one plain run, and empty text none", () => {
    expect(splitPromptSegments("hello", TOKENS)).toEqual([{ text: "hello" }]);
    expect(splitPromptSegments("", TOKENS)).toEqual([]);
  });
});
