import { expect, test } from "@playwright/test";

test("Select carries its value, aria wiring and change events to the native control", async ({ page }) => {
  await page.goto("/select");
  const select = page.getByRole("combobox", { name: "Letter" });
  await expect(select).toHaveValue("a");
  await expect(select).toHaveAttribute("aria-invalid", "true");
  await expect(select).toHaveAttribute("aria-describedby", "letter-error");
  await select.selectOption("b");
  await expect(select).toHaveValue("b");
  await expect(page.getByRole("status", { name: "Events" })).toHaveText("b");
  await expect(page.getByRole("combobox", { name: "Locked" })).toBeDisabled();
});

test("FilterChip exposes its selected state through aria-pressed", async ({ page }) => {
  await page.goto("/filter-chip");
  const chip = page.getByRole("button", { name: "Live" });
  await expect(chip).toHaveAttribute("aria-pressed", "false");
  await chip.click();
  await expect(chip).toHaveAttribute("aria-pressed", "true");
});

test("DictationStatusLine announces a denial with default copy", async ({ page }) => {
  await page.goto("/dictation-denied");
  await expect(page.getByRole("alert")).toHaveText(/Microphone access was blocked\./);
});

test.describe("AuthLayout panel slot", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("the decorative panel is empty when panel is omitted", async ({ page }) => {
    await page.goto("/auth-layout");
    await expect(page.locator("[aria-hidden=true]").last()).toBeEmpty();
  });

  test("the panel renders the node it is given", async ({ page }) => {
    await page.goto("/auth-layout-panel");
    await expect(page.getByTestId("custom-panel")).toBeVisible();
  });
});
