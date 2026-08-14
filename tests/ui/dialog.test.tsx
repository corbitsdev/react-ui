import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../src/ui/dialog.js";

type Mounted = {
  container: HTMLElement;
  unmount: () => void;
};

function render(node: React.ReactElement): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function openDialog(side?: "center" | "left" | "right") {
  return render(
    <Dialog open>
      <DialogContent side={side}>
        <DialogHeader>
          <DialogTitle>Title</DialogTitle>
          <DialogDescription>Description</DialogDescription>
        </DialogHeader>
        <DialogBody>Body</DialogBody>
        <DialogFooter>
          <button type="button">Cancel</button>
          <button type="button">Save</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>,
  );
}

describe("Dialog craft defaults", () => {
  test("center content owns guttered width, max-height, and clipped overflow", () => {
    const mounted = openDialog();
    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content).not.toBeNull();
    expect(content?.getAttribute("data-side")).toBe("center");
    const className = content?.getAttribute("class") ?? "";
    expect(className).toContain("w-[min(calc(100vw-2rem),32rem)]");
    expect(className).toContain("max-h-[min(90dvh,42rem)]");
    expect(className).toContain("overflow-hidden");
    expect(className).toContain("max-sm:w-[min(calc(100vw-1.25rem),32rem)]");
    expect(className).toContain("max-sm:max-h-[min(92dvh,42rem)]");
    // Side-sheet anchors must not leak onto the centre surface.
    expect(className).not.toContain("inset-y-0");
    expect(className).not.toContain("right-0");
    expect(className).not.toContain("left-0");
    mounted.unmount();
  });

  test("right sheet keeps full-height edge pinning without centre max-height", () => {
    const mounted = openDialog("right");
    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content?.getAttribute("data-side")).toBe("right");
    const className = content?.getAttribute("class") ?? "";
    expect(className).toContain("inset-y-0");
    expect(className).toContain("right-0");
    expect(className).toContain("max-w-lg");
    expect(className).not.toContain("max-h-[min(90dvh,42rem)]");
    expect(className).not.toContain("overflow-hidden");
    expect(className).not.toContain("-translate-x-1/2");
    mounted.unmount();
  });

  test("left sheet mirrors right pinning on the opposite edge", () => {
    const mounted = openDialog("left");
    const content = document.querySelector('[data-slot="dialog-content"]');
    expect(content?.getAttribute("data-side")).toBe("left");
    const className = content?.getAttribute("class") ?? "";
    expect(className).toContain("inset-y-0");
    expect(className).toContain("left-0");
    expect(className).toContain("border-r");
    expect(className).not.toContain("right-0");
    mounted.unmount();
  });

  test("header, body, footer, and title encode compact craft chrome", () => {
    const mounted = openDialog();
    const header = document.querySelector('[data-slot="dialog-header"]');
    const body = document.querySelector('[data-slot="dialog-body"]');
    const footer = document.querySelector('[data-slot="dialog-footer"]');
    const title = document.querySelector('[data-slot="dialog-content"] h2');
    const description = document.querySelector('[data-slot="dialog-content"] p');

    expect(header?.className).toContain("shrink-0");
    expect(header?.className).toContain("gap-1");
    expect(header?.className).toContain("pr-8");

    expect(body?.className).toContain("min-h-0");
    expect(body?.className).toContain("flex-auto");
    expect(body?.className).toContain("overflow-y-auto");
    expect(body?.className).toContain("overscroll-contain");
    expect(body?.className).toContain("[scrollbar-width:thin]");

    expect(footer?.className).toContain("mt-auto");
    expect(footer?.className).toContain("shrink-0");
    expect(footer?.className).toContain("border-foreground/10");
    expect(footer?.className).toContain("bg-foreground/[0.025]");
    expect(footer?.className).toContain("pt-[0.85rem]");
    expect(footer?.className).toContain("max-sm:flex-col");
    expect(footer?.className).toContain("max-sm:[&>*]:w-full");

    expect(title?.className).toContain("text-[0.95rem]");
    expect(title?.className).toContain("font-[650]");
    expect(title?.className).toContain("tracking-[-0.01em]");
    expect(description?.className).toContain("text-[0.8125rem]");
    expect(description?.className).toContain("leading-[1.4]");
    mounted.unmount();
  });

  test("close control is a stable hit target with hover and focus chrome", () => {
    const mounted = openDialog();
    const close = document.querySelector('[data-slot="dialog-content"] > button[aria-label="Close"]');
    expect(close).not.toBeNull();
    const className = close?.getAttribute("class") ?? "";
    expect(className).toContain("size-[1.8rem]");
    expect(className).toContain("top-[0.85rem]");
    expect(className).toContain("right-[0.85rem]");
    expect(className).toContain("hover:bg-foreground/5");
    expect(className).toContain("hover:text-foreground");
    expect(className).toContain("focus-visible:outline-none");
    expect(className).toContain("focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_22%,transparent)]");
    // Legacy opacity-only hover is gone — polish is color/background.
    expect(className).not.toContain("opacity-70");
    expect(className).not.toContain("hover:opacity-100");
    mounted.unmount();
  });
});
