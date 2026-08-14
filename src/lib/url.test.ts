import { describe, expect, test } from "bun:test";

import { isSafeUrl, toSafeHref } from "./url.js";

describe("isSafeUrl", () => {
  test("accepts http and https URLs", () => {
    expect(isSafeUrl("https://example.com/report")).toBe(true);
    expect(isSafeUrl("http://example.com/report")).toBe(true);
  });

  test("rejects javascript: URLs", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
  });

  test("rejects javascript: URLs regardless of case", () => {
    expect(isSafeUrl("JavaScript:alert(1)")).toBe(false);
  });

  test("rejects javascript: URLs with an embedded tab", () => {
    expect(isSafeUrl("java\tscript:alert(1)")).toBe(false);
  });

  test("rejects javascript: URLs with an embedded newline", () => {
    expect(isSafeUrl("java\nscript:alert(1)")).toBe(false);
  });

  test("rejects javascript: URLs with leading whitespace", () => {
    expect(isSafeUrl("  javascript:alert(1)")).toBe(false);
  });

  test("rejects data: URLs", () => {
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  test("rejects vbscript: URLs", () => {
    expect(isSafeUrl("vbscript:msgbox(1)")).toBe(false);
  });

  test("rejects file: URLs", () => {
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
  });

  test("rejects protocol-relative URLs", () => {
    expect(isSafeUrl("//evil.example/payload")).toBe(false);
  });

  test("rejects relative paths", () => {
    expect(isSafeUrl("/relative/path")).toBe(false);
    expect(isSafeUrl("relative/path")).toBe(false);
  });

  test("rejects unparseable strings", () => {
    expect(isSafeUrl("not a url")).toBe(false);
    expect(isSafeUrl("")).toBe(false);
  });

  test("honors a narrower allowlist", () => {
    expect(isSafeUrl("http://example.com", ["https:"])).toBe(false);
    expect(isSafeUrl("https://example.com", ["https:"])).toBe(true);
  });
});

describe("toSafeHref", () => {
  test("returns the URL unchanged when safe", () => {
    expect(toSafeHref("https://example.com/x")).toBe("https://example.com/x");
  });

  test("returns undefined for an unsafe scheme", () => {
    expect(toSafeHref("javascript:alert(1)")).toBeUndefined();
  });

  test("returns undefined for undefined input", () => {
    expect(toSafeHref(undefined)).toBeUndefined();
  });

  test("never returns a placeholder like '#' for unsafe input", () => {
    const result = toSafeHref("javascript:alert(1)");
    expect(result).not.toBe("#");
    expect(result).toBeUndefined();
  });
});
