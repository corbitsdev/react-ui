import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { VoiceWaveform } from "./voice-waveform.js";

describe("VoiceWaveform", () => {
  test("is aria-hidden because DictationStatusLine speaks the state", () => {
    const html = renderToStaticMarkup(
      createElement(VoiceWaveform, { levels: [0.2, 0.8] }),
    );
    expect(html).toContain("aria-hidden");
  });
});
