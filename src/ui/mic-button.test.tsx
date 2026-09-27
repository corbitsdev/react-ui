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
    button: () => container.querySelector("button") as HTMLButtonElement,
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

  test("denied stays clickable so the host can open the permission dialog", () => {
    const onToggle = mock();
    const { button, unmount } = mount("denied", onToggle);

    expect(button().disabled).toBe(false);
    expect(button().getAttribute("aria-label")).toMatch(/blocked/i);

    act(() => {
      button().click();
    });

    expect(onToggle).toHaveBeenCalledTimes(1);
    unmount();
  });

  test("listening uses a stop square and starting does not look like listening", () => {
    const idle = mount("idle", mock());
    const starting = mount("starting", mock());
    const listening = mount("listening", mock());

    expect(idle.button().getAttribute("aria-pressed")).toBe("false");
    expect(starting.button().getAttribute("aria-pressed")).toBe("false");
    expect(listening.button().getAttribute("aria-pressed")).toBe("true");

    expect(idle.button().className).not.toContain("bg-success");
    expect(starting.button().className).not.toContain("bg-success");
    expect(listening.button().className).toContain("bg-success");

    expect(
      idle.button().querySelector("svg")?.classList.contains("size-4"),
    ).toBe(true);
    expect(
      starting.button().querySelector("svg")?.classList.contains("size-4"),
    ).toBe(true);
    expect(
      listening.button().querySelector("svg")?.classList.contains("size-3.5"),
    ).toBe(true);

    idle.unmount();
    starting.unmount();
    listening.unmount();
  });

  test("denied announces a dialog, not a toggle", () => {
    const denied = mount("denied", mock());

    expect(denied.button().getAttribute("aria-pressed")).toBeNull();
    expect(denied.button().getAttribute("aria-haspopup")).toBe("dialog");
    expect(denied.button().getAttribute("aria-label")).toBe(
      "Microphone blocked",
    );

    denied.unmount();
  });

  test("unsupported carries its own label", () => {
    const unsupported = mount("unsupported", mock());

    expect(unsupported.button().disabled).toBe(true);
    expect(unsupported.button().getAttribute("aria-label")).toBe(
      "Dictation unavailable",
    );

    unsupported.unmount();
  });

  test("mousedown does not steal focus from the field being dictated into", () => {
    const { button, unmount } = mount("idle", mock());
    const event = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });

    button().dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    unmount();
  });
});
