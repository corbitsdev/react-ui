import { describe, expect, mock, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { MicButton, type DictationState } from "./mic-button.js";

function mount(state: DictationState, onToggle: () => void) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(MicButton, { state, onToggle }));
  });
  return {
    button: () => document.body.querySelector("button") as HTMLButtonElement,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("MicButton", () => {
  test("idle stays enabled and fires onToggle", () => {
    const onToggle = mock();
    const { button, unmount } = mount("idle", onToggle);

    expect(button().disabled).toBe(false);

    act(() => {
      button().click();
    });

    expect(onToggle).toHaveBeenCalledTimes(1);
    unmount();
  });

  test("unsupported is disabled and does not fire onToggle", () => {
    const onToggle = mock();
    const { button, unmount } = mount("unsupported", onToggle);

    expect(button().disabled).toBe(true);

    act(() => {
      button().click();
    });

    expect(onToggle).not.toHaveBeenCalled();
    unmount();
  });

  test("denied matches the documented contract: disabled, onToggle does not fire", () => {
    const onToggle = mock();
    const { button, unmount } = mount("denied", onToggle);

    expect(button().disabled).toBe(true);

    act(() => {
      button().click();
    });

    expect(onToggle).not.toHaveBeenCalled();
    unmount();
  });
});
