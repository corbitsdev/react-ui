import { expect, test } from "@playwright/test";

const color = (page: import("@playwright/test").Page) =>
  page.getByText("Thinking").evaluate((node) => getComputedStyle(node).color);

test("ShimmerText clips a gradient by default", async ({ page }) => {
  await page.goto("/shimmer");
  expect(await color(page)).toBe("rgba(0, 0, 0, 0)");
});

test("ShimmerText falls back to solid text under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/shimmer");
  expect(await color(page)).not.toBe("rgba(0, 0, 0, 0)");
});

test("ShimmerText falls back to solid text under forced colors", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/shimmer");
  expect(await color(page)).not.toBe("rgba(0, 0, 0, 0)");
});

test("ThinkingMark echo drops its second wave under reduced motion", async ({ page }) => {
  await page.goto("/thinking-mark");
  const displays = () =>
    page
      .locator(".corbits-thinking-echo")
      .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).display));
  expect(await displays()).toEqual(["inline", "inline"]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await displays()).toEqual(["inline", "none"]);
});

test("paused ThinkingMark freezes every animation", async ({ page }) => {
  await page.goto("/thinking-mark-paused");
  const states = await page
    .locator("svg *")
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).animationPlayState));
  expect(states.length).toBeGreaterThan(0);
  expect(new Set(states)).toEqual(new Set(["paused"]));
});
