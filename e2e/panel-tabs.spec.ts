import { expect, test, type Locator, type Page } from "@playwright/test";

function order(page: Page): Locator {
  return page.getByRole("status", { name: "Order" });
}

function tab(page: Page, name: string): Locator {
  return page.getByRole("tab", { name, exact: true });
}

/** How far `name`'s tab sticks out of the row's visible part, in px. */
function overflow(page: Page, name: string): Promise<number> {
  return tab(page, name).evaluate((element) => {
    const row = element.closest("[role='tablist']");
    if (row === null) throw new Error("the tab has no row");
    const box = element.getBoundingClientRect();
    const view = row.getBoundingClientRect();
    return Math.max(0, view.left - box.left, box.right - view.right);
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/panel-tabs");
});

test("dragging a tab to the last slot moves it there", async ({ page }) => {
  const beta = tab(page, "Beta");
  const delta = tab(page, "Delta");
  const from = await beta.boundingBox();
  const to = await delta.boundingBox();
  if (from === null || to === null) throw new Error("missing boxes");
  const y = from.y + from.height / 2;

  await page.mouse.move(from.x + from.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width - 4, y, { steps: 12 });
  await expect(
    page.locator("[data-slot='panel-tab'][data-value='beta']"),
  ).toHaveAttribute("data-dragging", "true");
  // The tab passed slides aside while the order is still unchanged.
  await expect(order(page)).toHaveText("alpha,beta,gamma,delta");
  await page.mouse.up();

  await expect(order(page)).toHaveText("alpha,gamma,delta,beta");
  await expect(
    page.locator("[data-slot='panel-tab'][style*='translate']"),
  ).toHaveCount(0);
  // The release does not also click the tab, and focus goes back to the
  // selected tab, the row's tab stop.
  await expect(page.getByRole("status", { name: "Selected" })).toHaveText(
    "alpha",
  );
  await expect(tab(page, "Alpha")).toBeFocused();
});

test("a drag dropped where it began leaves focus on the selected tab", async ({
  page,
}) => {
  const box = await tab(page, "Beta").boundingBox();
  if (box === null) throw new Error("missing box");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 12, y, { steps: 3 });
  await expect(
    page.locator("[data-slot='panel-tab'][data-value='beta']"),
  ).toHaveAttribute("data-dragging", "true");
  await page.mouse.up();

  await expect(order(page)).toHaveText("alpha,beta,gamma,delta");
  await expect(page.getByRole("status", { name: "Selected" })).toHaveText(
    "alpha",
  );
  await expect(tab(page, "Alpha")).toBeFocused();
  // Delete acts on the selected tab, not on the one that was dragged.
  await page.keyboard.press("Delete");
  await expect(order(page)).toHaveText("beta,gamma,delta");
});

test("Escape cancels a drag", async ({ page }) => {
  const beta = tab(page, "Beta");
  const box = await beta.boundingBox();
  if (box === null) throw new Error("missing box");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 3, y, { steps: 8 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(order(page)).toHaveText("alpha,beta,gamma,delta");
});

test("releasing a drag cancelled with Escape does not select the tab", async ({
  page,
}) => {
  const selected = page.getByRole("status", { name: "Selected" });
  const box = await tab(page, "Beta").boundingBox();
  if (box === null) throw new Error("missing box");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 12, y, { steps: 3 });
  await page.keyboard.press("Escape");
  // A person lets go a moment later, over the tab they pressed.
  await page.waitForTimeout(50);
  await page.mouse.up();
  await expect(order(page)).toHaveText("alpha,beta,gamma,delta");
  await expect(selected).toHaveText("alpha");
  await expect(tab(page, "Alpha")).toBeFocused();

  // Only that press's click is swallowed: the next click selects.
  await tab(page, "Beta").click();
  await expect(selected).toHaveText("beta");
});

test("the keyboard selects and moves tabs", async ({ page }) => {
  const selected = page.getByRole("status", { name: "Selected" });
  await tab(page, "Alpha").focus();

  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Beta")).toBeFocused();
  await expect(tab(page, "Beta")).toHaveAttribute("aria-selected", "true");
  await expect(selected).toHaveText("beta");
  await page.keyboard.press("End");
  await expect(tab(page, "Delta")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Alpha")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(selected).toHaveText("alpha");

  await page.keyboard.press("ControlOrMeta+Shift+ArrowRight");
  await expect(order(page)).toHaveText("beta,alpha,gamma,delta");
  await expect(tab(page, "Alpha")).toBeFocused();
  await page.keyboard.press("ControlOrMeta+Shift+ArrowRight");
  await page.keyboard.press("ControlOrMeta+Shift+ArrowRight");
  await page.keyboard.press("ControlOrMeta+Shift+ArrowRight");
  await expect(order(page)).toHaveText("beta,gamma,delta,alpha");
  await expect(tab(page, "Alpha")).toBeFocused();
  await page.keyboard.press("ControlOrMeta+Shift+ArrowLeft");
  await expect(order(page)).toHaveText("beta,gamma,alpha,delta");
  await expect(selected).toHaveText("alpha");

  // The row is one tab stop: Tab goes on to the + beside it.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Open a tab" })).toBeFocused();
});

test("middle-click and Delete close tabs", async ({ page }) => {
  const selected = page.getByRole("status", { name: "Selected" });
  await tab(page, "Gamma").click({ button: "middle" });
  await expect(order(page)).toHaveText("alpha,beta,delta");
  await expect(selected).toHaveText("alpha");

  await tab(page, "Alpha").focus();
  await page.keyboard.press("Delete");
  await expect(order(page)).toHaveText("beta,delta");
  await expect(tab(page, "Beta")).toBeFocused();
  await expect(selected).toHaveText("beta");

  await tab(page, "Delta").click();
  await tab(page, "Delta").hover();
  await page
    .locator("[data-slot='panel-tab'][data-value='delta']")
    .locator("[data-slot='panel-tab-close']")
    .click();
  await expect(order(page)).toHaveText("beta");
  await expect(selected).toHaveText("beta");
  await expect(tab(page, "Beta")).toBeFocused();
});

test("a long row keeps the selected tab in view", async ({ page }) => {
  await page.getByRole("button", { name: "Open twelve more" }).click();
  await expect(tab(page, "Extra 12")).toHaveAttribute("aria-selected", "true");
  const row = page.getByRole("tablist", { name: "Open items" });
  expect(
    await row.evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
  await expect.poll(() => overflow(page, "Extra 12")).toBeLessThanOrEqual(1);

  await tab(page, "Extra 12").focus();
  await page.keyboard.press("Home");
  await expect(tab(page, "Alpha")).toBeFocused();
  await expect.poll(() => overflow(page, "Alpha")).toBeLessThanOrEqual(1);
  await expect
    .poll(() => row.evaluate((element) => element.scrollLeft))
    .toBeLessThanOrEqual(1);

  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "Extra 12")).toBeFocused();
  await expect.poll(() => overflow(page, "Extra 12")).toBeLessThanOrEqual(1);
});

test("closing the selected tab from its pane moves focus to the next tab", async ({
  page,
}) => {
  const selected = page.getByRole("status", { name: "Selected" });
  await page.getByRole("tabpanel", { name: "Alpha" }).click();
  await expect(page.getByRole("tabpanel", { name: "Alpha" })).toBeFocused();
  await tab(page, "Alpha").hover();
  await page
    .locator("[data-slot='panel-tab'][data-value='alpha']")
    .locator("[data-slot='panel-tab-close']")
    .click();
  await expect(order(page)).toHaveText("beta,gamma,delta");
  await expect(selected).toHaveText("beta");
  await expect(tab(page, "Beta")).toBeFocused();

  await page.getByRole("tabpanel", { name: "Beta" }).click();
  await tab(page, "Beta").click({ button: "middle" });
  await expect(order(page)).toHaveText("gamma,delta");
  await expect(tab(page, "Gamma")).toBeFocused();
});

test("the header's Close tab closes the selected tab and keeps focus", async ({
  page,
}) => {
  const close = page.getByRole("button", { name: "Close tab" });
  await close.click();
  await expect(order(page)).toHaveText("beta,gamma,delta");
  await expect(page.getByRole("status", { name: "Selected" })).toHaveText(
    "beta",
  );
  await expect(close).toBeFocused();
});

test("a move is announced", async ({ page }) => {
  await tab(page, "Alpha").focus();
  await page.keyboard.press("ControlOrMeta+Shift+ArrowRight");
  await expect(page.locator("[data-slot='panel-tabs-status']")).toHaveText(
    "Moved to position 2 of 4",
  );
});
