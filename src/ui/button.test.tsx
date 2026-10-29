import { describe, expect, mock, test } from "bun:test";
import { act, createElement, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

import { Button } from "./button.js";

function mountInForm(child: ReactElement) {
  const onSubmit = mock((event: Event) => event.preventDefault());
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement("form", { onSubmit }, child));
  });
  return {
    onSubmit,
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("Button", () => {
  test("a bare Button inside a form does not submit it", () => {
    const { onSubmit, container, unmount } = mountInForm(
      createElement(Button, null, "Retry"),
    );
    const button = container.querySelector("button") as HTMLButtonElement;

    expect(button.getAttribute("type")).toBe("button");
    act(() => {
      button.click();
    });
    expect(onSubmit).not.toHaveBeenCalled();
    unmount();
  });

  test('type="submit" still submits the form', () => {
    const { onSubmit, container, unmount } = mountInForm(
      createElement(Button, { type: "submit" }, "Sign in"),
    );
    const button = container.querySelector("button") as HTMLButtonElement;

    expect(button.getAttribute("type")).toBe("submit");
    act(() => {
      button.click();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    unmount();
  });

  test("asChild gets no injected type", () => {
    const { container, unmount } = mountInForm(
      createElement(
        Button,
        { asChild: true },
        createElement("a", { href: "#docs" }, "Docs"),
      ),
    );
    const link = container.querySelector("a") as HTMLAnchorElement;

    expect(link.hasAttribute("type")).toBe(false);
    unmount();
  });
});
