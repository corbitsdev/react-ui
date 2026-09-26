import { expect, test } from "@playwright/test";

test("arrow keys move the selection and Enter fires the command", async ({ page }) => {
  await page.goto("/command-palette");
  await page.getByRole("button", { name: "Open palette" }).click();
  const input = page.getByRole("combobox");
  await expect(input).toBeFocused();
  await expect(page.getByRole("option", { name: "Settings" })).toHaveAttribute("aria-selected", "true");

  await input.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Billing" })).toHaveAttribute("aria-selected", "true");
  await input.press("ArrowDown");
  await input.press("ArrowUp");
  await input.press("Enter");

  await expect(page.getByRole("status", { name: "Events" })).toHaveText("billing");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("button", { name: "Open palette" })).toBeFocused();
});

test("Tab stays inside the open dialog and Escape returns focus to the trigger", async ({ page }) => {
  await page.goto("/command-palette");
  const trigger = page.getByRole("button", { name: "Open palette" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  for (let press = 0; press < 5; press += 1) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
