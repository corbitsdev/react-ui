import { expect, test } from "bun:test";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";

import { CommandPalette } from "./command-palette.js";
import { Sidebar } from "./sidebar.js";
import { SidebarSearch } from "./sidebar-search.js";

function pressCommandK() {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}

test("Cmd+K on the search control opens the command palette", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  function Host() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Sidebar>
          <SidebarSearch onOpen={() => setOpen(true)} />
        </Sidebar>
        <CommandPalette
          open={open}
          onOpenChange={setOpen}
          query=""
          onQueryChange={() => {}}
          groups={[]}
          onSelect={() => {}}
        />
      </>
    );
  }

  act(() => {
    root.render(<Host />);
  });

  const control = host.querySelector("[data-slot='sidebar-search']");
  expect(control?.textContent).toContain("Cmd+K");
  expect(control?.textContent).toContain("Search");
  expect(
    document.body.querySelector("[data-slot='command-palette-input']"),
  ).toBeNull();

  pressCommandK();

  expect(
    document.body.querySelector("[data-slot='command-palette-input']"),
  ).not.toBeNull();

  act(() => root.unmount());
  host.remove();
});

test("the search label collapses to the icon with the rail", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <Sidebar collapsed>
        <SidebarSearch onOpen={() => {}} />
      </Sidebar>,
    );
  });

  const control = host.querySelector("[data-slot='sidebar-search']");
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

  act(() => root.unmount());
  host.remove();
});
