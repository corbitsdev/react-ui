// Reads and drives the conversation scroll container the e2e scenarios render.
import { expect, type Page } from "@playwright/test";

export const container = (page: Page) =>
  page.locator("[data-slot='conversation-content']");

export const view = (page: Page) =>
  container(page).evaluate((element) => ({
    scrollTop: element.scrollTop,
    top: element.getBoundingClientRect().top,
    distanceFromEnd:
      element.scrollHeight - element.scrollTop - element.clientHeight,
  }));

/** How far an item's top sits below the top of the view. */
export const offsetOf = async (page: Page, id: string) => {
  const { top } = await view(page);
  const itemTop = await page
    .getByTestId(id)
    .evaluate((element) => element.getBoundingClientRect().top);
  return itemTop - top;
};

/** Waits for the view to stop moving (a glide or a wheel scroll to land). */
export const settled = async (page: Page) => {
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
export const wheel = async (page: Page, deltaY: number) => {
  const box = await container(page).boundingBox();
  if (box === null) throw new Error("expected the conversation on screen");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, deltaY);
  await settled(page);
};

export const atEnd = async (page: Page) => {
  await expect
    .poll(async () => (await view(page)).distanceFromEnd)
    .toBeLessThanOrEqual(1);
};

/** The id of the topmost item in view. */
export const firstVisible = (page: Page) =>
  container(page).evaluate((element) => {
    const top = element.getBoundingClientRect().top;
    const items = element.querySelectorAll<HTMLElement>("[data-testid]");
    for (const item of items) {
      if (item.getBoundingClientRect().bottom > top)
        return item.dataset.testid ?? "";
    }
    return "";
  });

/** Two frames: one for resize callbacks, one for any correction to land. */
export const frames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
