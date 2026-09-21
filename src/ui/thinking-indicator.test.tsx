import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ThinkingIndicator } from "./thinking-indicator.js";
import { ThinkingMark } from "./thinking-mark.js";

describe("ThinkingIndicator", () => {
  test("renders an accessible status with a decorative Silk mark", () => {
    const html = renderToStaticMarkup(createElement(ThinkingIndicator));

    expect(html).toContain('role="status"');
    expect(html).toContain("Thinking...");
    expect(html).toContain("aria-hidden=\"true\"");
    expect(html).toContain("corbits-thinking-silk");
  });

  test("renders every motion variant", () => {
    for (const variant of ["silk", "strata", "echo"] as const) {
      const html = renderToStaticMarkup(createElement(ThinkingMark, { variant }));

      expect(html).toContain(`corbits-thinking-${variant}`);
    }
  });
});
