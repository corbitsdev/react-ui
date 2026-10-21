import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import {
  Panel,
  PanelActions,
  PanelClose,
  PanelContent,
  PanelHandle,
  PanelHeader,
  PanelPane,
} from "./panel.js";

type Mounted = {
  container: HTMLElement;
  render: (node: React.ReactElement) => void;
  unmount: () => void;
};

function mount(node: React.ReactElement): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    render: (next) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function panes(value: string, keepMounted: boolean) {
  return (
    <Panel aria-label="Details">
      <PanelContent value={value} keepMounted={keepMounted}>
        <PanelPane value="a">
          <input aria-label="First" />
        </PanelPane>
        <PanelPane value="b">
          <input aria-label="Second" />
        </PanelPane>
      </PanelContent>
    </Panel>
  );
}

function pane(container: HTMLElement, value: string): HTMLElement | null {
  const input = container.querySelector(
    `input[aria-label='${value === "a" ? "First" : "Second"}']`,
  );
  return input?.closest<HTMLElement>("[data-slot='panel-pane']") ?? null;
}

describe("Panel", () => {
  test("without keepMounted only the shown pane is mounted", () => {
    const mounted = mount(panes("a", false));
    expect(pane(mounted.container, "a")).not.toBeNull();
    expect(pane(mounted.container, "b")).toBeNull();
    mounted.render(panes("b", false));
    expect(pane(mounted.container, "a")).toBeNull();
    expect(pane(mounted.container, "b")).not.toBeNull();
    mounted.unmount();
  });

  test("keepMounted hides the other panes and keeps what was typed", () => {
    const mounted = mount(panes("a", true));
    const first = mounted.container.querySelector<HTMLInputElement>(
      "input[aria-label='First']",
    );
    if (first === null) throw new Error("expected the first input");
    first.value = "half a reply";

    mounted.render(panes("b", true));
    const hidden = pane(mounted.container, "a");
    expect(hidden?.dataset["state"]).toBe("inactive");
    expect(hidden?.hasAttribute("inert")).toBe(true);
    expect(hidden?.className).toContain("invisible");
    expect(pane(mounted.container, "b")?.hasAttribute("inert")).toBe(false);

    mounted.render(panes("a", true));
    expect(first.isConnected).toBe(true);
    expect(first.value).toBe("half a reply");
    expect(pane(mounted.container, "a")?.dataset["state"]).toBe("active");
    mounted.unmount();
  });

  test("the handle is a named separator that controls the panel", () => {
    const mounted = mount(
      <Panel aria-label="Details">
        <PanelHandle />
        <PanelHeader>
          <h2>Thread</h2>
          <PanelActions>
            <PanelClose />
          </PanelActions>
        </PanelHeader>
      </Panel>,
    );
    const panel = mounted.container.querySelector("aside");
    const handle = mounted.container.querySelector("[role='separator']");
    expect(handle?.getAttribute("aria-label")).toBe("Resize panel");
    expect(handle?.getAttribute("aria-controls")).toBe(panel?.id ?? "");
    expect(handle?.getAttribute("tabindex")).toBe("0");
    expect(handle?.getAttribute("aria-orientation")).toBe("vertical");
    for (const name of ["aria-valuenow", "aria-valuemin", "aria-valuemax"]) {
      expect(handle?.hasAttribute(name)).toBe(true);
    }
    expect(
      mounted.container
        .querySelector("[data-slot='panel-close']")
        ?.getAttribute("aria-label"),
    ).toBe("Close panel");
    mounted.unmount();
  });

  test("closing returns focus from inside the panel to its opener", () => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open thread
          </button>
          {open ? (
            <Panel aria-label="Thread">
              <PanelClose onClick={() => setOpen(false)} />
            </Panel>
          ) : null}
        </>
      );
    }
    const mounted = mount(<Host />);
    const opener = mounted.container.querySelector("button");
    if (opener === null) throw new Error("expected the opener");
    opener.focus();
    act(() => opener.click());
    const close = mounted.container.querySelector<HTMLButtonElement>(
      "[data-slot='panel-close']",
    );
    if (close === null) throw new Error("expected the close button");
    close.focus();
    act(() => close.click());
    expect(mounted.container.querySelector("aside")).toBeNull();
    expect(document.activeElement).toBe(opener);
    mounted.unmount();
  });

  test("as an overlay the panel makes the covered main area inert until it closes", () => {
    function Host() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <main>
            <button type="button" onClick={() => setOpen(true)}>
              Open thread
            </button>
          </main>
          {open ? (
            // The `@container` query is not evaluated here; an inline
            // position stands in for the overlay it would apply.
            <Panel aria-label="Thread" style={{ position: "absolute" }}>
              <PanelClose onClick={() => setOpen(false)} />
            </Panel>
          ) : null}
        </>
      );
    }
    const mounted = mount(<Host />);
    const main = mounted.container.querySelector("main");
    const opener = mounted.container.querySelector("button");
    if (main === null || opener === null) throw new Error("expected main");
    opener.focus();
    act(() => opener.click());
    expect(main.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(
      mounted.container.querySelector("aside"),
    );
    const close = mounted.container.querySelector<HTMLButtonElement>(
      "[data-slot='panel-close']",
    );
    if (close === null) throw new Error("expected the close button");
    close.focus();
    act(() => close.click());
    expect(main.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(opener);
    mounted.unmount();
  });

  test("a panel beside the main area leaves it reachable", () => {
    const mounted = mount(
      <>
        <main />
        <Panel aria-label="Thread" />
      </>,
    );
    expect(mounted.container.querySelector("main")?.hasAttribute("inert")).toBe(
      false,
    );
    mounted.unmount();
  });

  test("a part outside its parent says where it belongs", () => {
    const original = console.error;
    console.error = () => {};
    try {
      expect(() => mount(<PanelHandle />)).toThrow(
        "PanelHandle must be inside a Panel.",
      );
    } finally {
      console.error = original;
    }
  });
});
