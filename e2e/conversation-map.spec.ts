import { expect, test, type Page } from "@playwright/test";

const container = (page: Page) =>
  page.locator("[data-slot='conversation-content']");

const tick = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Conversation map" })
    .getByRole("button", { name, exact: true });

const current = (page: Page) =>
  page.locator("[data-slot='conversation-map-tick'][aria-current='location']");

const scrollTop = (page: Page) =>
  container(page).evaluate((element) => element.scrollTop);

/** Waits for the view to stop moving (a glide or a wheel scroll to land). */
const settled = async (page: Page) => {
  let previous = Number.NaN;
  await expect
    .poll(
      async () => {
        const now = await scrollTop(page);
        const still = now === previous;
        previous = now;
        return still;
      },
      { intervals: [100] },
    )
    .toBe(true);
};

/** How far an item's top sits below the top of the view. */
const offsetOf = (page: Page, id: string) =>
  container(page).evaluate((element, itemId) => {
    const item = element.querySelector(`[data-testid='${itemId}']`);
    if (item === null) throw new Error(`no item ${itemId}`);
    return (
      item.getBoundingClientRect().top - element.getBoundingClientRect().top
    );
  }, id);

/** The turn whose question last crossed a line a third of the way down. */
const turnOnReadingLine = (page: Page) =>
  container(page).evaluate((element) => {
    const view = element.getBoundingClientRect();
    const line = view.top + view.height / 3;
    let reading = "";
    for (let index = 0; index < 20; index += 1) {
      const start = element.querySelector(`[data-testid='t${index}']`);
      if (start !== null && start.getBoundingClientRect().top <= line) {
        reading = `Question ${index}`;
      }
    }
    return reading;
  });

const wheel = async (page: Page, deltaY: number) => {
  const box = await container(page).boundingBox();
  if (box === null) throw new Error("expected the conversation on screen");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, deltaY);
  await settled(page);
};

const open = async (page: Page) => {
  await page.goto("/conversation-map");
  await expect(page.getByTestId("t19a")).toBeAttached();
  await expect
    .poll(() =>
      container(page).evaluate(
        (element) =>
          element.scrollHeight - element.scrollTop - element.clientHeight,
      ),
    )
    .toBeLessThanOrEqual(1);
};

test.describe("conversation map", () => {
  test("shows one tick per turn, the last turn current at the end", async ({
    page,
  }) => {
    await open(page);
    await expect(
      page.locator("[data-slot='conversation-map-tick']"),
    ).toHaveCount(20);
    await expect(current(page)).toHaveAccessibleName("Question 19");
    await expect(tick(page, "Question 18")).toHaveAttribute("data-visible", "");
    await expect(tick(page, "Question 0")).not.toHaveAttribute("data-visible");
  });

  test("pointing at a tick previews its turn", async ({ page }) => {
    await open(page);
    await tick(page, "Question 3").hover();
    const card = page.getByRole("tooltip");
    await expect(card).toContainText("Question 3");
    await expect(card).toContainText("Answer 3");
    await expect(tick(page, "Question 3")).toHaveAccessibleDescription(
      "Answer 3",
    );
    await page.mouse.move(400, 380);
    await expect(card).toBeHidden();
  });

  test("clicking a tick brings its turn to the top of the view", async ({
    page,
  }) => {
    await open(page);
    await tick(page, "Question 5").click();
    await settled(page);
    expect(Math.abs(await offsetOf(page, "t5"))).toBeLessThanOrEqual(1);
    await expect(current(page)).toHaveAccessibleName("Question 5");
  });

  test("the keyboard reaches the current tick; arrows and Enter jump", async ({
    page,
  }) => {
    await open(page);
    // The rail comes just before the log in the tab order.
    await container(page).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(tick(page, "Question 19")).toBeFocused();
    for (let step = 0; step < 9; step += 1) {
      await page.keyboard.press("ArrowUp");
    }
    await expect(tick(page, "Question 10")).toBeFocused();
    await page.keyboard.press("Enter");
    await settled(page);
    expect(Math.abs(await offsetOf(page, "t10"))).toBeLessThanOrEqual(1);
    await expect(current(page)).toHaveAccessibleName("Question 10");
    await expect(tick(page, "Question 10")).toBeFocused();
  });

  test("the current tick follows scrolling", async ({ page }) => {
    await open(page);
    await wheel(page, -700);
    const first = await turnOnReadingLine(page);
    expect(first).not.toBe("Question 19");
    await expect(current(page)).toHaveAccessibleName(first);

    await wheel(page, -500);
    const second = await turnOnReadingLine(page);
    expect(second).not.toBe(first);
    await expect(current(page)).toHaveAccessibleName(second);
  });

  test("keeping the current tick in view scrolls only the rail", async ({
    page,
  }) => {
    await page.goto("/conversation-map-tall-page");
    await expect(page.getByTestId("t79a")).toBeAttached();
    await expect(current(page)).toHaveAccessibleName("Question 79");
    const rail = page.locator("[data-slot='conversation-map-rail']");
    // The rail overflows, and has scrolled to bring the last tick into view.
    await expect
      .poll(() =>
        rail.evaluate((element) => {
          const tick = element.querySelector("[aria-current='location']");
          if (tick === null) return false;
          const view = element.getBoundingClientRect();
          const box = tick.getBoundingClientRect();
          return (
            element.scrollHeight > element.clientHeight &&
            element.scrollTop > 0 &&
            box.top >= view.top - 1 &&
            box.bottom <= view.bottom + 1
          );
        }),
      )
      .toBe(true);
    // Give any late scroll a few frames to land.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let frames = 10;
          const step = () => {
            frames -= 1;
            if (frames === 0) resolve();
            else requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }),
    );
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("moving along an overflowing rail keeps the preview open", async ({
    page,
  }) => {
    await page.goto("/conversation-map-tall-page");
    await expect(current(page)).toHaveAccessibleName("Question 79");
    const card = page.getByRole("tooltip");
    /** The focused tick, its preview showing and describing it. */
    const previewed = async (index: number) => {
      const focused = tick(page, `Question ${index}`);
      await expect(focused).toBeFocused();
      await expect(card).toBeVisible();
      await expect(card).toContainText(`Question ${index}`);
      await expect(focused).toHaveAccessibleDescription(`Answer ${index}`);
    };

    await tick(page, "Question 79").focus();
    await previewed(79);
    await page.keyboard.press("Home");
    await previewed(0);
    await page.keyboard.press("End");
    await previewed(79);
    for (let index = 78; index >= 0; index -= 1) {
      await page.keyboard.press("ArrowUp");
      await previewed(index);
    }
  });

  test("clicking inside a jumped-to turn keeps it current", async ({
    page,
  }) => {
    await open(page);
    await wheel(page, -900);
    await tick(page, "Question 18").click();
    await settled(page);
    await expect(current(page)).toHaveAccessibleName("Question 18");
    const before = await scrollTop(page);

    await page.getByTestId("t18").getByText("Question 18").click();
    await settled(page);
    expect(await scrollTop(page)).toBe(before);
    await expect(current(page)).toHaveAccessibleName("Question 18");
  });

  test("a turn the view cannot bring to the top stays current", async ({
    page,
  }) => {
    await open(page);
    await wheel(page, -900);
    await tick(page, "Question 18").click();
    await settled(page);
    // The end clamps the glide: the turn is on screen, below the top.
    expect(await offsetOf(page, "t18")).toBeGreaterThan(1);
    await expect(current(page)).toHaveAccessibleName("Question 18");

    // The reader moving on releases it to the reading position.
    await wheel(page, -300);
    await expect(current(page)).toHaveAccessibleName(
      await turnOnReadingLine(page),
    );
  });
});
