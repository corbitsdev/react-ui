import { expect, test } from "bun:test";
import { act, StrictMode, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { CommandPalette, useCommandShortcut } from "./command-palette.js";
import { Sidebar } from "./sidebar.js";
import { SidebarSearch } from "./sidebar-search.js";

function pressCommandK() {
  pressShortcut(true, false);
}

function pressCtrlK() {
  pressShortcut(false, true);
}

function pressShortcut(metaKey: boolean, ctrlKey: boolean) {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey,
        ctrlKey,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(node);
  });
  return {
    host,
    unmount() {
      act(() => root.unmount());
      host.remove();
    },
  };
}

const paletteProps = {
  query: "",
  onQueryChange: () => {},
  groups: [],
  onSelect: () => {},
};

test("Cmd+K on the search control opens the command palette", () => {
  function Host() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Sidebar>
          <SidebarSearch onOpen={() => setOpen(true)} />
        </Sidebar>
        <CommandPalette open={open} onOpenChange={setOpen} {...paletteProps} />
      </>
    );
  }

  const view = mount(<Host />);

  const control = view.host.querySelector("[data-slot='sidebar-search']");
  expect(control?.textContent).toContain("Cmd+K");
  expect(control?.textContent).toContain("Search");
  expect(control?.getAttribute("aria-keyshortcuts")).toBe("Meta+K Control+K");
  expect(
    document.body.querySelector("[data-slot='command-palette-input']"),
  ).toBeNull();

  pressCommandK();

  expect(
    document.body.querySelector("[data-slot='command-palette-input']"),
  ).not.toBeNull();

  view.unmount();
});

test("Ctrl+K opens the palette unless a text field is focused", () => {
  function Host() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Sidebar>
          <SidebarSearch onOpen={() => setOpen(true)} />
        </Sidebar>
        <input data-slot="search-field" />
        <CommandPalette open={open} onOpenChange={setOpen} {...paletteProps} />
      </>
    );
  }

  const view = mount(<Host />);
  const field = view.host.querySelector(
    "[data-slot='search-field']",
  ) as HTMLInputElement;
  field.focus();
  act(() => {
    field.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  expect(
    document.body.querySelector("[data-slot='command-palette-input']"),
  ).toBeNull();

  field.blur();
  pressCtrlK();
  expect(
    document.body.querySelector("[data-slot='command-palette-input']"),
  ).not.toBeNull();

  view.unmount();
});

test("a host toggle plus search finishes with the palette open", () => {
  function Host() {
    const [open, setOpen] = useState(false);
    useCommandShortcut(() => setOpen((value) => !value));
    return (
      <>
        <SidebarSearch onOpen={() => setOpen(true)} />
        <CommandPalette open={open} onOpenChange={setOpen} {...paletteProps} />
      </>
    );
  }

  const view = mount(<Host />);
  pressCommandK();
  expect(
    document.body.querySelector("[data-slot='command-palette-input']"),
  ).not.toBeNull();
  view.unmount();
});

test("two search controls invoke onOpen once per Meta+K", () => {
  let calls = 0;
  function open() {
    calls += 1;
  }

  const view = mount(
    <>
      <SidebarSearch onOpen={open} />
      <SidebarSearch onOpen={open} />
    </>,
  );
  pressCommandK();
  expect(calls).toBe(1);
  view.unmount();
});

test("a disabled search ignores the shortcut and does not advertise it", () => {
  let calls = 0;
  const view = mount(
    <SidebarSearch
      disabled
      onOpen={() => {
        calls += 1;
      }}
    />,
  );
  const control = view.host.querySelector(
    "[data-slot='sidebar-search']",
  ) as HTMLButtonElement;
  expect(control.disabled).toBe(true);
  expect(control.getAttribute("aria-keyshortcuts")).toBeNull();
  expect(control.querySelector("kbd")).toBeNull();
  expect(control.textContent).not.toContain("Cmd+K");

  act(() => {
    control.click();
  });
  pressCommandK();
  expect(calls).toBe(0);
  view.unmount();
});

test("unmounting the subscriber that attached the listener leaves it working", () => {
  const calls = { first: 0, second: 0 };
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  function Fixture({ showFirst }: { showFirst: boolean }) {
    return (
      <>
        {showFirst ? (
          <SidebarSearch
            onOpen={() => {
              calls.first += 1;
            }}
          />
        ) : null}
        <SidebarSearch
          onOpen={() => {
            calls.second += 1;
          }}
        />
      </>
    );
  }

  act(() => {
    root.render(<Fixture showFirst />);
  });
  act(() => {
    root.render(<Fixture showFirst={false} />);
  });
  pressCommandK();
  expect(calls.first).toBe(0);
  expect(calls.second).toBe(1);

  act(() => root.unmount());
  host.remove();
});

test("strict mode remount leaves the shortcut working", () => {
  let calls = 0;
  const view = mount(
    <StrictMode>
      <SidebarSearch
        onOpen={() => {
          calls += 1;
        }}
      />
    </StrictMode>,
  );
  pressCommandK();
  expect(calls).toBe(1);
  view.unmount();
});

test("the search label collapses to the icon with the rail", () => {
  const view = mount(
    <Sidebar collapsed>
      <SidebarSearch onOpen={() => {}} />
    </Sidebar>,
  );

  const control = view.host.querySelector("[data-slot='sidebar-search']");
  const icon = control?.querySelector("svg");
  const label = control?.querySelector("span.min-w-0");
  const hint = control?.querySelector("kbd");
  expect(icon).not.toBeNull();
  expect(label?.className).toContain(
    "group-data-[collapsed=true]/sidebar:sr-only",
  );
  expect(hint?.textContent).toBe("Cmd+K");
  expect(hint?.className).toContain(
    "group-data-[collapsed=true]/sidebar:sr-only",
  );

  view.unmount();
});
