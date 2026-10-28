import { expect, test, type Page } from "@playwright/test";

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
  // The next call's card, not its Approve: Enter on it decides nothing.
  await expect(
    page.getByRole("region", { name: "Needs your approval send__calendar" }),
  ).toBeFocused();

  await waiting.getByRole("button", { name: "Approve", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(waiting).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Worked through 4 steps" }),
  ).toBeFocused();
  expect(await stop()).toBe(0);
});

test("in a group, keyboard decisions keep focus inside it", async ({
  page,
}) => {
  await page.goto("/tool-group-approval");
  const waiting = page.locator(
    "[data-slot='tool-approval'][data-status='pending']",
  );
  await expect(waiting).toHaveCount(2);
  await waiting
    .first()
    .getByRole("button", { name: "Approve", exact: true })
    .focus();
  // Counts the frames on which focus sat on the page instead of an element.
  await page.evaluate(() => {
    const watched = window as Window & { bodyFrames?: number };
    watched.bodyFrames = 0;
    const tick = () => {
      const active = document.activeElement;
      if (active === null || active === document.body)
        watched.bodyFrames = (watched.bodyFrames ?? 0) + 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const bodyFrames = () =>
    page.evaluate(
      () => (window as Window & { bodyFrames?: number }).bodyFrames,
    );

  // A held Enter: the first press decides, the repeat lands on what has focus.
  await page.keyboard.down("Enter");
  await expect(page.getByRole("status", { name: "Events" })).toHaveText(
    "mail__send:approved:once",
  );
  await expect(waiting).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: "Needs your approval calendar__invite" }),
  ).toBeFocused();
  await page.keyboard.down("Enter");
  await page.keyboard.up("Enter");
  await expect(waiting).toHaveCount(1);
  await expect(page.getByRole("status", { name: "Events" })).toHaveText(
    "mail__send:approved:once",
  );

  await waiting.getByRole("button", { name: "Approve", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(waiting).toHaveCount(0);
  const header = page.locator("[data-slot='tool-group-header']");
  await expect(header).toHaveAttribute("aria-expanded", "true");
  const outcome = page.getByRole("group", {
    name: "Approved once calendar__invite",
  });
  await expect(outcome).toBeFocused();
  // Let a few more frames pass before reading the count.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let left = 5;
        const step = () =>
          --left === 0 ? resolve() : requestAnimationFrame(step);
        requestAnimationFrame(step);
      }),
  );
  expect(await bodyFrames()).toBe(0);
});

/** The server resolves a call nobody decided, the way the fixture hears it. */
function lapse(
  page: Page,
  toolCallId: string,
  status: "timeout" | "expired",
): Promise<void> {
  return page.evaluate(
    (detail) =>
      void window.dispatchEvent(new CustomEvent("approval-lapse", { detail })),
    { toolCallId, status },
  );
}

for (const status of ["timeout", "expired"] as const) {
  test(`a call that ends ${status} under keyboard focus hands focus to the run`, async ({
    page,
  }) => {
    await page.goto("/tool-approval");
    await page.getByRole("button", { name: "Approve", exact: true }).focus();
    const stop = await watchFocusOnBody(page);
    await lapse(page, "send", status);

    await expect(
      page.locator("[data-slot='tool-approval'][data-status='pending']"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Worked through 2 steps" }),
    ).toBeFocused();
    expect(await stop()).toBe(0);
  });
}

test("in a batch, calls that time out under focus hand it on, then to the run", async ({
  page,
}) => {
  await page.goto("/tool-batch-approval");
  const waiting = page.locator(
    "[data-slot='tool-approval'][data-status='pending']",
  );
  await waiting
    .first()
    .getByRole("button", { name: "Deny", exact: true })
    .focus();
  const stop = await watchFocusOnBody(page);

  await lapse(page, "notice", "timeout");
  await expect(waiting).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: "Needs your approval send__calendar" }),
  ).toBeFocused();

  await lapse(page, "calendar", "expired");
  await expect(waiting).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Worked through 4 steps" }),
  ).toBeFocused();
  expect(await stop()).toBe(0);
});
