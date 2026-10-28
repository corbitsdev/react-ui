import { expect, test, type Locator, type Page } from "@playwright/test";

const scroller = (page: Page) => page.getByTestId("scroller");

const toggle = (page: Page) =>
  page.locator("[data-slot='message-fold-toggle']");

/** How far the fold control sits below the top of the scroll container. */
const toggleOffset = async (page: Page) => {
  const box = await scroller(page).evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  const top = await toggle(page).evaluate(
    (element) => element.getBoundingClientRect().top,
  );
  return top - box;
};

/** Waits for the container to stop moving. */
const settled = async (page: Page) => {
  let previous = Number.NaN;
  await expect
    .poll(
      async () => {
        const top = await scroller(page).evaluate(
          (element) => element.scrollTop,
        );
        const still = top === previous;
        previous = top;
        return still;
      },
      { intervals: [100] },
    )
    .toBe(true);
};

/** Scrolls as the reader would, with the wheel, to put `contentTop` (a
 * position inside the answer) at the top of the view. */
const readInto = async (page: Page, contentTop: number) => {
  const answerTop = await page
    .getByTestId("long-answer")
    .evaluate((element, scrollerTop) => {
      const container = element.closest("[data-testid='scroller']");
      if (container === null) throw new Error("expected the scroller");
      return (
        element.getBoundingClientRect().top -
        container.getBoundingClientRect().top +
        container.scrollTop -
        scrollerTop
      );
    }, 0);
  const current = await scroller(page).evaluate((element) => element.scrollTop);
  const box = await scroller(page).boundingBox();
  if (box === null) throw new Error("expected the scroller on screen");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, answerTop + contentTop - current);
  await settled(page);
};

/** Opens the answer, reads into the middle of it, and folds it from there:
 * the control must stay where it was on screen. */
const foldFromInside = async (page: Page) => {
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
  await readInto(page, 900);
  const before = await toggleOffset(page);
  const height = await scroller(page).evaluate(
    (element) => element.clientHeight,
  );
  // Open, the control rides the bottom of the view while the answer is read.
  expect(before).toBeGreaterThan(height / 2);
  expect(before).toBeLessThan(height);

  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
  await settled(page);
  const after = await toggleOffset(page);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(1);
};

test("folding an answer from inside it keeps the reader's place", async ({
  page,
}) => {
  await page.goto("/message-fold");
  await expect(toggle(page)).toHaveText(/Show full answer/);
  await foldFromInside(page);
});

for (const policy of ["settle", "stick"]) {
  test(`folding inside a conversation (${policy}) keeps the reader's place`, async ({
    page,
  }) => {
    await page.goto(`/message-fold-${policy}`);
    await expect(toggle(page)).toBeAttached();
    await foldFromInside(page);
  });
}

const row = (page: Page, id: string) => page.getByTestId(id);
const trigger = (scope: Locator) =>
  scope.getByRole("button", { name: "More actions" });
const menu = (scope: Locator) =>
  scope.getByRole("menu", { name: "More actions" });
const item = (scope: Locator, name: string) =>
  scope.getByRole("menuitem", { name });

test("a pressed action differs from a hovered one by more than colour", async ({
  page,
}) => {
  await page.goto("/message-actions");
  const top = row(page, "top");
  const pressed = top.getByRole("button", { name: "Good response" });
  const hovered = top.getByRole("button", { name: "Bad response" });
  await hovered.hover();
  const shadow = (button: Locator) =>
    button.evaluate((element) => getComputedStyle(element).boxShadow);
  // The pressed action carries an inset outline that hover does not draw.
  expect(await shadow(pressed)).toContain("inset");
  expect(await shadow(hovered)).not.toContain("inset");
});

test("the overflow menu works from the keyboard and returns focus", async ({
  page,
}) => {
  await page.goto("/message-actions");
  const top = row(page, "top");
  await trigger(top).focus();
  await page.keyboard.press("Enter");
  await expect(menu(top)).toBeVisible();
  await expect(trigger(top)).toHaveAttribute("aria-expanded", "true");
  await expect(item(top, "Pin")).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(item(top, "Copy link")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(item(top, "Pin")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(item(top, "Report")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(item(top, "Pin")).toBeFocused();
  await page.keyboard.press("End");
  await expect(item(top, "Report")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(menu(top)).toHaveCount(0);
  await expect(trigger(top)).toBeFocused();
  await expect(trigger(top)).toHaveAttribute("aria-expanded", "false");
});

test("ArrowUp on the trigger opens the menu on its last item", async ({
  page,
}) => {
  await page.goto("/message-actions");
  const top = row(page, "top");
  await trigger(top).focus();
  await page.keyboard.press("ArrowUp");
  await expect(item(top, "Report")).toBeFocused();
});

test("choosing an item runs it, closes the menu and refocuses the trigger", async ({
  page,
}) => {
  await page.goto("/message-actions");
  const top = row(page, "top");
  await trigger(top).focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status", { name: "Events" })).toHaveText("link");
  await expect(menu(top)).toHaveCount(0);
  await expect(trigger(top)).toBeFocused();
});

test("focus leaving the menu closes it", async ({ page }) => {
  await page.goto("/message-actions");
  const top = row(page, "top");
  await trigger(top).click();
  await expect(item(top, "Pin")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menu(top)).toHaveCount(0);
});

test("a menu that would be clipped below opens above", async ({ page }) => {
  await page.goto("/message-actions");
  const bottom = row(page, "bottom");
  await trigger(bottom).click();
  const content = menu(bottom);
  await expect(content).toBeVisible();
  await expect(content).toHaveAttribute("data-side", "top");
  const clip = await page.getByTestId("clipped").boundingBox();
  const box = await content.boundingBox();
  if (clip === null || box === null) throw new Error("expected both boxes");
  expect(box.y).toBeGreaterThanOrEqual(clip.y);
  expect(box.y + box.height).toBeLessThanOrEqual(clip.y + clip.height);
});
