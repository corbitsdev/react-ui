import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { useControllableState, type UseControllableStateOptions } from "./use-controllable-state.js";

function mount<T>(options: UseControllableStateOptions<T>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let result: readonly [T, (action: T | ((previous: T) => T)) => void] | undefined;

  function Host(props: UseControllableStateOptions<T>) {
    result = useControllableState(props);
    return null;
  }

  act(() => {
    root.render(createElement(Host, options));
  });

  return {
    get: () => result as readonly [T, (action: T | ((previous: T) => T)) => void],
    rerender: (props: UseControllableStateOptions<T>) => {
      act(() => {
        root.render(createElement(Host, props));
      });
    },
    unmount: () => act(() => root.unmount()),
  };
}

describe("useControllableState", () => {
  test("uncontrolled: starts at defaultValue and the setter updates it", () => {
    const handle = mount({ defaultValue: false, name: "test" });
    expect(handle.get()[0]).toBe(false);
    act(() => handle.get()[1](true));
    expect(handle.get()[0]).toBe(true);
    handle.unmount();
  });

  test("uncontrolled: the setter accepts a functional updater", () => {
    const handle = mount({ defaultValue: 1, name: "test" });
    act(() => handle.get()[1]((previous) => previous + 1));
    expect(handle.get()[0]).toBe(2);
    handle.unmount();
  });

  test("controlled: the value tracks the prop, not internal state", () => {
    let changed: boolean | undefined;
    const handle = mount({ value: false, defaultValue: false, name: "test", onChange: (v) => (changed = v) });
    act(() => handle.get()[1](true));
    expect(changed).toBe(true);
    expect(handle.get()[0]).toBe(false);
    handle.rerender({ value: true, defaultValue: false, name: "test", onChange: (v) => (changed = v) });
    expect(handle.get()[0]).toBe(true);
    handle.unmount();
  });

  test("controlled: the setter's functional updater sees the controlled value", () => {
    let changed: number | undefined;
    const handle = mount({ value: 5, defaultValue: 0, name: "test", onChange: (v) => (changed = v) });
    act(() => handle.get()[1]((previous) => previous + 10));
    expect(changed).toBe(15);
    handle.unmount();
  });

  describe("controlled/uncontrolled transition warning", () => {
    let errorSpy: ReturnType<typeof mock>;

    beforeEach(() => {
      errorSpy = mock(() => {});
      console.error = errorSpy as unknown as typeof console.error;
    });

    afterEach(() => {
      // @ts-expect-error restoring the built-in after stubbing it above
      delete console.error;
    });

    test("logs once when an uncontrolled caller starts passing a value", () => {
      const handle = mount<boolean>({ defaultValue: false, name: "test-warn-a" });
      expect(errorSpy).not.toHaveBeenCalled();
      handle.rerender({ value: true, defaultValue: false, name: "test-warn-a" });
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0]?.[0]).toContain("test-warn-a");
      expect(errorSpy.mock.calls[0]?.[0]).toContain("uncontrolled");
      expect(errorSpy.mock.calls[0]?.[0]).toContain("controlled");
      handle.unmount();
    });

    test("logs once when a controlled caller stops passing a value", () => {
      const handle = mount<boolean>({ value: true, defaultValue: false, name: "test-warn-b" });
      expect(errorSpy).not.toHaveBeenCalled();
      handle.rerender({ value: undefined, defaultValue: false, name: "test-warn-b" });
      expect(errorSpy).toHaveBeenCalledTimes(1);
      handle.unmount();
    });

    test("does not log when staying uncontrolled or staying controlled", () => {
      const handle = mount<boolean>({ defaultValue: false, name: "test-warn-c" });
      handle.rerender({ defaultValue: false, name: "test-warn-c" });
      const controlled = mount<boolean>({ value: false, defaultValue: false, name: "test-warn-d" });
      controlled.rerender({ value: true, defaultValue: false, name: "test-warn-d" });
      expect(errorSpy).not.toHaveBeenCalled();
      handle.unmount();
      controlled.unmount();
    });
  });
});
