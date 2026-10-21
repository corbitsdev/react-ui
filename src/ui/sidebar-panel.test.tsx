import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { SidebarItemRow } from "./sidebar-item-row.js";
import { SidebarPanelSection } from "./sidebar-panel.js";

test("SidebarPanelSection gives its rows a labelled list parent", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <SidebarPanelSection label="Channels">
        <SidebarItemRow name="general" />
        <SidebarItemRow name="eng" />
      </SidebarPanelSection>,
    );
  });
  const list = host.querySelector("ul");
  expect(list?.getAttribute("aria-label")).toBe("Channels");
  const rows = host.querySelectorAll("li");
  expect(rows.length).toBe(2);
  for (const row of rows) expect(row.parentElement).toBe(list);
  act(() => root.unmount());
  host.remove();
});
