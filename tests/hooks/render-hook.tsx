import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

export type RenderedHook<T> = {
  readonly result: { readonly current: T };
  rerender(): void;
  unmount(): void;
};

/**
 * The smallest possible hook-testing harness: mount a component that calls
 * `callback` and stashes its return value, re-render it on demand, and clean
 * up. No `@testing-library` dependency — `act` plus `react-dom/client` cover
 * everything a hook test in this package needs.
 */
export function renderHook<T>(callback: () => T): RenderedHook<T> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root;
  const resultBox: { current: T } = { current: undefined as unknown as T };

  function Probe() {
    resultBox.current = callback();
    return null;
  }

  act(() => {
    root = createRoot(container);
    root.render(<Probe />);
  });

  return {
    result: resultBox,
    rerender() {
      act(() => {
        root.render(<Probe />);
      });
    },
    unmount() {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}
