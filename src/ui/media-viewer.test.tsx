import { act } from "react";
import type * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "bun:test";

import { useMediaViewer } from "../hooks/use-media-viewer.js";
import { MediaViewer, type MediaViewerItem } from "./media-viewer.js";

const ITEMS: readonly MediaViewerItem[] = [1, 2, 3].map((n) => ({
  name: `swatch-${n}.png`,
  mediaType: "image/png",
  src: `https://images.example.com/swatch-${n}.png`,
}));

function Harness({ style }: { readonly style?: React.CSSProperties }) {
  const viewer = useMediaViewer({ items: ITEMS, defaultIndex: 1 });
  return <MediaViewer viewer={viewer} style={style} />;
}

let root: Root | null = null;
let container: HTMLElement | null = null;

function render(node: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    root = createRoot(container!);
    root.render(node);
  });
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const dialog = () =>
  document.querySelector<HTMLDialogElement>("[data-slot='media-viewer']");

function press(key: string) {
  act(() => {
    dialog()?.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  });
}

describe("MediaViewer", () => {
  test("Download never navigates this tab", () => {
    render(<Harness />);
    const link = document.querySelector<HTMLAnchorElement>(
      "a[aria-label='Download swatch-2.png']",
    );
    expect(link?.getAttribute("download")).toBe("swatch-2.png");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noopener noreferrer");
  });

  test("the arrow keys follow the reading direction", () => {
    render(<Harness />);
    press("ArrowRight");
    expect(dialog()?.getAttribute("aria-label")).toBe("swatch-3.png");
    press("ArrowLeft");
    expect(dialog()?.getAttribute("aria-label")).toBe("swatch-2.png");
  });

  test("in right-to-left, ArrowLeft goes to Next at the inline end", () => {
    render(<Harness style={{ direction: "rtl" }} />);
    press("ArrowLeft");
    expect(dialog()?.getAttribute("aria-label")).toBe("swatch-3.png");
    press("ArrowRight");
    press("ArrowRight");
    expect(dialog()?.getAttribute("aria-label")).toBe("swatch-1.png");
  });

  test("holds the page still while open, then restores its overflow", () => {
    const page = document.documentElement;
    page.style.setProperty("overflow", "scroll", "important");
    render(<Harness />);
    expect(page.style.getPropertyValue("overflow")).toBe("hidden");
    act(() =>
      dialog()
        ?.querySelector<HTMLButtonElement>("[aria-label='Close']")
        ?.click(),
    );
    expect(dialog()).toBe(null);
    expect(page.style.getPropertyValue("overflow")).toBe("scroll");
    expect(page.style.getPropertyPriority("overflow")).toBe("important");

    page.style.removeProperty("overflow");
    act(() => root?.render(<Harness key="again" />));
    expect(page.style.getPropertyValue("overflow")).toBe("hidden");
    act(() => root?.unmount());
    root = null;
    expect(page.getAttribute("style") ?? "").not.toContain("overflow");
  });
});
