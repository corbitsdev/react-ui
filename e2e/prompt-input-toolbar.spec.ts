import { expect, test, type Page } from "@playwright/test";

const events = (page: Page) => page.getByRole("status", { name: "Events" });
const message = (page: Page) => page.getByRole("textbox", { name: "Message" });
const model = (page: Page) => page.getByRole("combobox", { name: "Model" });
const mode = (page: Page) =>
  page.getByRole("combobox", { name: "Mode", exact: true });
const add = (page: Page) =>
  page.getByRole("button", { name: "Add", exact: true });

function box(page: Page, selector: string) {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, height: rect.height };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/prompt-input-toolbar");
});

test("the model picker opens, moves and chooses by keyboard, keeping focus on its trigger", async ({
  page,
}) => {
  await model(page).focus();
  await page.keyboard.press("Enter");
  const list = page.getByRole("listbox", { name: "Model" });
  await expect(list).toBeVisible();
  await expect(model(page)).toBeFocused();
  // Opens on the chosen model, then walks the grouped order upward.
  const current = page.locator(
    "[data-slot='prompt-input-select-option'][data-active]",
  );
  await expect(current).toHaveText("Deep 4");
  await page.keyboard.press("ArrowUp");
  await expect(current).toHaveText("Lite 1");
  await expect(model(page)).toHaveAttribute(
    "aria-activedescendant",
    (await current.getAttribute("id")) ?? "",
  );
  await page.keyboard.press("Enter");
  await expect(list).toBeHidden();
  await expect(events(page)).toHaveText("model:lite");
  await expect(model(page)).toHaveText("Lite");
  await expect(model(page)).toBeFocused();
});

test("Escape closes a picker without choosing and leaves focus on its trigger", async ({
  page,
}) => {
  await mode(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("listbox", { name: "Mode", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("End");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("listbox", { name: "Mode", exact: true }),
  ).toBeHidden();
  await expect(mode(page)).toBeFocused();
  await expect(mode(page)).toHaveText("Ask");
  await expect(events(page)).toHaveText("");

  // Space opens and chooses too.
  await page.keyboard.press(" ");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press(" ");
  await expect(events(page)).toHaveText("mode:plan");
  await expect(
    page.getByRole("listbox", { name: "Mode", exact: true }),
  ).toBeHidden();
  await expect(mode(page)).toBeFocused();
});

test("a picker chooses by pointer and closes on a press outside", async ({
  page,
}) => {
  await model(page).click();
  await page.getByRole("option", { name: "Swift 2" }).click();
  await expect(events(page)).toHaveText("model:swift");
  await expect(model(page)).toHaveText("Swift");

  await model(page).click();
  await expect(page.getByRole("listbox", { name: "Model" })).toBeVisible();
  await page.getByRole("button", { name: "Reply to Ada" }).click();
  await expect(page.getByRole("listbox", { name: "Model" })).toBeHidden();
});

test("the add menu opens, moves past a disabled item and chooses by keyboard", async ({
  page,
}) => {
  await add(page).focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu", { name: "Add" });
  await expect(menu).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Add files" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.getByRole("menuitem", { name: "Mention an agent" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Add files" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(menu).toBeHidden();
  await expect(events(page)).toHaveText("add:mention");
  await expect(add(page)).toBeFocused();
});

test("Escape closes the add menu and returns focus; Tab closes it and moves on", async ({
  page,
}) => {
  await add(page).focus();
  await page.keyboard.press("ArrowUp");
  await expect(
    page.getByRole("menuitem", { name: "Mention an agent" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu", { name: "Add" })).toBeHidden();
  await expect(add(page)).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Add files" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("menu", { name: "Add" })).toBeHidden();
  await expect(mode(page)).toBeFocused();
  await expect(events(page)).toHaveText("");
});

test("Escape in the textarea closes a list the host opened, after the suggestion list", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open models" }).click();
  const models = page.getByRole("listbox", { name: "Model" });
  await expect(models).toBeVisible();
  await message(page).focus();
  await message(page).pressSequentially("@a");
  const mentions = page.getByRole("listbox", { name: "Mentions" });
  await expect(mentions).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(mentions).toBeHidden();
  await expect(models).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(models).toBeHidden();
  await expect(model(page)).toHaveAttribute("aria-expanded", "false");
  await expect(message(page)).toBeFocused();
  await expect(events(page)).toHaveText("");
});

test("the toolbar takes its own row, and without it the box is one row", async ({
  page,
}) => {
  const field = await box(page, "[data-slot='prompt-input-field']");
  const toolbar = await box(page, "[data-slot='prompt-input-toolbar']");
  expect(toolbar.top).toBeGreaterThanOrEqual(field.bottom);

  await page.getByRole("button", { name: "Toggle toolbar" }).click();
  await expect(page.locator("[data-slot='prompt-input-toolbar']")).toHaveCount(
    0,
  );
  const form = await box(page, "[data-slot='prompt-input']");
  const single = await box(page, "[data-slot='prompt-input-field']");
  const submit = await box(page, "[data-slot='prompt-input-submit']");
  // One row: the send button sits beside the text, not under it.
  expect(submit.top).toBeLessThan(single.bottom);
  expect(form.height).toBeLessThan(field.height + toolbar.height);
});

test("the float holds the reply chip above the box and steps aside for a popup", async ({
  page,
}) => {
  const float = page.locator("[data-slot='prompt-input-float']");
  const chip = page.locator("[data-slot='prompt-input-context']");
  await expect(chip).toContainText("Replying to Ada");
  const floatBox = await box(page, "[data-slot='prompt-input-float']");
  const form = await box(page, "[data-slot='prompt-input']");
  expect(floatBox.bottom).toBeLessThanOrEqual(form.top);
  await expect(float).toHaveCSS("visibility", "visible");

  await model(page).click();
  await expect(float).toHaveCSS("visibility", "hidden");
  await page.keyboard.press("Escape");
  await expect(float).toHaveCSS("visibility", "visible");

  await message(page).pressSequentially("@a");
  await expect(page.getByRole("listbox", { name: "Mentions" })).toBeVisible();
  await expect(float).toHaveCSS("visibility", "hidden");
  await page.keyboard.press("Escape");
  await expect(float).toHaveCSS("visibility", "visible");

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(chip).toHaveCount(0);
});

test("toolbar buttons never submit the prompt", async ({ page }) => {
  await message(page).fill("draft");
  await page.getByRole("button", { name: "Voice" }).click();
  await expect(events(page)).toHaveText("voice");
  await expect(message(page)).toHaveValue("draft");
});

test.describe("inside a dialog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/prompt-input-toolbar-dialog");
  });

  test("Escape in the add menu closes the menu, not the dialog", async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog", { name: "Ask" });
    await add(page).click();
    const menu = page.getByRole("menu", { name: "Add" });
    await expect(
      page.getByRole("menuitem", { name: "Add files" }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(add(page)).toBeFocused();
    await expect(dialog).toBeVisible();

    await model(page).focus();
    await page.keyboard.press("Enter");
    const list = page.getByRole("listbox", { name: "Model" });
    await expect(list).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(list).toBeHidden();
    await expect(model(page)).toBeFocused();
    await expect(dialog).toBeVisible();
  });

  test("beside the suggestion list, Escape closes the list, then a host-opened popup, then the dialog", async ({
    page,
  }) => {
    const dialog = page.getByRole("dialog", { name: "Ask" });
    const models = page.getByRole("listbox", { name: "Model" });
    const mentions = page.getByRole("listbox", { name: "Mentions" });
    await page.getByRole("button", { name: "Open models" }).click();
    await expect(models).toBeVisible();
    await message(page).pressSequentially("@a");
    await expect(mentions).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(mentions).toBeHidden();
    await expect(models).toBeVisible();
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(models).toBeHidden();
    await expect(message(page)).toBeFocused();
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(events(page)).toHaveText("dialog-closed");
  });
});
