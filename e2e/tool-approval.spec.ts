import { expect, test } from "@playwright/test";

import { watchFocusOnBody } from "./focus.js";

const DECISIONS = [
  ["Approve", "approved:once", "Approved once"],
  ["Approve always", "approved:always", "Approved always"],
  ["Deny", "rejected:once", "Denied"],
] as const;

for (const [button, event, outcome] of DECISIONS) {
  test(`${button} records its decision once and folds the call`, async ({
    page,
  }) => {
    await page.goto("/tool-approval");
    const approval = page.getByRole("region", { name: "Needs your approval" });
    await expect(approval).toBeVisible();
    await expect(approval).toContainText("mail__send");

    await page.getByRole("button", { name: button, exact: true }).click();

    await expect(page.getByRole("status", { name: "Events" })).toHaveText(
      event,
    );
    await expect(approval).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
    // The settled call joins the run before it; opened, it shows the outcome.
    const run = page.getByRole("button", { name: "Worked through 2 steps" });
    await run.click();
    await expect(page.getByText(outcome, { exact: true })).toBeVisible();
  });
}

test("the decision works from the keyboard", async ({ page }) => {
  await page.goto("/tool-approval");
  // The finished run's line comes first, then the input box, then Approve.
  await page.getByRole("button", { name: "Worked through 1 step" }).focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Approve", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status", { name: "Events" })).toHaveText(
    "approved:always",
  );
});

for (const [button, key] of [
  ["Approve", "Enter"],
  ["Approve always", "Space"],
  ["Deny", "Enter"],
] as const) {
  test(`${button} by keyboard never leaves focus on the page`, async ({
    page,
  }) => {
    await page.goto("/tool-approval");
    await page.getByRole("button", { name: button, exact: true }).focus();
    const stop = await watchFocusOnBody(page);
    await page.keyboard.press(key);

    // The call folds into the run before it; focus goes to that run's line.
    const run = page.getByRole("button", { name: "Worked through 2 steps" });
    await expect(run).toBeFocused();
    expect(await stop()).toBe(0);
  });
}

test("in a batch, a keyboard decision moves to the next waiting call, then to the run", async ({
  page,
}) => {
  await page.goto("/tool-batch-approval");
  const waiting = page.locator(
    "[data-slot='tool-approval'][data-status='pending']",
  );
  await expect(waiting).toHaveCount(2);
  await waiting
    .first()
    .getByRole("button", { name: "Deny", exact: true })
    .focus();
  const stop = await watchFocusOnBody(page);

  await page.keyboard.press("Enter");
  await expect(waiting).toHaveCount(1);
  await expect(waiting).toContainText("send__calendar");
  await expect(
    waiting.getByRole("button", { name: "Approve", exact: true }),
  ).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(waiting).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Worked through 4 steps" }),
  ).toBeFocused();
  expect(await stop()).toBe(0);
});
