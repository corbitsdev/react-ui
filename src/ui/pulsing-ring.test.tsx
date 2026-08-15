import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PulsingRing } from "./pulsing-ring.js";

describe("PulsingRing", () => {
  test("renders as an aria-hidden overlay carrying the given color class", () => {
    const html = renderToStaticMarkup(createElement(PulsingRing, { colorClassName: "bg-destructive" }));
    expect(html).toContain("aria-hidden");
    expect(html).toContain("bg-destructive");
  });

  test("merges a caller className alongside the color class", () => {
    const html = renderToStaticMarkup(
      createElement(PulsingRing, { colorClassName: "bg-primary-emphasis", className: "size-3" }),
    );
    expect(html).toContain("bg-primary-emphasis");
    expect(html).toContain("size-3");
  });
});
