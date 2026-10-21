import { describe, expect, test } from "bun:test";

import { mediaKindOf } from "./media-kind.js";

describe("mediaKindOf", () => {
  test("reads each kind from its media type", () => {
    expect(mediaKindOf("a", "image/png")).toBe("image");
    expect(mediaKindOf("a", "video/mp4")).toBe("video");
    expect(mediaKindOf("a", "audio/mpeg")).toBe("audio");
    expect(mediaKindOf("a", "application/pdf")).toBe("pdf");
    expect(mediaKindOf("a", "text/csv")).toBe("text");
    expect(mediaKindOf("a", "application/json")).toBe("text");
  });

  test("the media type wins over the extension", () => {
    expect(mediaKindOf("photo.txt", "image/png")).toBe("image");
    expect(mediaKindOf("clip.pdf", "video/webm")).toBe("video");
  });

  test("ignores media type parameters and case", () => {
    expect(mediaKindOf("a", "Text/Plain; charset=utf-8")).toBe("text");
  });

  test("a blank or generic media type defers to the extension", () => {
    expect(mediaKindOf("notes.md", "")).toBe("text");
    expect(mediaKindOf("song.mp3", "application/octet-stream")).toBe("audio");
    expect(mediaKindOf("report.pdf", "")).toBe("pdf");
  });

  test("extensions match case-insensitively", () => {
    expect(mediaKindOf("PHOTO.JPG", "")).toBe("image");
    expect(mediaKindOf("Clip.MoV", "")).toBe("video");
  });

  test("unknown falls back to other", () => {
    expect(mediaKindOf("archive.zip", "application/zip")).toBe("other");
    expect(mediaKindOf("README", "")).toBe("other");
    expect(mediaKindOf(".png", "")).toBe("other");
    expect(mediaKindOf("constructor", "")).toBe("other");
    expect(mediaKindOf("a.constructor", "")).toBe("other");
  });
});
