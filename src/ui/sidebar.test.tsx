import { expect, test } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { SidebarItem } from "./sidebar.js";

test("asChild renders the consumer's link with the icon, label and count inside it", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <SidebarItem asChild active icon={<svg />} count={3}>
        <a href="/inbox">Inbox</a>
      </SidebarItem>,
    );
  });
  const link = host.querySelector("a");
  expect(link?.getAttribute("href")).toBe("/inbox");
  expect(link?.getAttribute("aria-current")).toBe("page");
  expect(link?.getAttribute("data-slot")).toBe("sidebar-item");
  expect(link?.querySelector("svg")).not.toBeNull();
  expect(link?.textContent).toBe("Inbox3");
  act(() => root.unmount());
  host.remove();
});
