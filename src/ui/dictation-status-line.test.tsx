import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DictationStatusLine } from "./dictation-status-line.js";

describe("DictationStatusLine", () => {
  test("default starting copy is short — no permission lecture", () => {
    const html = renderToStaticMarkup(createElement(DictationStatusLine, { state: "starting" }));
    expect(html).toContain("Starting microphone…");
    expect(html).not.toContain("If asked");
    expect(html).not.toContain("allow it");
  });

  test("listening waveform uses a text-rated token, never a fill token", () => {
    const html = renderToStaticMarkup(
      createElement(DictationStatusLine, { state: "listening", levels: [0.4, 0.8] }),
    );
    expect(html).toContain("text-ok");
    expect(html).not.toContain("text-success");
    expect(html).not.toContain("text-secondary");
    expect(html).not.toContain("text-accent");
  });

  test("denied without an error message still announces the refusal", () => {
    const html = renderToStaticMarkup(createElement(DictationStatusLine, { state: "denied" }));
    expect(html).toContain('role="alert"');
    expect(html).toContain("Microphone access was blocked.");
  });
});
