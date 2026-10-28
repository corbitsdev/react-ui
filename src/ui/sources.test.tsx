import { act } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "bun:test";

import { Source, Sources } from "./sources.js";

let root: Root | null = null;
let container: HTMLElement | null = null;

function render(node: ReactElement): HTMLElement {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container!);
    root.render(node);
  });
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

describe("Sources", () => {
  test("keeps list semantics with the bullets removed", () => {
    const view = render(
      <Sources>
        <Source href="https://docs.example.com">Docs</Source>
      </Sources>,
    );
    const list = view.querySelector("[data-slot='sources']");
    expect(list?.tagName).toBe("OL");
    expect(list?.getAttribute("role")).toBe("list");
    expect(list?.getAttribute("aria-label")).toBe("Sources");
  });

  test("a safe address is a link that opens in a new tab", () => {
    const view = render(
      <Sources>
        <Source href="https://docs.example.com/guide" index={1}>
          Guide
        </Source>
      </Sources>,
    );
    const link = view.querySelector<HTMLAnchorElement>(
      "[data-slot='source-link']",
    );
    expect(link?.tagName).toBe("A");
    expect(link?.getAttribute("href")).toBe("https://docs.example.com/guide");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link?.textContent).toBe("1Guide (opens in a new tab)");
    expect(link?.querySelector("svg")).not.toBe(null);
  });

  test("an unsafe address shows as text, without the link icon", () => {
    const view = render(
      <Sources>
        <Source href="javascript:alert(1)">Unsafe</Source>
      </Sources>,
    );
    expect(view.querySelector("a")).toBe(null);
    const text = view.querySelector("[data-slot='source-text']");
    expect(text?.tagName).toBe("SPAN");
    expect(text?.textContent).toBe("Unsafe");
    expect(text?.querySelector("svg")).toBe(null);
  });
});
