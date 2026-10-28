import { expect, test, type Page } from "@playwright/test";

// The whole-chat composition lives in the story, so the spec drives the
// static Storybook build the accessibility sweep also serves.
const STORIES = "http://localhost:61000";

/** Where the page clock starts when a test drives it. */
const CLOCK_START = Date.parse("2026-03-04T12:00:00Z");
/** The story replays an answer one frame every this many milliseconds. */
const REPLAY_STEP_MS = 120;
/** More frames than the answer takes to reach its call. */
const MAX_REPLAY_STEPS = 20;

const open = async (page: Page, story: "settle" | "stick") => {
  await page.goto(
    `${STORIES}/iframe.html?id=chat-full-chat--${story}&viewMode=story&globals=theme:light`,
  );
  await page.locator("body.sb-show-main").waitFor({ state: "attached" });
};

const focused = (page: Page) =>
  page.evaluate(() => {
    const active = document.activeElement;
    return {
      body: active === null || active === document.body,
      slot: active instanceof HTMLElement ? active.dataset["slot"] : undefined,
      text: active?.textContent ?? "",
    };
  });

for (const [story, decision, outcome] of [
  ["settle", "Approve", "Approved once"],
  ["stick", "Deny", "Denied"],
] as const) {
  test(`${story}: deciding the waiting call by keyboard keeps focus on its run`, async ({
    page,
  }) => {
    await open(page, story);
    const approval = page.locator(
      "[data-slot='tool-approval'][data-status='pending']",
    );
    await expect(approval).toBeVisible();
    await approval.getByRole("button", { name: decision, exact: true }).focus();
    await page.keyboard.press("Enter");

    // The call folds into the run before it, and its buttons go with it.
    await expect(approval).toHaveCount(0);
    const active = await focused(page);
    expect(active.body).toBe(false);
    expect(active.slot).toBe("activity-trigger");
    expect(active.text).toContain("Worked through 2 steps");

    // The run opens from where focus landed and shows the outcome.
    await page.keyboard.press("Enter");
    const run = page.locator("[data-slot='activity-content']").last();
    await expect(run.getByText("mail__send").first()).toBeVisible();
    await expect(run.getByText(outcome)).toBeVisible();
  });
}

test("an answer's sources show as links under it", async ({ page }) => {
  await open(page, "settle");
  const sources = page
    .getByRole("log", { name: "Conversation" })
    .getByRole("list", { name: "Sources" });
  await expect(sources).toHaveCount(1);
  await expect(
    sources.getByRole("link", { name: /Retry cap change/ }),
  ).toHaveAttribute("href", "https://example.com/changes/retry-cap");
  await expect(sources.locator("[data-slot='source']")).toHaveCount(2);
});

test("a refused file is read out from a status line already in place", async ({
  page,
}) => {
  await open(page, "settle");
  const box = page.locator("[data-slot='attachment-drop-zone']");
  // The box's own line, not the form's: in the accessibility tree while
  // empty, so filling it is announced.
  const status = box.getByRole("status").and(box.locator("p"));
  await expect(status).toHaveText("");
  await page.locator("input[type='file']").setInputFiles({
    name: "export.bin",
    mimeType: "application/octet-stream",
    buffer: Buffer.alloc(6 * 1024 * 1024),
  });
  await expect(status).toHaveText("export.bin is over 5 MB");
});

test("a send takes the attached file into the message and clears the box", async ({
  page,
}) => {
  await open(page, "settle");
  await page.locator("input[type='file']").setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Follow-ups for next week"),
  });
  const box = page.locator("[data-slot='attachment-drop-zone']");
  await expect(
    box.getByRole("button", { name: "Remove notes.txt" }),
  ).toBeVisible();

  const message = page.getByRole("textbox", { name: "Message" });
  await message.fill("Here are my notes");
  await message.press("Enter");

  await expect(message).toHaveValue("");
  await expect(box.locator("[data-slot='attachments']")).toHaveCount(0);
  const log = page.getByRole("log", { name: "Conversation" });
  const sent = log.locator("[data-item-id='sent-1']");
  await expect(sent.getByText("Here are my notes")).toBeVisible();
  await expect(sent.getByText("notes.txt")).toBeVisible();

  // The answer streams in, then the box can send again.
  const answer = log.locator("[data-item-id='answer-1']");
  await expect(answer.getByText(/^Done\. I read what you sent/)).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("button", { name: "Send", exact: true }),
  ).toBeVisible();

  // Under settle, the sent message rests at the top of the view.
  await expect
    .poll(() =>
      log.evaluate((element) => {
        const item = element.querySelector("[data-item-id='sent-1']");
        if (item === null) throw new Error("no sent item");
        return Math.abs(
          item.getBoundingClientRect().top -
            element.getBoundingClientRect().top,
        );
      }),
    )
    .toBeLessThanOrEqual(1);
});

test("a file sends on its own, with no text", async ({ page }) => {
  await open(page, "settle");
  const send = page
    .getByRole("main")
    .getByRole("button", { name: "Send", exact: true });
  await expect(send).toBeDisabled();
  await page.locator("input[type='file']").setInputFiles({
    name: "runs.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("run,status\n1,ok\n"),
  });
  const message = page.getByRole("textbox", { name: "Message" });
  await expect(message).toHaveValue("");
  await expect(send).toBeEnabled();
  await send.click();

  const box = page.locator("[data-slot='attachment-drop-zone']");
  await expect(box.locator("[data-slot='attachments']")).toHaveCount(0);
  const sent = page
    .getByRole("log", { name: "Conversation" })
    .locator("[data-item-id='sent-1']");
  await expect(sent.getByText("runs.csv")).toBeVisible();
  await expect(sent.locator("[data-slot='message-content']")).toHaveCount(0);
});

test("Stop settles a call that was running as failed", async ({ page }) => {
  // The answer replays on timers, and its call runs for a single frame. On
  // the page's clock, held still once the story has loaded, that frame
  // stays put until the test moves the clock on.
  await page.clock.install({ time: CLOCK_START });
  await open(page, "settle");
  await page.clock.pauseAt(CLOCK_START + 60_000);
  const message = page.getByRole("textbox", { name: "Message" });
  await message.fill("Check the runs");
  await message.press("Enter");

  const answer = page.locator("[data-item-id='answer-1']");
  const trigger = answer.locator("[data-slot='activity-trigger']");
  // One replay frame at a time until the live line names the running call.
  for (let step = 0; step < MAX_REPLAY_STEPS; step += 1) {
    await page.clock.runFor(REPLAY_STEP_MS);
    if ((await trigger.textContent())?.includes("runs__list…") === true) break;
  }
  await expect(trigger).toContainText("runs__list…");
  await page.getByRole("main").getByRole("button", { name: "Stop" }).click();
  // With the clock still held, move it on by that many frames again. A
  // frame still queued after Stop would land now and undo the failed call.
  await page.clock.runFor(REPLAY_STEP_MS * MAX_REPLAY_STEPS);
  await page.clock.resume();

  await expect(trigger).toContainText("1 failed");
  await expect(answer.locator("[data-slot='message']")).toHaveAttribute(
    "data-status",
    "sent",
  );
  await trigger.click();
  await expect(answer.locator("[data-slot='tool']")).toHaveAttribute(
    "data-status",
    "error",
  );
  await expect(
    page.getByRole("main").getByRole("button", { name: "Send", exact: true }),
  ).toBeVisible();
});

test("a reply in the thread tab adds to the count under its parent", async ({
  page,
}) => {
  await open(page, "settle");
  const log = page.getByRole("log", { name: "Conversation" });
  await expect(log.getByRole("button", { name: /2 replies/ })).toBeVisible();
  const reply = page.getByRole("textbox", { name: "Reply" });
  await reply.fill("Add owners to the follow-ups");
  await reply.press("Enter");
  // The count reaches 4 as soon as the answer's first, empty frame lands,
  // so wait for the answer's text. The count then shows the final frame
  // took the streaming frame's place rather than adding a reply.
  await expect(
    page
      .getByRole("tabpanel")
      .getByText("Added it to the follow-ups, with an owner and a due date."),
  ).toBeVisible();
  await expect(log.getByRole("button", { name: /4 replies/ })).toBeVisible();
});
