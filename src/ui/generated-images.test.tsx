import { act } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import type { ConversationImage, PartImage } from "../lib/conversation.js";
import {
  conversationImageSrc,
  generatedImageViewerItems,
  GeneratedImages,
} from "./generated-images.js";

type Mounted = {
  container: HTMLElement;
  rerender: (node: ReactElement) => void;
  unmount: () => void;
};

function render(node: ReactElement): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    rerender: (next) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function image(index: number): ConversationImage {
  return {
    id: `image-${index}`,
    mediaType: "image/svg+xml",
    width: 1536,
    height: 1024,
    alt: `Cover option ${index}`,
    base64: "PHN2Zy8+",
  };
}

const GENERATING: PartImage = {
  kind: "image",
  id: "part-1",
  prompt: "Cover for the quarterly review deck",
  state: "generating",
  images: [],
  expected: { count: 2, width: 1536, height: 1024 },
};

const DONE: PartImage = {
  ...GENERATING,
  state: "done",
  images: [image(1), image(2)],
};

function slots(container: HTMLElement, slot: string): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(`[data-slot='${slot}']`)];
}

describe("GeneratedImages", () => {
  test("while generating, placeholders hold the expected size under a status", () => {
    const view = render(<GeneratedImages part={GENERATING} />);
    const placeholders = slots(view.container, "generated-image-placeholder");
    expect(placeholders).toHaveLength(2);
    for (const placeholder of placeholders) {
      expect(placeholder.style.aspectRatio).toBe("1536 / 1024");
      expect(placeholder.getAttribute("aria-hidden")).toBe("true");
      expect(placeholder.textContent).toBe("1536 × 1024");
    }
    expect(view.container.querySelector("[role='status']")?.textContent).toBe(
      "Generating 2 images",
    );
    expect(
      slots(view.container, "generated-images-elapsed")[0]?.textContent,
    ).toBe("0:00");
    view.unmount();
  });

  test("images already there load plainly, with no grain and no status", () => {
    const opened: [number, string][] = [];
    const view = render(
      <GeneratedImages
        part={DONE}
        onOpen={(index, opener) =>
          opened.push([index, opener.getAttribute("aria-label") ?? ""])
        }
      />,
    );
    expect(slots(view.container, "generated-image-grain")).toHaveLength(0);
    expect(slots(view.container, "generated-images-status")).toHaveLength(0);
    const open = view.container.querySelector<HTMLButtonElement>(
      "[aria-label='Open Cover option 2']",
    );
    act(() => open?.click());
    expect(opened).toEqual([[1, "Open Cover option 2"]]);
    view.unmount();
  });

  test("images made while watched keep the status line and finish their reveal", () => {
    const view = render(<GeneratedImages part={GENERATING} />);
    view.rerender(<GeneratedImages part={DONE} />);
    expect(view.container.querySelector("[role='status']")?.textContent).toBe(
      "Made 2 images",
    );
    // happy-dom loads a data: image at once and has no canvas to draw on, so
    // the reveal completes in the same commit; the browser spec watches it run.
    expect(slots(view.container, "generated-image-grain")).toHaveLength(0);
    for (const tile of slots(view.container, "generated-image")) {
      expect(tile.dataset["state"]).toBe("loaded");
    }
    // Under the grain the picture is shown at once rather than faded in.
    for (const picture of view.container.querySelectorAll("img")) {
      expect(picture.className).toContain("opacity-100");
      expect(picture.className).not.toContain("transition");
    }
    view.unmount();
  });

  test("the actions call back with the image's index", () => {
    const calls: string[] = [];
    const view = render(
      <GeneratedImages
        part={DONE}
        onDownload={(index) => calls.push(`download:${index}`)}
        onCopy={(index) => calls.push(`copy:${index}`)}
      />,
    );
    const button = (label: string) =>
      view.container.querySelector<HTMLButtonElement>(
        `[aria-label='${label}']`,
      );
    act(() => button("Download Cover option 1")?.click());
    act(() => button("Copy Cover option 2")?.click());
    expect(calls).toEqual(["download:0", "copy:1"]);
    expect(button("Open Cover option 1 full size")).toBe(null);
    view.unmount();
  });

  test("a failed part shows a message, and Try again only with onRetry", () => {
    const failed: PartImage = {
      kind: "image",
      id: "part-failed",
      prompt: GENERATING.prompt,
      state: "error",
      images: [],
    };
    let retries = 0;
    const view = render(
      <GeneratedImages part={failed} onRetry={() => (retries += 1)} />,
    );
    expect(view.container.querySelector("[role='status']")?.textContent).toBe(
      "Couldn't make this image.",
    );
    const retry = [...view.container.querySelectorAll("button")].find(
      (button) => button.textContent === "Try again",
    );
    act(() => retry?.click());
    expect(retries).toBe(1);

    view.rerender(<GeneratedImages part={failed} />);
    expect(view.container.querySelector("button")).toBe(null);
    view.unmount();
  });

  test("a part that fails while watched announces it in the same live region", () => {
    const view = render(<GeneratedImages part={GENERATING} />);
    const status = view.container.querySelector("[role='status']");
    expect(status?.textContent).toBe("Generating 2 images");
    view.rerender(<GeneratedImages part={{ ...GENERATING, state: "error" }} />);
    const statuses = view.container.querySelectorAll("[role='status']");
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toBe(status ?? undefined);
    expect(status?.textContent).toBe("Couldn't make these images.");
    expect(slots(view.container, "generated-image-placeholder")).toHaveLength(
      0,
    );
    view.unmount();
  });

  test("an image whose source is not safe shows as unloadable", () => {
    const unsafe: PartImage = {
      ...DONE,
      images: [
        {
          id: "x",
          mediaType: "image/png",
          width: 10,
          height: 10,
          url: "javascript:alert(1)",
        },
      ],
    };
    const view = render(<GeneratedImages part={unsafe} />);
    expect(view.container.querySelector("img")).toBe(null);
    expect(slots(view.container, "generated-image")[0]?.dataset["state"]).toBe(
      "error",
    );
    view.unmount();
  });

  test("an unloadable tile offers no actions and cannot open", () => {
    const calls: string[] = [];
    const unsafe: PartImage = {
      ...DONE,
      images: [
        {
          id: "x",
          mediaType: "application/pdf",
          width: 10,
          height: 10,
          url: "data:application/pdf;base64,JVBERi0=",
        },
      ],
    };
    const view = render(
      <GeneratedImages
        part={unsafe}
        onOpen={(index) => calls.push(`open:${index}`)}
        onDownload={(index) => calls.push(`download:${index}`)}
        onCopy={(index) => calls.push(`copy:${index}`)}
      />,
    );
    const tile = slots(view.container, "generated-image")[0];
    expect(tile?.dataset["state"]).toBe("error");
    expect(slots(view.container, "generated-image-actions")).toHaveLength(0);
    expect(tile?.querySelectorAll("button")).toHaveLength(0);
    act(() => tile?.click());
    expect(calls).toEqual([]);
    view.unmount();
  });

  test("a tile that failed tries again when its source changes", () => {
    const remote = (url: string): PartImage => ({
      ...DONE,
      images: [{ id: "r", mediaType: "image/png", width: 10, height: 10, url }],
    });
    const view = render(
      <GeneratedImages part={remote("https://images.example.com/1.png")} />,
    );
    act(() => {
      view.container.querySelector("img")?.dispatchEvent(new Event("error"));
    });
    const tile = () => slots(view.container, "generated-image")[0];
    expect(tile()?.dataset["state"]).toBe("error");
    view.rerender(
      <GeneratedImages part={remote("https://images.example.com/2.png")} />,
    );
    expect(tile()?.dataset["state"]).toBe("loading");
    expect(view.container.querySelector("img")?.getAttribute("src")).toBe(
      "https://images.example.com/2.png",
    );
    view.unmount();
  });

  test("a revealed watched tile goes back under the grain when its source changes", () => {
    const remote = (url: string): PartImage => ({
      ...DONE,
      images: [{ id: "r", mediaType: "image/png", width: 10, height: 10, url }],
    });
    const view = render(<GeneratedImages part={GENERATING} />);
    view.rerender(
      <GeneratedImages part={remote("https://images.example.com/1.png")} />,
    );
    const grain = () => slots(view.container, "generated-image-grain");
    const load = () =>
      act(() => {
        view.container.querySelector("img")?.dispatchEvent(new Event("load"));
      });
    expect(grain()).toHaveLength(1);
    load();
    expect(grain()).toHaveLength(0);
    // The browser keeps painting the old picture until the new one loads.
    view.rerender(
      <GeneratedImages part={remote("https://images.example.com/2.png")} />,
    );
    expect(slots(view.container, "generated-image")[0]?.dataset["state"]).toBe(
      "loading",
    );
    expect(grain()).toHaveLength(1);
    load();
    expect(grain()).toHaveLength(0);
    view.unmount();
  });

  test("an image without alt is named after the prompt", () => {
    const { alt: _alt, ...plain } = image(1);
    const view = render(
      <GeneratedImages
        part={{ ...DONE, images: [plain] }}
        onOpen={() => {}}
        onDownload={() => {}}
      />,
    );
    const labels = [...view.container.querySelectorAll("button")].map(
      (button) => button.getAttribute("aria-label"),
    );
    expect(labels).toEqual([
      "Open Cover for the quarterly review deck, image 1",
      "Download Cover for the quarterly review deck, image 1",
      "Open Cover for the quarterly review deck, image 1 full size",
    ]);
    view.unmount();
  });

  test("without onOpen, an image without alt keeps the prompt's name", () => {
    const { alt: _alt, ...plain } = image(1);
    const view = render(
      <GeneratedImages
        part={{
          ...DONE,
          // A base64 that is not an image cannot be shown.
          images: [plain, { ...plain, id: "x", mediaType: "text/html" }],
        }}
      />,
    );
    const pictures = [...view.container.querySelectorAll("img")];
    expect(pictures.map((picture) => picture.alt)).toEqual([
      "Cover for the quarterly review deck, image 1",
    ]);
    expect(slots(view.container, "generated-image")[1]?.textContent).toContain(
      "Couldn't load Cover for the quarterly review deck, image 2",
    );
    view.unmount();
  });
});

describe("conversationImageSrc", () => {
  test("builds a data: URL from bare base64 of an image type only", () => {
    expect(conversationImageSrc(image(1))).toBe(
      "data:image/svg+xml;base64,PHN2Zy8+",
    );
    expect(conversationImageSrc({ ...image(1), mediaType: "text/html" })).toBe(
      undefined,
    );
  });

  test("passes a safe URL through", () => {
    const url = "https://example.com/cover.png";
    expect(
      conversationImageSrc({
        id: "u",
        mediaType: "image/png",
        width: 1,
        height: 1,
        url,
      }),
    ).toBe(url);
  });
});

describe("generatedImageViewerItems", () => {
  test("names each image after the prompt, in tile order", () => {
    const items = generatedImageViewerItems(DONE);
    expect(items.map((item) => item.name)).toEqual([
      "cover-for-the-quarterly-1.svg",
      "cover-for-the-quarterly-2.svg",
    ]);
    expect(items[0]?.detail).toBe("1536 × 1024");
    expect(items[1]?.alt).toBe("Cover option 2");
  });

  test("an image with no safe source becomes an item with no source", () => {
    const items = generatedImageViewerItems({
      ...DONE,
      images: [
        {
          id: "x",
          mediaType: "image/png",
          width: 10,
          height: 10,
          url: "javascript:alert(1)",
        },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.src).toBe(undefined);
  });
});
