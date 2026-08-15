import { describe, expect, mock, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { ConfirmButton } from "./confirm-button.js";

function mount(onConfirm: () => void) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      createElement(ConfirmButton, { onConfirm, resetMs: 3000, children: "Revoke access" }),
    );
  });
  return {
    button: () => document.body.querySelector("button") as HTMLButtonElement,
    unmount: () => root.unmount(),
  };
}

describe("ConfirmButton", () => {
  test("the first click arms it: label and variant swap, onConfirm does not fire", () => {
    const onConfirm = mock();
    const { button, unmount } = mount(onConfirm);

    expect(button().textContent).toBe("Revoke access");
    expect(button().className).not.toContain("bg-destructive");

    act(() => {
      button().click();
    });

    expect(button().textContent).toBe("Click again to confirm");
    expect(button().className).toContain("bg-destructive");
    expect(onConfirm).not.toHaveBeenCalled();

    unmount();
  });

  test("the second click confirms: onConfirm fires once and the button disarms", () => {
    const onConfirm = mock();
    const { button, unmount } = mount(onConfirm);

    act(() => {
      button().click();
    });
    act(() => {
      button().click();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button().textContent).toBe("Revoke access");
    expect(button().className).not.toContain("bg-destructive");

    unmount();
  });

  test("blurring while armed disarms without confirming", () => {
    const onConfirm = mock();
    const { button, unmount } = mount(onConfirm);

    act(() => {
      button().click();
    });
    expect(button().textContent).toBe("Click again to confirm");

    // React listens for the bubbling `focusout`, not the non-bubbling native
    // `blur`, to drive its synthetic `onBlur`.
    act(() => {
      button().dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    });

    expect(button().textContent).toBe("Revoke access");
    expect(onConfirm).not.toHaveBeenCalled();

    unmount();
  });
});
