import { describe, expect, test } from "bun:test";

import { safeMediaSrc } from "./media-src.js";

describe("safeMediaSrc", () => {
  test("network and blob URLs load in every sink", () => {
    for (const src of [
      "https://example.com/a.png",
      "http://example.com/a.pdf",
      "blob:https://example.com/0f6c1b52",
    ]) {
      expect(safeMediaSrc(src, "media")).toBe(src);
      expect(safeMediaSrc(src, "link")).toBe(src);
    }
  });

  test("a media element takes a data: URL of image, video or audio only", () => {
    const image = "data:image/svg+xml;base64,PHN2Zy8+";
    expect(safeMediaSrc(image, "media")).toBe(image);
    expect(safeMediaSrc("data:video/mp4;base64,AAAA", "media")).toBe(
      "data:video/mp4;base64,AAAA",
    );
    expect(safeMediaSrc("data:text/html,<script>1</script>", "media")).toBe(
      undefined,
    );
  });

  test("a link never takes a data: URL", () => {
    expect(safeMediaSrc("data:image/svg+xml;base64,PHN2Zy8+", "link")).toBe(
      undefined,
    );
    expect(safeMediaSrc("data:application/pdf;base64,AAAA", "link")).toBe(
      undefined,
    );
  });

  test("script and relative URLs are refused", () => {
    expect(safeMediaSrc("javascript:alert(1)", "media")).toBe(undefined);
    expect(safeMediaSrc("JavaScript:alert(1)", "link")).toBe(undefined);
    expect(safeMediaSrc("/files/a.png", "media")).toBe(undefined);
  });
});
