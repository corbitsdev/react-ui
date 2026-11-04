import { expect, test, type Page } from "@playwright/test";

import {
  container,
  offsetOf,
  settled,
  view,
  wheel,
} from "./conversation-helpers.js";

const tick = (page: Page, name: string) =>
  page
    .getByRole("navigation", { name: "Conversation map" })
    .getByRole("button", { name, exact: true });

const current = (page: Page) =>
  page.locator("[data-slot='conversation-map-tick'][aria-current='location']");

const scrollTop = async (page: Page) => (await view(page)).scrollTop;

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

/** Whether the rail overflows, has scrolled, and shows the current tick. */
const railState = (page: Page) =>
  page.locator("[data-slot='conversation-map-rail']").evaluate((element) => {
    const tick = element.querySelector("[aria-current='location']");
    const view = element.getBoundingClientRect();
    const box = tick?.getBoundingClientRect();
    return {
      overflows: element.scrollHeight > element.clientHeight,
      scrolled: element.scrollTop > 0,
      showsCurrent:
        box !== undefined &&
        box.top >= view.top - 1 &&
        box.bottom <= view.bottom + 1,
    };
  });

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
    // The rail overflows, and has scrolled to bring the last tick into view.
    await expect
      .poll(() => railState(page))
      .toEqual({ overflows: true, scrolled: true, showsCurrent: true });
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

  test("moving along the rail by keyboard scrolls only the rail", async ({
    page,
  }) => {
    await page.goto("/conversation-map-tall-page");
    await expect(current(page)).toHaveAccessibleName("Question 79");
    await expect
      .poll(() => railState(page))
      .toEqual({ overflows: true, scrolled: true, showsCurrent: true });
    // Focus the tab stop without scrolling, so the page is still at the top
    // and the map below the fold.
    await tick(page, "Question 79").evaluate((element) =>
      (element as HTMLElement).focus({ preventScroll: true }),
    );
    /** Whether the rail shows the focused tick. */
    const showsFocused = () =>
      page
        .locator("[data-slot='conversation-map-rail']")
        .evaluate((element) => {
          const view = element.getBoundingClientRect();
          const box = document.activeElement?.getBoundingClientRect();
          return (
            box !== undefined &&
            box.top >= view.top - 1 &&
            box.bottom <= view.bottom + 1
          );
        });

    await page.keyboard.press("Home");
    await expect(tick(page, "Question 0")).toBeFocused();
    await expect.poll(showsFocused).toBe(true);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await page.keyboard.press("End");
    await expect(tick(page, "Question 79")).toBeFocused();
    await expect.poll(showsFocused).toBe(true);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test("a rail that shrinks keeps the current tick in view", async ({
    page,
  }) => {
    await open(page);
    await expect(current(page)).toHaveAccessibleName("Question 19");
    expect(await railState(page)).toEqual({
      overflows: false,
      scrolled: false,
      showsCurrent: true,
    });
    // The host's layout shrinks the map's box below the rail's height.
    await page
      .getByRole("navigation", { name: "Conversation map" })
      .evaluate((element) => {
        element.style.height = "100px";
      });
    await expect(current(page)).toHaveAccessibleName("Question 19");
    await expect
      .poll(() => railState(page))
      .toEqual({ overflows: true, scrolled: true, showsCurrent: true });
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

const tickSizes = (page: Page) =>
  page.locator("[data-slot='conversation-map-tick']").evaluateAll((ticks) =>
    ticks.map((element) => {
      const box = element.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }),
  );

test("with a mouse the rail fits every turn", async ({ page }) => {
  await open(page);
  expect((await railState(page)).overflows).toBe(false);
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true, isMobile: true });

  test("every tick is a 24px target and the rail scrolls instead", async ({
    page,
  }) => {
    await open(page);
    for (const size of await tickSizes(page)) {
      expect(size.width).toBeGreaterThanOrEqual(24);
      expect(size.height).toBeGreaterThanOrEqual(24);
    }
    // The current tick, the last turn's, is scrolled into the rail's view.
    await expect
      .poll(() => railState(page))
      .toEqual({ overflows: true, scrolled: true, showsCurrent: true });
  });
});
