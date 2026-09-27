import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ShimmerText } from "./shimmer-text.js";

describe("ShimmerText", () => {
  test("reduced-motion and forced-colors fall back to solid muted text without clip", () => {
    const html = renderToStaticMarkup(
      createElement(ShimmerText, { children: "Thinking" }),
    );
    expect(html).toContain("motion-reduce:text-muted-foreground");
    expect(html).toContain("motion-reduce:bg-none");
    expect(html).toContain("motion-reduce:bg-clip-border");
    expect(html).toContain("forced-colors:text-muted-foreground");
    expect(html).toContain("forced-colors:bg-none");
    expect(html).toContain("forced-colors:bg-clip-border");
    expect(html).toContain("text-transparent");
  });
});
