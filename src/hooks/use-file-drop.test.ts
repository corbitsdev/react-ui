import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import {
  readDroppedFiles,
  useFileDrop,
  usePreventStrayDrops,
  type DropSource,
  type DroppedEntry,
  type FileDropDetails,
} from "./use-file-drop.js";

// Browsers hand a dropped folder over as file-system entries, which no
// test environment can make; these stand-ins have the same shape.
function fileEntry(
  name: string,
  content = "x",
  type = "text/plain",
): DroppedEntry {
  return {
    name,
    isFile: true,
    isDirectory: false,
    file: (success) => success(new File([content], name, { type })),
  };
}

function brokenFileEntry(name: string): DroppedEntry {
  return {
    name,
    isFile: true,
    isDirectory: false,
    file: (_success, failure) =>
      failure?.(new DOMException("gone", "NotFoundError")),
  };
}

/** A folder whose reader hands its entries back `batch` at a time. */
function folderEntry(
  name: string,
  entries: readonly DroppedEntry[],
  batch = 100,
): DroppedEntry {
  return {
    name,
    isFile: false,
    isDirectory: true,
    createReader: () => {
      let offset = 0;
      return {
        readEntries: (success) => {
          const next = entries.slice(offset, offset + batch);
          offset += next.length;
          success([...next]);
        },
      };
    },
  };
}

function source(
  dropped: readonly (DroppedEntry | File)[],
  types: readonly string[] = ["Files"],
): DropSource {
  return {
    types,
    files: dropped.filter((item) => item instanceof File),
    items: dropped.map((item) => ({
      kind: "file",
      getAsFile: () => (item instanceof File ? item : null),
      webkitGetAsEntry: () => (item instanceof File ? null : item),
    })),
  };
}

const PROJECT = folderEntry(
  "project",
  [
    fileEntry("README.md"),
    fileEntry(".DS_Store"),
    folderEntry(".git", [fileEntry("HEAD")]),
    folderEntry("src", [fileEntry("index.ts"), fileEntry("util.ts")]),
    folderEntry("test", [fileEntry("index.ts")]),
    folderEntry("empty", []),
  ],
  2,
);

describe("readDroppedFiles", () => {
  test("walks a folder to its files, named by their path inside it", async () => {
    const loose = new File(["hi"], "note.txt");
    const dropped = await readDroppedFiles(source([PROJECT, loose]));
    expect(dropped.files.map((file) => file.name)).toEqual([
      "note.txt",
      "project/README.md",
      "project/src/index.ts",
      "project/src/util.ts",
      "project/test/index.ts",
    ]);
    expect(dropped.files[0]).toBe(loose);
    expect(dropped.files[1]?.type).toBe("text/plain");
    expect(dropped.folders).toEqual(["project"]);
    expect(dropped.truncated).toBe(false);
    expect(dropped.errors).toEqual([]);
  });

  test("stops past the entry budget and says so", async () => {
    const big = folderEntry(
      "big",
      Array.from({ length: 30 }, (_, index) => fileEntry(`${index}.txt`)),
    );
    const dropped = await readDroppedFiles(source([big]), {
      maxFolderEntries: 10,
    });
    expect(dropped.files).toHaveLength(10);
    expect(dropped.truncated).toBe(true);
  });

  test("stops listing once the budget is spent, later folders included", async () => {
    let calls = 0;
    /** A flat folder of `size` files, read 100 a batch, counting the reads. */
    const huge = (name: string, size: number): DroppedEntry => ({
      name,
      isFile: false,
      isDirectory: true,
      createReader: () => {
        let offset = 0;
        return {
          readEntries: (success) => {
            calls += 1;
            const count = Math.min(100, size - offset);
            const batch = Array.from({ length: count }, (_, index) =>
              fileEntry(`${offset + index}.txt`),
            );
            offset += count;
            success(batch);
          },
        };
      },
    });
    const dropped = await readDroppedFiles(
      source([huge("first", 20_000), huge("second", 20_000)]),
      { maxFolderEntries: 250 },
    );
    expect(dropped.files).toHaveLength(250);
    expect(dropped.truncated).toBe(true);
    expect(dropped.folders).toEqual(["first", "second"]);
    // Three batches cover 250 entries; the full listing would be 402.
    expect(calls).toBe(3);
  });

  test("skips a file that cannot be read and keeps the rest", async () => {
    const folder = folderEntry("docs", [
      fileEntry("a.md"),
      brokenFileEntry("b.md"),
      fileEntry("c.md"),
    ]);
    const dropped = await readDroppedFiles(source([folder]));
    expect(dropped.files.map((file) => file.name)).toEqual([
      "docs/a.md",
      "docs/c.md",
    ]);
    expect(dropped.errors).toHaveLength(1);
  });

  test("reads plain files when the drop has no items", async () => {
    const files = [new File(["a"], "a.txt"), new File(["b"], "b.txt")];
    const dropped = await readDroppedFiles({ types: ["Files"], files });
    expect(dropped.files).toEqual(files);
    expect(dropped.folders).toEqual([]);
  });
});

/** A drag event carrying `data`, as a browser would dispatch it. */
function dragEvent(
  type: string,
  data: DropSource,
  relatedTarget: EventTarget | null = null,
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const dataTransfer = { ...data, dropEffect: "none" };
  Object.defineProperty(event, "dataTransfer", { value: dataTransfer });
  Object.defineProperty(event, "relatedTarget", { value: relatedTarget });
  return event;
}

function dropEffectOf(event: Event): unknown {
  return Object.getOwnPropertyDescriptor(event, "dataTransfer")?.value
    ?.dropEffect;
}

type Received = { files: readonly File[]; details: FileDropDetails };

function mountTarget({ guard = true }: { guard?: boolean } = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const received: Received[] = [];
  let over = false;

  function Target() {
    const drop = useFileDrop<HTMLDivElement>({
      onFiles: (files, details) => received.push({ files, details }),
    });
    usePreventStrayDrops(guard);
    over = drop.over;
    return createElement(
      "div",
      { "data-testid": "zone", ...drop.dropProps },
      createElement("span", null, "Drop here"),
    );
  }

  act(() => root.render(createElement(Target)));
  const zone = container.querySelector("[data-testid=zone]");
  const child = container.querySelector("span");
  if (zone === null || child === null) throw new Error("no zone");
  return {
    zone,
    child,
    received,
    get over() {
      return over;
    },
    fire(target: EventTarget, event: Event) {
      act(() => {
        target.dispatchEvent(event);
      });
      return event;
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function settle(): Promise<void> {
  return act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe("useFileDrop", () => {
  test("a dropped folder reaches onFiles walked to its files", async () => {
    const target = mountTarget();
    const drop = target.fire(target.zone, dragEvent("drop", source([PROJECT])));
    expect(drop.defaultPrevented).toBe(true);
    await settle();
    expect(target.received).toHaveLength(1);
    expect(target.received[0]?.files.map((file) => file.name)).toEqual([
      "project/README.md",
      "project/src/index.ts",
      "project/src/util.ts",
      "project/test/index.ts",
    ]);
    expect(target.received[0]?.details.folders).toEqual(["project"]);
    target.unmount();
  });

  test("an empty folder still reports the folder", async () => {
    const target = mountTarget();
    target.fire(
      target.zone,
      dragEvent("drop", source([folderEntry("empty", [])])),
    );
    await settle();
    expect(target.received).toEqual([
      {
        files: [],
        details: { folders: ["empty"], truncated: false, errors: [] },
      },
    ]);
    target.unmount();
  });

  test("tracks files held over the target, children included", () => {
    const target = mountTarget();
    const files = source([new File(["a"], "a.txt")]);
    const enter = target.fire(target.zone, dragEvent("dragenter", files));
    expect(enter.defaultPrevented).toBe(true);
    const over = target.fire(target.zone, dragEvent("dragover", files));
    expect(over.defaultPrevented).toBe(true);
    expect(dropEffectOf(over)).toBe("copy");
    expect(target.over).toBe(true);

    target.fire(target.zone, dragEvent("dragleave", files, document.body));
    expect(target.over).toBe(false);
    target.unmount();
  });

  // WebKit leaves relatedTarget null on every drag event. Moving between
  // children enters the next before leaving the last, as browsers do.
  test("stays over across children when relatedTarget is null", () => {
    const target = mountTarget();
    const files = source([new File(["a"], "a.txt")]);
    const enter = (element: Element) =>
      target.fire(element, dragEvent("dragenter", files));
    const leave = (element: Element) =>
      target.fire(element, dragEvent("dragleave", files));

    enter(target.zone);
    expect(target.over).toBe(true);
    for (let crossing = 0; crossing < 3; crossing += 1) {
      enter(target.child);
      leave(target.zone);
      expect(target.over).toBe(true);
      enter(target.zone);
      leave(target.child);
      expect(target.over).toBe(true);
    }

    leave(target.zone);
    expect(target.over).toBe(false);
    target.unmount();
  });

  test("a drag that ends, or enters elsewhere, clears a count thrown off", () => {
    const target = mountTarget();
    const files = source([new File(["a"], "a.txt")]);
    // Into a child with the target's own leave missed, as when an element
    // is removed from under the pointer: leaving the child for somewhere
    // outside no longer brings the count to 0.
    const offCount = () => {
      target.fire(target.zone, dragEvent("dragenter", files));
      target.fire(target.child, dragEvent("dragenter", files));
      target.fire(target.child, dragEvent("dragleave", files));
      expect(target.over).toBe(true);
    };

    offCount();
    target.fire(window, new Event("dragend"));
    expect(target.over).toBe(false);

    offCount();
    target.fire(document.body, dragEvent("dragenter", files));
    expect(target.over).toBe(false);

    // Back over the target, the count starts afresh.
    target.fire(target.zone, dragEvent("dragenter", files));
    target.fire(target.zone, dragEvent("dragleave", files));
    expect(target.over).toBe(false);
    target.unmount();
  });

  test("a drag without files is left alone", async () => {
    const target = mountTarget();
    const text = source([], ["text/plain"]);
    const over = target.fire(target.zone, dragEvent("dragover", text));
    const drop = target.fire(target.zone, dragEvent("drop", text));
    expect(over.defaultPrevented).toBe(false);
    expect(drop.defaultPrevented).toBe(false);
    expect(target.over).toBe(false);
    await settle();
    expect(target.received).toEqual([]);
    target.unmount();
  });
});

describe("usePreventStrayDrops", () => {
  test("a drop outside the target does not navigate", () => {
    const target = mountTarget();
    const files = source([new File(["a"], "a.txt")]);
    const over = target.fire(document.body, dragEvent("dragover", files));
    const drop = target.fire(document.body, dragEvent("drop", files));
    expect(over.defaultPrevented).toBe(true);
    expect(dropEffectOf(over)).toBe("none");
    expect(drop.defaultPrevented).toBe(true);

    // The target's own handling is not overridden on its way up.
    const inside = target.fire(target.zone, dragEvent("dragover", files));
    expect(dropEffectOf(inside)).toBe("copy");
    target.unmount();
  });

  test("leaves native file inputs and other drags alone", () => {
    const target = mountTarget();
    const input = document.createElement("input");
    input.type = "file";
    document.body.appendChild(input);
    const files = source([new File(["a"], "a.txt")]);
    expect(target.fire(input, dragEvent("drop", files)).defaultPrevented).toBe(
      false,
    );
    const text = source([], ["text/plain"]);
    expect(
      target.fire(document.body, dragEvent("drop", text)).defaultPrevented,
    ).toBe(false);
    input.remove();
    target.unmount();
  });

  test("stops guarding once the last user unmounts", () => {
    const first = mountTarget();
    const second = mountTarget();
    const files = source([new File(["a"], "a.txt")]);
    first.unmount();
    expect(
      second.fire(document.body, dragEvent("drop", files)).defaultPrevented,
    ).toBe(true);
    second.unmount();
    const after = dragEvent("drop", files);
    document.body.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  test("does nothing when disabled", () => {
    const target = mountTarget({ guard: false });
    const files = source([new File(["a"], "a.txt")]);
    expect(
      target.fire(document.body, dragEvent("drop", files)).defaultPrevented,
    ).toBe(false);
    target.unmount();
  });
});
