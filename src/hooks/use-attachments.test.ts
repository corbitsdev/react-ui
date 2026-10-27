import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Activity, StrictMode, act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";

import type { PartFile } from "../lib/chat-parts.js";
import type { AttachmentData } from "../ui/attachments.js";
import {
  useAttachments,
  type AttachmentItem,
  type UseAttachmentsResult,
} from "./use-attachments.js";

// What the parts render must take what the hook makes and what a message
// carries, with no mapping in between.
const fromHook: (item: AttachmentItem) => AttachmentData = (item) => item;
const fromMessage: (part: PartFile) => AttachmentData = (part) => part;
void fromHook;
void fromMessage;

let created: string[] = [];
let revoked: string[] = [];
const realCreate = URL.createObjectURL;
const realRevoke = URL.revokeObjectURL;

beforeEach(() => {
  created = [];
  revoked = [];
  URL.createObjectURL = () => {
    const url = `blob:test/${created.length + 1}`;
    created.push(url);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    revoked.push(url);
  };
});

afterEach(() => {
  URL.createObjectURL = realCreate;
  URL.revokeObjectURL = realRevoke;
});

function file(name: string, size = 4, type = "text/plain"): File {
  return new File(["x".repeat(size)], name, { type });
}

/** Lets the hook's deferred unmount revoke run. */
function microtasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

type Options = {
  readonly maxFiles?: number;
  readonly maxFileBytes?: number;
  readonly strict?: boolean;
  readonly initial?: readonly AttachmentItem[];
};

/** A host that owns the list, as a composer would. */
function mountHost({ strict = false, initial = [], ...limits }: Options = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let hook: UseAttachmentsResult | undefined;
  let list: readonly AttachmentItem[] = [];
  let setList: (next: readonly AttachmentItem[]) => void = () => {};
  let setHidden: (hidden: boolean) => void = () => {};

  function Host() {
    const [attachments, setAttachments] =
      useState<readonly AttachmentItem[]>(initial);
    list = attachments;
    setList = setAttachments;
    hook = useAttachments({ attachments, ...limits });
    return null;
  }

  /** Hiding runs the hook's effect cleanups; showing runs them again. */
  function Shell() {
    const [hidden, setShellHidden] = useState(false);
    setHidden = setShellHidden;
    return createElement(Activity, {
      mode: hidden ? "hidden" : "visible",
      children: createElement(Host),
    });
  }

  act(() => {
    root.render(
      strict
        ? createElement(StrictMode, null, createElement(Shell))
        : createElement(Shell),
    );
  });

  const api = () => {
    if (hook === undefined) throw new Error("the hook did not render");
    return hook;
  };

  return {
    get list() {
      return list;
    },
    /** Adds and appends what was accepted, in one update. */
    drop(files: readonly File[]) {
      let result: ReturnType<UseAttachmentsResult["add"]> | undefined;
      act(() => {
        result = api().add(files);
        const accepted = result.accepted;
        setList([...list, ...accepted]);
      });
      if (result === undefined) throw new Error("add returned nothing");
      return result;
    },
    add(files: readonly File[]) {
      return api().add(files);
    },
    release(ids: readonly string[]) {
      api().release(ids);
    },
    set(next: readonly AttachmentItem[]) {
      act(() => setList(next));
    },
    rerender() {
      act(() => setList([...list]));
    },
    /**
     * Runs the hook's effect cleanups and then its setups again before any
     * microtask can run, as Fast Refresh or an effect replay does.
     */
    replayEffects() {
      act(() => setHidden(true));
      act(() => setHidden(false));
    },
    /** Hides the hook in its `Activity` for longer than a tick, then shows it. */
    async hideAndShow() {
      act(() => setHidden(true));
      await act(microtasks);
      act(() => setHidden(false));
      await act(microtasks);
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("useAttachments", () => {
  test("refused files carry a reason; accepted ones a preview URL", () => {
    const host = mountHost({ maxFiles: 2, maxFileBytes: 10 });
    const big = file("big.png", 20, "image/png");
    const notes = file("notes.txt");
    const again = file("notes.txt");
    const plan = file("plan.md");
    const extra = file("extra.md");
    const { accepted, rejected } = host.drop([big, notes, again, plan, extra]);

    expect(accepted.map((item) => item.name)).toEqual(["notes.txt", "plan.md"]);
    expect(accepted.map((item) => item.file)).toEqual([notes, plan]);
    expect(accepted.map((item) => item.url)).toEqual(created);
    expect(new Set(accepted.map((item) => item.id)).size).toBe(2);
    expect(rejected).toEqual([
      { file: big, reason: "too-large" },
      { file: again, reason: "duplicate" },
      { file: extra, reason: "too-many" },
    ]);
    expect(host.list).toEqual(accepted);
    host.unmount();
  });

  test("a file with no type is a generic binary", () => {
    const host = mountHost();
    const [item] = host.drop([new File(["abc"], "archive.bin")]).accepted;
    expect(item?.mediaType).toBe("application/octet-stream");
    expect(item?.size).toBe(3);
    host.unmount();
  });

  test("two adds before the list updates still respect the limits", () => {
    const host = mountHost({ maxFiles: 2 });
    let second: ReturnType<UseAttachmentsResult["add"]> | undefined;
    act(() => {
      host.add([file("a.txt")]);
      second = host.add([file("a.txt"), file("b.txt"), file("c.txt")]);
    });
    expect(second?.accepted.map((item) => item.name)).toEqual(["b.txt"]);
    expect(second?.rejected.map((rejection) => rejection.reason)).toEqual([
      "duplicate",
      "too-many",
    ]);
    host.unmount();
  });

  test("removing an attachment revokes its preview URL and only its", () => {
    const host = mountHost();
    const [first, second] = host.drop([file("a.txt"), file("b.txt")]).accepted;
    if (first === undefined || second === undefined) throw new Error("missing");
    expect(revoked).toEqual([]);

    host.set([second]);
    expect(revoked).toEqual([first.url ?? ""]);

    host.set([]);
    expect(revoked).toEqual([first.url ?? "", second.url ?? ""]);
    host.unmount();
  });

  test("an accepted file the host never appended is revoked and can come back", () => {
    const host = mountHost();
    act(() => {
      host.add([file("a.txt")]);
    });
    host.rerender();
    expect(revoked).toEqual(created);

    const { accepted, rejected } = host.drop([file("a.txt")]);
    expect(rejected).toEqual([]);
    expect(accepted).toHaveLength(1);
    host.unmount();
  });

  test("a released attachment keeps its URL after it leaves the list", async () => {
    const host = mountHost();
    const sent = host.drop([file("a.txt"), file("b.txt")]).accepted;
    host.release(sent.map((item) => item.id));
    host.set([]);
    host.unmount();
    await microtasks();
    expect(revoked).toEqual([]);
  });

  test("unmounting revokes every URL still held", async () => {
    const host = mountHost();
    host.drop([file("a.txt"), file("b.txt")]);
    host.unmount();
    await microtasks();
    expect([...revoked].sort()).toEqual([...created].sort());
  });

  // StrictMode replays effects only at mount, before any URL is made, so
  // the replay here comes after: the effects are torn down and set up again
  // while the previews are on screen.
  test("an effect replay while previews are held revokes nothing", async () => {
    const host = mountHost({ strict: true });
    host.drop([file("a.txt"), file("b.txt")]);
    expect(created).toHaveLength(2);

    host.replayEffects();
    await microtasks();
    expect(revoked).toEqual([]);

    host.unmount();
    await microtasks();
    expect([...revoked].sort()).toEqual([...created].sort());
  });

  // Nothing tells a hide from an unmount, so the previews go and the held
  // items keep their dead URLs; `Attachment` rebuilds the pictures from
  // `file` (see attachments.test.tsx).
  test("a hide longer than a tick revokes the held previews", async () => {
    const host = mountHost();
    const [item] = host.drop([file("a.png", 4, "image/png")]).accepted;
    if (item === undefined) throw new Error("missing");

    await host.hideAndShow();
    expect(revoked).toEqual([item.url ?? ""]);
    expect(host.list).toEqual([item]);
    expect(host.list[0]?.file).toBeInstanceOf(File);
    host.unmount();
  });

  test("the host's own URLs are never revoked", async () => {
    const uploaded: AttachmentItem = {
      id: "uploaded-1",
      name: "report.pdf",
      mediaType: "application/pdf",
      size: 2048,
      url: "https://files.example.com/report.pdf",
    };
    const host = mountHost({ initial: [uploaded] });
    const { rejected } = host.drop([file("report.pdf", 2048)]);
    expect(rejected.map((rejection) => rejection.reason)).toEqual([
      "duplicate",
    ]);
    host.set([]);
    host.unmount();
    await microtasks();
    expect(revoked).toEqual([]);
  });
});
