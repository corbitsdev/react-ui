import { expect, test, type Page } from "@playwright/test";

const container = (page: Page) =>
  page.locator("[data-slot='conversation-content']");

const marker = (page: Page) =>
  page.locator("[data-slot='conversation-earlier']");

const shown = (page: Page) => page.getByRole("status", { name: "Shown" });

const requests = (page: Page) => page.getByRole("status", { name: "Requests" });

const view = (page: Page) =>
  container(page).evaluate((element) => ({
    scrollTop: element.scrollTop,
    top: element.getBoundingClientRect().top,
    distanceFromEnd:
      element.scrollHeight - element.scrollTop - element.clientHeight,
  }));

/** How far an item's top sits below the top of the view. */
const offsetOf = async (page: Page, id: string) => {
  const { top } = await view(page);
  const itemTop = await page
    .getByTestId(id)
    .evaluate((element) => element.getBoundingClientRect().top);
  return itemTop - top;
};

/** Waits for the view to stop moving (a glide or a wheel scroll to land). */
const settled = async (page: Page) => {
  let previous = Number.NaN;
  await expect
    .poll(
      async () => {
        const { scrollTop } = await view(page);
        const still = scrollTop === previous;
        previous = scrollTop;
        return still;
      },
      { intervals: [100] },
    )
    .toBe(true);
};

/** The reader's own scroll: a wheel over the conversation. */
const wheel = async (page: Page, deltaY: number) => {
  const box = await container(page).boundingBox();
  if (box === null) throw new Error("expected the conversation on screen");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, deltaY);
  await settled(page);
};

const atEnd = async (page: Page) => {
  await expect
    .poll(async () => (await view(page)).distanceFromEnd)
    .toBeLessThanOrEqual(1);
};

/** Two frames: one for resize callbacks, one for any correction to land. */
const frames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );

/** The id of the topmost item in view. */
const firstVisible = (page: Page) =>
  container(page).evaluate((element) => {
    const top = element.getBoundingClientRect().top;
    const items = element.querySelectorAll<HTMLElement>("[data-testid]");
    for (const item of items) {
      if (item.getBoundingClientRect().bottom > top)
        return item.dataset.testid ?? "";
    }
    return "";
  });

const open = async (page: Page, scenario: string, last: string) => {
  await page.goto(`/${scenario}`);
  await expect(page.getByTestId(last)).toBeVisible();
  await atEnd(page);
};

const loadEarlier = (page: Page) =>
  page.getByRole("button", { name: "Load earlier", exact: true }).click();

/** Scrolls up a little and returns the item being read and where it sits. */
const readSomewhereUp = async (page: Page) => {
  await wheel(page, -300);
  const reading = await firstVisible(page);
  expect(reading).toMatch(/^r\d+$/);
  return { reading, offset: await offsetOf(page, reading) };
};

test.describe("in-memory history", () => {
  test("opens at the latest window of items", async ({ page }) => {
    await open(page, "history-window", "r99");
    await expect(shown(page)).toHaveText("30");
    await expect(page.getByTestId("r70")).toBeAttached();
    await expect(page.getByTestId("r69")).not.toBeAttached();
  });

  test("three loads in a row keep the item in view within 1px", async ({
    page,
  }) => {
    await open(page, "history-window", "r99");
    const { reading, offset } = await readSomewhereUp(page);
    for (const row of ["r60", "r50", "r40"]) {
      await loadEarlier(page);
      await expect(page.getByTestId(row)).toBeAttached();
      await frames(page);
      // Against the position before the first load, so drift cannot add up.
      expect(
        Math.abs((await offsetOf(page, reading)) - offset),
      ).toBeLessThanOrEqual(1);
    }
    await expect(shown(page)).toHaveText("60");
  });

  test("an append and a trim that cancel out keep the item in view within 1px", async ({
    page,
  }) => {
    await open(page, "history-window", "r99");
    // Away and back: the view no longer follows the end, so it keeps the
    // item being read, and the window is the latest 30 again.
    await wheel(page, -300);
    await wheel(page, 100_000);
    await atEnd(page);
    await expect(shown(page)).toHaveText("30");
    const reading = await firstVisible(page);
    const offset = await offsetOf(page, reading);
    const height = await container(page).evaluate(
      (element) => element.scrollHeight,
    );

    // Rows repeat every 3 and the window holds 30, so r100 is exactly as
    // tall as r70: the content never resizes, and no resize restores it.
    await page.getByRole("button", { name: "Append" }).click();
    await expect(page.getByTestId("r100")).toBeAttached();
    await expect(page.getByTestId("r70")).not.toBeAttached();
    await frames(page);
    expect(
      await container(page).evaluate((element) => element.scrollHeight),
    ).toBe(height);
    expect(
      Math.abs((await offsetOf(page, reading)) - offset),
    ).toBeLessThanOrEqual(1);
  });

  test("scrolled up, new items never trim the window; back at the end it trims", async ({
    page,
  }) => {
    await open(page, "history-window", "r99");
    const { reading, offset } = await readSomewhereUp(page);
    await loadEarlier(page);
    await expect(shown(page)).toHaveText("40");

    for (let count = 0; count < 3; count += 1) {
      await page.getByRole("button", { name: "Append" }).click();
    }
    await expect(shown(page)).toHaveText("43");
    await expect(page.getByTestId("r60")).toBeAttached();
    await frames(page);
    expect(
      Math.abs((await offsetOf(page, reading)) - offset),
    ).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Scroll to latest" }).click();
    await atEnd(page);
    await expect(shown(page)).toHaveText("30");
    await expect(page.getByTestId("r73")).toBeAttached();
    await expect(page.getByTestId("r72")).not.toBeAttached();
    await settled(page);
    await atEnd(page);
    await expect(page.getByTestId("r102")).toBeVisible();
  });
});

test.describe("server paging", () => {
  test("asks once per load, and three pages keep the item in view within 1px", async ({
    page,
  }) => {
    await open(page, "history-window-paged", "r49");
    await expect(shown(page)).toHaveText("20");
    const { reading, offset } = await readSomewhereUp(page);

    for (const [load, row] of [
      [1, "r20"],
      [2, "r10"],
      [3, "r0"],
    ] as const) {
      await loadEarlier(page);
      await expect(requests(page)).toHaveText(String(load));
      await expect(marker(page)).toHaveAttribute("data-state", "loading");
      await expect(marker(page)).toHaveText("Loading earlier messages…");
      // Asking again while the page is on its way does nothing.
      await loadEarlier(page);
      await frames(page);
      await expect(requests(page)).toHaveText(String(load));

      // The page lands above the window, then shows a step at a time.
      await page.getByRole("button", { name: "Deliver", exact: true }).click();
      await expect(marker(page)).toHaveAttribute("data-state", "idle");
      await loadEarlier(page);
      await expect(page.getByTestId(row)).toBeAttached();
      await frames(page);
      expect(
        Math.abs((await offsetOf(page, reading)) - offset),
      ).toBeLessThanOrEqual(1);
    }
    await expect(marker(page)).not.toBeAttached();
    await expect(requests(page)).toHaveText("3");
  });

  test("a load that brings nothing stops asking and offers a button", async ({
    page,
  }) => {
    await open(page, "history-window-paged", "r49");
    // At the very top the marker is in view, and asks by itself.
    await wheel(page, -100_000);
    await expect(requests(page)).toHaveText("1");
    await page.getByRole("button", { name: "Deliver nothing" }).click();

    const retry = page.getByRole("button", { name: "Load earlier messages" });
    await expect(retry).toBeVisible();
    await frames(page);
    await frames(page);
    await expect(requests(page)).toHaveText("1");

    await retry.focus();
    await page.keyboard.press("Enter");
    await expect(requests(page)).toHaveText("2");
    await expect(marker(page)).toHaveAttribute("data-state", "loading");
    // The button is gone; focus stays on the marker, not the page body.
    expect(
      await page.evaluate(() => document.activeElement === document.body),
    ).toBe(false);
    await expect(marker(page)).toBeFocused();
  });
});

test("scrolling up loads more before the reader reaches the top", async ({
  page,
}) => {
  await open(page, "history-window-reach", "r199");
  await expect(shown(page)).toHaveText("30");
  await wheel(page, -600);
  await expect
    .poll(async () => Number(await shown(page).textContent()))
    .toBeGreaterThan(30);
  // The marker asked ahead of the reader, who never reached the top.
  expect((await view(page)).scrollTop).toBeGreaterThan(0);
});
