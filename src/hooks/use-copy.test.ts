import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act } from "react";

import { renderHook } from "../test/render-hook.js";
import { useCopy } from "./use-copy.js";

const original = Object.getOwnPropertyDescriptor(navigator, "clipboard");

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

const wait = (ms: number) =>
  act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)));

describe("useCopy", () => {
  beforeEach(() => {
    stubClipboard(() => Promise.resolve());
  });

  afterEach(() => {
    if (original === undefined) {
      Reflect.deleteProperty(navigator, "clipboard");
    } else {
      Object.defineProperty(navigator, "clipboard", original);
    }
  });

  test("turns copied on after a copy and off after the timeout", async () => {
    const writeText = mock((_text: string) => Promise.resolve());
    stubClipboard(writeText);
    const hook = renderHook(() => useCopy({ timeout: 30 }));
    expect(hook.result.current.copied).toBe(false);

    let written: boolean | undefined;
    await act(async () => {
      written = await hook.result.current.copy("hello");
    });
    expect(written).toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
    expect(hook.result.current.copied).toBe(true);

    await wait(50);
    expect(hook.result.current.copied).toBe(false);
    hook.unmount();
  });

  test("copying again restarts the timer", async () => {
    const hook = renderHook(() => useCopy({ timeout: 40 }));
    await act(async () => {
      await hook.result.current.copy("one");
    });
    await wait(25);
    await act(async () => {
      await hook.result.current.copy("two");
    });
    await wait(25);
    expect(hook.result.current.copied).toBe(true);
    await wait(30);
    expect(hook.result.current.copied).toBe(false);
    hook.unmount();
  });

  test("a rejected clipboard write leaves copied false", async () => {
    stubClipboard(() => Promise.reject(new Error("denied")));
    const hook = renderHook(() => useCopy());
    let written: boolean | undefined;
    await act(async () => {
      written = await hook.result.current.copy("hello");
    });
    expect(written).toBe(false);
    expect(hook.result.current.copied).toBe(false);
    hook.unmount();
  });

  test("a failed copy turns off an earlier copied state", async () => {
    let fail = false;
    stubClipboard(() =>
      fail ? Promise.reject(new Error("denied")) : Promise.resolve(),
    );
    const hook = renderHook(() => useCopy({ timeout: 1000 }));
    await act(async () => {
      await hook.result.current.copy("one");
    });
    expect(hook.result.current.copied).toBe(true);
    fail = true;
    await act(async () => {
      await hook.result.current.copy("two");
    });
    expect(hook.result.current.copied).toBe(false);
    hook.unmount();
  });

  test("clears its timer on unmount", async () => {
    const cleared = mock(clearTimeout);
    const realClear = globalThis.clearTimeout;
    globalThis.clearTimeout = cleared as unknown as typeof clearTimeout;
    try {
      const hook = renderHook(() => useCopy({ timeout: 1000 }));
      await act(async () => {
        await hook.result.current.copy("hello");
      });
      const before = cleared.mock.calls.length;
      hook.unmount();
      expect(cleared.mock.calls.length).toBe(before + 1);
    } finally {
      globalThis.clearTimeout = realClear;
    }
  });
});
