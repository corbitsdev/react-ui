import { describe, expect, mock, test } from "bun:test";
import {
  act,
  createElement,
  type ComponentProps,
  type ReactElement,
} from "react";
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

function requireButton(container: ParentNode): HTMLButtonElement {
  const button = container.querySelector("button");
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("expected a button");
  }
  return button;
}

function requireAnchor(container: ParentNode): HTMLAnchorElement {
  const link = container.querySelector("a");
  if (!(link instanceof HTMLAnchorElement)) {
    throw new Error("expected an anchor");
  }
  return link;
}

describe("Button", () => {
  test("a bare Button inside a form does not submit it", () => {
    const { onSubmit, container, unmount } = mountInForm(
      createElement(Button, null, "Retry"),
    );
    const button = requireButton(container);

    expect(button.getAttribute("type")).toBe("button");
    act(() => {
      button.click();
    });
    expect(onSubmit).not.toHaveBeenCalled();
    unmount();
  });

  test("a forwarded type={undefined} keeps the button default", () => {
    const { onSubmit, container, unmount } = mountInForm(
      createElement(Button, { type: undefined }, "Retry"),
    );
    const button = requireButton(container);

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
    const button = requireButton(container);

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
    const link = requireAnchor(container);

    expect(link.hasAttribute("type")).toBe(false);
    unmount();
  });

  test("asChild keeps a child type that is set before the spread", () => {
    function Child(props: ComponentProps<"button">) {
      return createElement("button", { type: "button", ...props }, "Child");
    }

    const { onSubmit, container, unmount } = mountInForm(
      createElement(Button, { asChild: true }, createElement(Child)),
    );
    const button = requireButton(container);

    expect(button.getAttribute("type")).toBe("button");
    act(() => {
      button.click();
    });
    expect(onSubmit).not.toHaveBeenCalled();
    unmount();
  });
});
