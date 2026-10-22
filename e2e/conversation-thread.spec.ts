import { expect, test, type Page } from "@playwright/test";

const log = (page: Page) =>
  page.locator("[data-slot='conversation-thread'] [role='log']");

const reply = (page: Page) => page.getByRole("textbox", { name: "Reply" });

const scrollTop = (page: Page) =>
  log(page).evaluate((element) => element.scrollTop);

/** How far an item's top sits below the top of the thread's view. */
const offsetOf = (page: Page, id: string) =>
  log(page).evaluate((element, itemId) => {
    const item = element.querySelector(`[data-item-id='${itemId}']`);
    if (item === null) throw new Error(`no item ${itemId}`);
    return (
      item.getBoundingClientRect().top - element.getBoundingClientRect().top
    );
  }, id);

/** Waits for the view to stop moving. */
const settled = async (page: Page) => {
  let previous = Number.NaN;
  await expect
    .poll(
      async () => {
        const current = await scrollTop(page);
        const still = current === previous;
        previous = current;
        return still;
      },
      { intervals: [100] },
    )
    .toBe(true);
};

const openThread = async (page: Page) => {
  await page.goto("/conversation-thread");
  await page.getByRole("button", { name: /12 replies/ }).click();
  await expect(page.getByRole("tab", { name: "Thread" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(log(page)).toHaveAttribute("aria-label", "Thread");
  await settled(page);
};

test("a draft and the scroll position in a thread tab survive switching tabs", async ({
  page,
}) => {
  await openThread(page);
  // The thread opens at its latest reply.
  await expect(log(page).locator("[data-item-id='reply-12']")).toBeInViewport();
  // The thread's log scrolls, not the pane around it.
  const pane = await log(page).evaluate((element) => {
    const host = element.closest("[data-slot='panel-pane']");
    if (host === null) throw new Error("the thread is not in a pane");
    return { scrollHeight: host.scrollHeight, clientHeight: host.clientHeight };
  });
  expect(pane.scrollHeight).toBe(pane.clientHeight);
  await reply(page).fill("A draft for later");
  const before = await scrollTop(page);
  expect(before).toBeGreaterThan(0);

  await page.getByRole("tab", { name: "Notes" }).click();
  await expect(page.getByText("Notes pane")).toBeVisible();
  await expect(reply(page)).toBeHidden();

  await page.getByRole("tab", { name: "Thread" }).click();
  await expect(reply(page)).toBeVisible();
  await expect(reply(page)).toHaveValue("A draft for later");
  expect(await scrollTop(page)).toBe(before);
});

test("sending in the thread settles the sent reply at the top", async ({
  page,
}) => {
  await openThread(page);
  await reply(page).fill("Add owners to the follow-ups");
  await reply(page).press("Enter");

  await expect(reply(page)).toHaveValue("");
  await expect
    .poll(async () => Math.abs(await offsetOf(page, "sent-1")))
    .toBeLessThanOrEqual(1);
  await settled(page);
  expect(Math.abs(await offsetOf(page, "sent-1"))).toBeLessThanOrEqual(1);
  await expect(log(page).locator("[data-item-id='answer-1']")).toBeVisible();
});
