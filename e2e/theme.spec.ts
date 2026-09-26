import { expect, test } from "@playwright/test";

test("light tokens with no class on a light OS", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/theme");
  await expect(page.getByTestId("swatches")).toHaveScreenshot("light.png");
});

test("a .dark root applies the dark tokens", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/theme");
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await expect(page.getByTestId("swatches")).toHaveScreenshot("dark.png");
});

test("a classless root follows a dark OS", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/theme");
  await expect(page.getByTestId("swatches")).toHaveScreenshot("dark.png");
});

test("ThemeToggle flips the tokens from light to dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/theme-toggle");
  await expect(page.getByTestId("swatches")).toHaveScreenshot("light.png");
  await page.getByRole("button", { name: "Light theme" }).click();
  await expect(page.getByTestId("swatches")).toHaveScreenshot("dark.png");
});
