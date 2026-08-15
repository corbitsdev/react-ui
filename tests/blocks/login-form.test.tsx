import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { LoginForm } from "../../src/blocks/login/login-form.js";

type Mounted = {
  container: HTMLElement;
  unmount: () => void;
};

function render(node: React.ReactElement): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("LoginForm default (sign-in) mode", () => {
  test("has no name field and password uses current-password", () => {
    const mounted = render(<LoginForm onSubmit={() => {}} />);
    expect(mounted.container.querySelector('input[name="name"]')).toBeNull();
    const password = mounted.container.querySelector('input[name="password"]');
    expect(password?.getAttribute("autoComplete")).toBe("current-password");
    mounted.unmount();
  });

  test("busy reads Signing in…", () => {
    const mounted = render(<LoginForm onSubmit={() => {}} busy />);
    expect(mounted.container.querySelector("button[type=submit]")?.textContent).toBe("Signing in…");
    mounted.unmount();
  });

  test("mode='sign-in' is equivalent to the default", () => {
    const mounted = render(<LoginForm mode="sign-in" onSubmit={() => {}} />);
    expect(mounted.container.querySelector('input[name="name"]')).toBeNull();
    mounted.unmount();
  });
});

describe("LoginForm sign-up mode", () => {
  test("renders a name field", () => {
    const mounted = render(<LoginForm mode="sign-up" onSubmit={() => {}} />);
    expect(mounted.container.querySelector('input[name="name"]')).not.toBeNull();
    mounted.unmount();
  });

  test("password uses new-password autocomplete", () => {
    const mounted = render(<LoginForm mode="sign-up" onSubmit={() => {}} />);
    const password = mounted.container.querySelector('input[name="password"]');
    expect(password?.getAttribute("autoComplete")).toBe("new-password");
    mounted.unmount();
  });

  test("busy reads Signing up…", () => {
    const mounted = render(<LoginForm mode="sign-up" onSubmit={() => {}} busy />);
    expect(mounted.container.querySelector("button[type=submit]")?.textContent).toBe("Signing up…");
    mounted.unmount();
  });

  test("submits the name alongside email and password", () => {
    const submitted: { credentials: { name?: string; email: string; password: string } | null } = {
      credentials: null,
    };
    const mounted = render(
      <LoginForm mode="sign-up" onSubmit={(credentials) => (submitted.credentials = credentials)} />,
    );
    const form = mounted.container.querySelector("form");
    const name = mounted.container.querySelector('input[name="name"]') as HTMLInputElement;
    const email = mounted.container.querySelector('input[name="email"]') as HTMLInputElement;
    const password = mounted.container.querySelector('input[name="password"]') as HTMLInputElement;

    // React controls these inputs; set the native value then dispatch input
    // through the DOM so React's change handler observes it.
    const setValue = (input: HTMLInputElement, value: string) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    act(() => {
      setValue(name, "Ada Lovelace");
      setValue(email, "ada@example.com");
      setValue(password, "correct horse battery staple");
    });
    act(() => {
      form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(submitted.credentials).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "correct horse battery staple",
    });
    mounted.unmount();
  });
});
