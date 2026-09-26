import { expect, test } from "@playwright/test";

test("the host renders a component from the built package", async ({ page }) => {
  await page.goto("/smoke");
  await expect(page.getByRole("button", { name: "Ready" })).toBeVisible();
});
