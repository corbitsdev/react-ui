import { act } from "react";
import type * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "bun:test";

import {
  type MediaViewerState,
  useMediaViewer,
} from "../hooks/use-media-viewer.js";
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

function One({ item }: { readonly item: MediaViewerItem }) {
  const viewer = useMediaViewer({ items: [item], defaultIndex: 0 });
  return <MediaViewer viewer={viewer} />;
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

  test("on close, focus returns to the latest opener", () => {
    let viewer!: MediaViewerState<MediaViewerItem>;
    function Openers() {
      viewer = useMediaViewer({ items: ITEMS });
      return (
        <>
          <button type="button">First</button>
          <button type="button">Second</button>
          <MediaViewer viewer={viewer} />
        </>
      );
    }
    render(<Openers />);
    const [first, second] = container!.querySelectorAll("button");
    act(() => viewer.open(0, first));
    // A host shortcut opens another item while the viewer is up.
    act(() => viewer.open(1, second));
    act(() => viewer.close());
    expect(dialog()).toBe(null);
    expect(document.activeElement).toBe(second!);
  });

  test("on close without an opener, focus returns to what had it on open", () => {
    let viewer!: MediaViewerState<MediaViewerItem>;
    function Opener() {
      viewer = useMediaViewer({ items: ITEMS });
      return (
        <>
          <button type="button">Show</button>
          <MediaViewer viewer={viewer} />
        </>
      );
    }
    render(<Opener />);
    const show = container!.querySelector("button")!;
    show.focus();
    act(() => viewer.open(0));
    expect(document.activeElement).not.toBe(show);
    act(() => viewer.open(1));
    act(() => viewer.close());
    expect(document.activeElement).toBe(show);
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

  const KINDS: readonly {
    readonly item: MediaViewerItem;
    readonly slot: string;
    readonly download: boolean;
  }[] = [
    {
      item: {
        name: "clip.mp4",
        mediaType: "video/mp4",
        src: "https://media.example.com/clip.mp4",
      },
      slot: "media-viewer-video",
      download: true,
    },
    {
      item: {
        name: "memo.mp3",
        mediaType: "audio/mpeg",
        src: "https://media.example.com/memo.mp3",
      },
      slot: "media-viewer-audio",
      download: true,
    },
    {
      item: {
        name: "report.pdf",
        mediaType: "application/pdf",
        src: "https://media.example.com/report.pdf",
      },
      slot: "media-viewer-page",
      download: true,
    },
    {
      item: {
        name: "notes.txt",
        mediaType: "text/plain",
        src: "https://media.example.com/notes.txt",
        text: "First line",
      },
      slot: "media-viewer-text",
      download: true,
    },
    {
      // A data: document would run script in the frame.
      item: {
        name: "inline.pdf",
        mediaType: "application/pdf",
        src: "data:application/pdf;base64,JVBERi0=",
      },
      slot: "media-viewer-empty",
      download: false,
    },
    {
      item: {
        name: "script.pdf",
        mediaType: "application/pdf",
        src: "javascript:alert(1)",
      },
      slot: "media-viewer-empty",
      download: false,
    },
    {
      // An image that cannot be loaded, such as an unsafe generated one.
      item: { name: "missing.png", mediaType: "image/png" },
      slot: "media-viewer-empty",
      download: false,
    },
  ];

  for (const { item, slot, download } of KINDS) {
    test(`${item.name} shows as ${slot}`, () => {
      render(<One item={item} />);
      const content = dialog()?.querySelector<HTMLElement>(
        "[data-slot='media-viewer-figure'] > :first-child",
      );
      expect(content?.dataset["slot"]).toBe(slot);
      if (slot === "media-viewer-text") {
        expect(content?.textContent).toBe(item.text);
        expect(content?.getAttribute("aria-label")).toBe(item.name);
      } else if (slot === "media-viewer-empty") {
        expect(content?.textContent).toBe("No preview for this file.");
      } else {
        expect(content?.getAttribute("src")).toBe(item.src ?? null);
      }
      const link = dialog()?.querySelector("a[download]");
      expect(link === null || link === undefined ? false : true).toBe(download);
    });
  }
});
