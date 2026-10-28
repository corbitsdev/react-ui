import { expect, test, type Page } from "@playwright/test";

/** React commits so far, counted by the scenario's Profiler. */
function commits(page: Page): Promise<number> {
  return page.evaluate(() => Number(document.body.dataset["commits"] ?? 0));
}

function width(page: Page, target: "panel" | "main" | "row") {
  const locator =
    target === "panel"
      ? page.getByRole("complementary", { name: "Side panel" })
      : page.getByTestId(target);
  return locator.evaluate((element) => element.getBoundingClientRect().width);
}

function nextFrames(page: Page): Promise<void> {
  return page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

test("dragging the handle resizes the panel without a React render", async ({
  page,
}) => {
  await page.goto("/panel");
  const handle = page.getByRole("separator", { name: "Resize panel" });
  const start = Math.round(await width(page, "panel"));
  const box = await handle.boundingBox();
  if (box === null) throw new Error("the handle has no box");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  const before = await commits(page);
  expect(before).toBeGreaterThan(0);
  await page.mouse.down();
  for (let step = 1; step <= 10; step += 1) {
    await page.mouse.move(x - step * 10, y);
  }
  await nextFrames(page);

  expect(await commits(page)).toBe(before);
  expect(Math.abs((await width(page, "panel")) - (start + 100))).toBeLessThan(
    1,
  );
  await expect(handle).toHaveAttribute("aria-valuenow", String(start + 100));

  await page.mouse.up();
  await expect.poll(() => commits(page)).toBeGreaterThan(before);
  await expect(page.getByRole("status", { name: "Width" })).toHaveText(
    String(start + 100),
  );
  await expect(handle).toHaveAttribute("aria-valuenow", String(start + 100));
});

test("double-click and Enter reset the width", async ({ page }) => {
  await page.goto("/panel");
  const handle = page.getByRole("separator", { name: "Resize panel" });
  const output = page.getByRole("status", { name: "Width" });
  const start = Math.round(await width(page, "panel"));

  await handle.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(output).toHaveText(String(start + 16));
  await page.keyboard.press("Shift+ArrowLeft");
  await expect(output).toHaveText(String(start + 80));
  await page.keyboard.press("ArrowRight");
  await expect(output).toHaveText(String(start + 64));

  await handle.dblclick();
  await expect(output).toHaveText("default");
  expect(Math.round(await width(page, "panel"))).toBe(start);

  await page.keyboard.press("Home");
  await expect(output).toHaveText("320");
  await page.keyboard.press("Enter");
  await expect(output).toHaveText("default");
  expect(Math.round(await width(page, "panel"))).toBe(start);
});

test("a click on the handle focuses it for the arrow keys", async ({
  page,
}) => {
  await page.goto("/panel");
  const handle = page.getByRole("separator", { name: "Resize panel" });
  const output = page.getByRole("status", { name: "Width" });
  const start = Math.round(await width(page, "panel"));
  await page.getByRole("button", { name: "Show notes" }).focus();

  await handle.click();
  await expect(handle).toBeFocused();
  await expect(output).toHaveText("default");
  await page.keyboard.press("ArrowLeft");
  await expect(output).toHaveText(String(start + 16));
});

test("the main area keeps its minimum width", async ({ page }) => {
  await page.goto("/panel");
  const handle = page.getByRole("separator", { name: "Resize panel" });
  const row = await width(page, "row");

  await handle.focus();
  await page.keyboard.press("End");
  await expect(handle).toHaveAttribute(
    "aria-valuenow",
    String(Math.round(row - 440)),
  );
  expect(Math.abs((await width(page, "main")) - 440)).toBeLessThan(1);

  const box = await handle.boundingBox();
  if (box === null) throw new Error("the handle has no box");
  await page.mouse.move(box.x + box.width / 2, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x - 300, box.y + 20, { steps: 5 });
  await page.mouse.up();
  expect(Math.abs((await width(page, "main")) - 440)).toBeLessThan(1);
});

test("a hidden pane keeps its typed text and scroll position", async ({
  page,
}) => {
  await page.goto("/panel");
  const notes = page.getByTestId("notes-pane");
  const draft = page.getByTestId("draft-pane");
  await page
    .getByRole("textbox", { name: "Notes field" })
    .fill("half a thought");
  await notes.evaluate((element) => {
    element.scrollTop = 400;
  });

  await page.getByRole("button", { name: "Show draft" }).click();
  await expect(notes).toHaveAttribute("data-state", "inactive");
  await expect(draft).toHaveAttribute("data-state", "active");
  await page.getByRole("textbox", { name: "Draft field" }).fill("a draft");
  await draft.evaluate((element) => {
    element.scrollTop = 250;
  });

  await page.getByRole("button", { name: "Show notes" }).click();
  await expect(notes).toHaveAttribute("data-state", "active");
  await expect(page.getByRole("textbox", { name: "Notes field" })).toHaveValue(
    "half a thought",
  );
  expect(
    Math.abs((await notes.evaluate((element) => element.scrollTop)) - 400),
  ).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Show draft" }).click();
  await expect(page.getByRole("textbox", { name: "Draft field" })).toHaveValue(
    "a draft",
  );
  expect(
    Math.abs((await draft.evaluate((element) => element.scrollTop)) - 250),
  ).toBeLessThanOrEqual(1);
});

test("a narrow row gets an overlay that returns focus on close", async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 720 });
  await page.goto("/panel");
  const panel = page.getByRole("complementary", { name: "Side panel" });
  const row = await page.getByTestId("row").boundingBox();
  const covered = await panel.boundingBox();
  if (row === null || covered === null) throw new Error("missing boxes");
  expect(Math.abs(covered.x - row.x)).toBeLessThan(1);
  expect(Math.abs(covered.width - row.width)).toBeLessThan(1);
  await expect(page.getByRole("separator")).toBeHidden();

  await page.getByRole("button", { name: "Close panel" }).click();
  const opener = page.getByRole("button", { name: "Open panel" });
  await opener.click();
  await expect(panel).toBeFocused();
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(panel).toBeHidden();
  await expect(opener).toBeFocused();
});

/** Whether focus is inside the panel, or on nothing at all. */
function focusStaysInPanel(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const active = document.activeElement;
    const panel = document.querySelector("[data-slot='panel']");
    return (
      active === null ||
      active === document.body ||
      (panel !== null && panel.contains(active))
    );
  });
}

test("Shift+Tab never leaves a narrow overlay for the area it covers", async ({
  page,
}) => {
  await page.setViewportSize({ width: 600, height: 720 });
  await page.goto("/panel");
  const main = page.getByTestId("main");
  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(main).not.toHaveAttribute("inert");
  await page.getByRole("button", { name: "Open panel" }).click();
  await expect(main).toHaveAttribute("inert", "");

  await page.getByRole("button", { name: "Close panel" }).focus();
  for (let press = 0; press < 4; press += 1) {
    await page.keyboard.press("Shift+Tab");
    expect(await focusStaysInPanel(page)).toBe(true);
  }

  await page.getByRole("button", { name: "Close panel" }).click();
  await expect(main).not.toHaveAttribute("inert");
  await expect(page.getByRole("button", { name: "Open panel" })).toBeFocused();
});

test("narrowing the row while the panel is open turns it into an overlay", async ({
  page,
}) => {
  await page.goto("/panel");
  const main = page.getByTestId("main");
  const panel = page.getByRole("complementary", { name: "Side panel" });
  await page.getByRole("button", { name: "Show notes" }).focus();
  await expect(main).not.toHaveAttribute("inert");

  await page.setViewportSize({ width: 600, height: 720 });
  await expect(main).toHaveAttribute("inert", "");
  await expect(panel).toBeFocused();

  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(main).not.toHaveAttribute("inert");
  await expect(page.getByRole("separator")).toBeVisible();
  // Side by side again, focus goes back to what the overlay covered.
  await expect(page.getByRole("button", { name: "Show notes" })).toBeFocused();
});
