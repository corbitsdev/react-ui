import { expect, test, type Page } from "@playwright/test";

const grain = (page: Page) =>
  page.locator("[data-slot='generated-image-grain']");

async function land(page: Page) {
  await page.goto("/media-viewer");
  await expect(
    page.locator("[data-slot='generated-image-placeholder']"),
  ).toHaveCount(3);
  await expect(page.getByRole("status")).toHaveText("Generating 3 images");
  await page.getByRole("button", { name: "Land images" }).click();
}

test("images made while watched are revealed by the grain", async ({
  page,
}) => {
  await land(page);
  await expect(grain(page)).toHaveCount(3);
  await expect(page.getByRole("status")).toHaveText("Made 3 images");
  // The reveal is one 700ms pass per tile, cascading 90ms apart.
  await expect(grain(page)).toHaveCount(0, { timeout: 3_000 });
  const tiles = page.locator("[data-slot='generated-image']");
  await expect(tiles).toHaveCount(3);
  for (const tile of await tiles.all()) {
    await expect(tile).toHaveAttribute("data-state", "loaded");
  }
});

test("with reduced motion, landed images skip the grain", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await land(page);
  await expect(
    page.locator("[data-slot='generated-image'][data-state='loaded']"),
  ).toHaveCount(3);
  await expect(grain(page)).toHaveCount(0);
});

test("arrow keys move between items, Escape closes, focus returns to the tile", async ({
  page,
}) => {
  await land(page);
  await expect(grain(page)).toHaveCount(0, { timeout: 3_000 });
  const tile = page.getByRole("button", {
    name: "Open Swatch 2",
    exact: true,
  });
  await tile.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("three-swatches-2.svg");
  await expect(page.getByRole("button", { name: "Close" })).toBeFocused();
  await expect(dialog.getByRole("img")).toHaveAttribute("alt", "Swatch 2");

  await page.keyboard.press("ArrowRight");
  await expect(dialog).toHaveAccessibleName("three-swatches-3.svg");
  await expect(dialog.getByRole("status")).toHaveText(
    "three-swatches-3.svg, 3 of 3",
  );
  // Stepping stops at the ends rather than wrapping.
  await page.keyboard.press("ArrowRight");
  await expect(dialog).toHaveAccessibleName("three-swatches-3.svg");
  await expect(dialog.getByRole("button", { name: "Next" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog).toHaveAccessibleName("three-swatches-1.svg");
  await page.keyboard.press("ArrowLeft");
  await expect(dialog).toHaveAccessibleName("three-swatches-1.svg");

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(tile).toBeFocused();
});

test("the viewer opens from the keyboard and closes from its button or the backdrop", async ({
  page,
}) => {
  await land(page);
  await expect(grain(page)).toHaveCount(0, { timeout: 3_000 });
  const tile = page.getByRole("button", {
    name: "Open Swatch 3",
    exact: true,
  });
  await tile.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("three-swatches-3.svg");
  await dialog.getByRole("button", { name: "Previous" }).click();
  await expect(dialog).toHaveAccessibleName("three-swatches-2.svg");
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(tile).toBeFocused();

  // The action button opens it too, and a click outside the media closes it.
  const action = page.getByRole("button", {
    name: "Open Swatch 1 full size",
  });
  await action.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveAccessibleName(
    "three-swatches-1.svg",
  );
  await page.mouse.click(4, 4);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(action).toBeFocused();
});

const REMOTE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="gray"/></svg>';

async function openRemote(page: Page) {
  await page
    .context()
    .route("https://images.example.test/**", (route) =>
      route.fulfill({ contentType: "image/svg+xml", body: REMOTE_SVG }),
    );
  await page.goto("/media-viewer-chat");
  await page
    .getByRole("button", { name: "Open Remote 2", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName("remote-swatches-2.svg");
  return dialog;
}

const scrolls = (page: Page) =>
  page.evaluate(() => ({
    page: document.scrollingElement?.scrollTop ?? 0,
    log: document.querySelector("[data-testid='log']")?.scrollTop ?? 0,
  }));

test("with the viewer open, the wheel scrolls neither the page nor the log behind it", async ({
  page,
}) => {
  await openRemote(page);
  const before = await scrolls(page);
  expect(before.log).toBeGreaterThan(0);
  // Over the backdrop, the picture and the bar, in both directions.
  for (const [x, y] of [
    [640, 360],
    [20, 20],
    [640, 640],
  ] as const) {
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, 800);
    await page.mouse.wheel(0, -400);
  }
  await page.waitForTimeout(300);
  expect(await scrolls(page)).toEqual(before);

  // Closing hands scrolling back to the page.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.style.overflow),
  ).toBe("");
  await page.mouse.move(640, 700);
  await page.mouse.wheel(0, 400);
  await expect
    .poll(async () => (await scrolls(page)).page)
    .toBeGreaterThan(before.page);
});

test("Download of an image from another origin leaves the chat in place", async ({
  page,
}) => {
  const dialog = await openRemote(page);
  const popup = page.waitForEvent("popup");
  await dialog
    .getByRole("link", { name: "Download remote-swatches-2.svg" })
    .click();
  await popup;
  expect(new URL(page.url()).pathname).toBe("/media-viewer-chat");
  await expect(dialog).toBeVisible();
});
