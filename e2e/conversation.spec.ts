import { expect, test, type Page } from "@playwright/test";

const container = (page: Page) =>
  page.locator("[data-slot='conversation-content']");

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

/** Opens a scenario once its history (which arrives after mount) is in. */
const open = async (page: Page, scenario: string) => {
  await page.goto(`/${scenario}`);
  await expect(page.getByTestId("h29")).toBeAttached();
  await atEnd(page);
};

const write = async (page: Page, times: number) => {
  for (let count = 0; count < times; count += 1) {
    await page.getByRole("button", { name: "Write" }).click();
  }
  // One frame for the resize callback, one for any correction to land.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
};

test.describe("settle", () => {
  test("history that arrives after mount opens at the end", async ({
    page,
  }) => {
    await open(page, "conversation-settle");
    await expect(page.getByTestId("h29")).toBeVisible();
  });

  test("a sent item settles at the top and streaming never moves the view", async ({
    page,
  }) => {
    await open(page, "conversation-settle");
    await page.getByRole("button", { name: "Send" }).click();
    await expect
      .poll(async () => Math.abs(await offsetOf(page, "s0")))
      .toBeLessThanOrEqual(1);
    await settled(page);
    expect(Math.abs(await offsetOf(page, "s0"))).toBeLessThanOrEqual(1);

    // The reply writes in below, past the bottom of the view; nothing moves.
    const before = (await view(page)).scrollTop;
    await write(page, 8);
    expect((await view(page)).scrollTop).toBe(before);
    expect(Math.abs(await offsetOf(page, "s0"))).toBeLessThanOrEqual(1);
    await expect(
      page.getByRole("button", { name: "Scroll to latest" }),
    ).toBeVisible();
  });

  test("scrolling up while text streams leaves scrollTop unchanged", async ({
    page,
  }) => {
    await open(page, "conversation-settle");
    await page.getByRole("button", { name: "Send" }).click();
    await settled(page);
    await wheel(page, -200);
    const before = (await view(page)).scrollTop;
    await write(page, 5);
    expect((await view(page)).scrollTop).toBe(before);
  });

  test("loading earlier items keeps the item in view within 1px", async ({
    page,
  }) => {
    await open(page, "conversation-settle");
    await wheel(page, -300);
    const reading = await firstVisible(page);
    expect(reading).toMatch(/^h/);
    const before = await offsetOf(page, reading);
    await page.getByRole("button", { name: "Load earlier" }).click();
    await expect(page.getByTestId("p0-0")).toBeAttached();
    expect(
      Math.abs((await offsetOf(page, reading)) - before),
    ).toBeLessThanOrEqual(1);
  });

  test("trimming items above the view does not move it", async ({ page }) => {
    await open(page, "conversation-settle");
    await wheel(page, -300);
    const reading = await firstVisible(page);
    expect(reading).toMatch(/^h([5-9]|\d\d)$/);
    const before = await offsetOf(page, reading);
    await page.getByRole("button", { name: "Trim" }).click();
    await expect(page.getByTestId("h0")).not.toBeAttached();
    await write(page, 0);
    expect(
      Math.abs((await offsetOf(page, reading)) - before),
    ).toBeLessThanOrEqual(1);
  });

  test("removing the settled item does not move the view", async ({ page }) => {
    await open(page, "conversation-settle");
    await page.getByRole("button", { name: "Send" }).click();
    await settled(page);
    const before = await offsetOf(page, "a0");
    await page.getByRole("button", { name: "Delete sent" }).click();
    await expect(page.getByTestId("s0")).not.toBeAttached();
    await write(page, 0);
    expect(Math.abs((await offsetOf(page, "a0")) - before)).toBeLessThanOrEqual(
      1,
    );
  });

  test("a remounted log keeps the reserve, so the end is the content's end", async ({
    page,
  }) => {
    await open(page, "conversation-settle");
    await page.getByRole("button", { name: "Send" }).click();
    await settled(page);
    const reserve = () =>
      page
        .locator("[data-slot='conversation-reserve']")
        .evaluate((element) => element.getBoundingClientRect().height);
    const held = await reserve();
    expect(held).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Remount" }).click();
    await write(page, 0);
    expect(Math.abs((await reserve()) - held)).toBeLessThanOrEqual(1);

    await page.getByRole("button", { name: "Scroll to latest" }).click();
    await settled(page);
    // The content ends at the bottom of the view, not a reserve short of it.
    const below = await container(page).evaluate((element) => {
      const spacer = element.querySelector(
        "[data-slot='conversation-reserve']",
      );
      return (
        (spacer?.getBoundingClientRect().top ?? Number.NaN) -
        element.getBoundingClientRect().bottom
      );
    });
    expect(Math.abs(below)).toBeLessThanOrEqual(1);
  });

  test("under reduced motion the settle is an instant jump", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, "conversation-settle");
    await page.getByRole("button", { name: "Send" }).click();
    // No glide: in place by the time the click's own frame has painted.
    const offset = await page.evaluate(() => {
      const item = document.querySelector("[data-testid='s0']");
      const scroller = document.querySelector(
        "[data-slot='conversation-content']",
      );
      if (item === null || scroller === null) return Number.NaN;
      return (
        item.getBoundingClientRect().top - scroller.getBoundingClientRect().top
      );
    });
    expect(Math.abs(offset)).toBeLessThanOrEqual(1);
  });
});

test.describe("stick", () => {
  test("at the end, streaming text keeps the end in view", async ({ page }) => {
    await open(page, "conversation-stick");
    await expect(page.getByTestId("h29")).toBeVisible();
    await write(page, 6);
    await atEnd(page);
    await expect(
      page.getByRole("button", { name: "Scroll to latest" }),
    ).toHaveCount(0);
  });

  test("scrolled up, streaming does not move the view", async ({ page }) => {
    await open(page, "conversation-stick");
    await wheel(page, -300);
    const before = (await view(page)).scrollTop;
    await write(page, 6);
    expect((await view(page)).scrollTop).toBe(before);

    const button = page.getByRole("button", { name: "Scroll to latest" });
    await button.click();
    await atEnd(page);
    await expect(button).toHaveCount(0);
    await expect(container(page)).toBeFocused();

    // Back at the end, it follows again.
    await write(page, 3);
    await atEnd(page);
  });

  test("sending glides back to the end from anywhere", async ({ page }) => {
    await open(page, "conversation-stick");
    await wheel(page, -400);
    await page.getByRole("button", { name: "Send" }).click();
    await atEnd(page);
  });
});

for (const policy of ["settle", "stick"]) {
  test(`${policy}: focus moving to an earlier item keeps the view there`, async ({
    page,
  }) => {
    await open(page, `conversation-${policy}`);
    // Past the moment after the history's resize, when a scroll is still
    // taken for the resize's clamp.
    await settled(page);
    // Focus moved by the host or assistive tech: no input on the log.
    await page.getByTestId("h3").evaluate((element) => {
      element.tabIndex = -1;
      element.focus();
    });
    await settled(page);
    const offset = await offsetOf(page, "h3");
    expect(offset).toBeGreaterThanOrEqual(-1);
    expect(offset).toBeLessThan(400);
    const before = (await view(page)).scrollTop;
    await expect(
      page.getByRole("button", { name: "Scroll to latest" }),
    ).toBeVisible();

    // The follow is broken: streaming does not pull the view to the end.
    await write(page, 3);
    expect((await view(page)).scrollTop).toBe(before);
  });
}

type GlideFrame = { readonly t: number; readonly offset: number };

/** Waits for the fixture's frame log of the glide (see recordGlide). */
const glideLog = async (page: Page) => {
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as { glideLog?: { done: boolean } }).glideLog?.done,
      ),
    )
    .toBe(true);
  return page.evaluate(
    () =>
      (
        window as unknown as {
          glideLog: { frames: GlideFrame[]; changedAt: number };
        }
      ).glideLog,
  );
};

/**
 * The tracked item moves one way only, and never faster than the frame
 * before: an ease-out only slows down, so a hop shows as a sudden speed-up.
 * `direction` is the sign of its offset's change while the view glides.
 */
const expectSmooth = (frames: readonly GlideFrame[], direction: 1 | -1) => {
  const step = (index: number) =>
    ((frames[index]?.offset ?? 0) - (frames[index - 1]?.offset ?? 0)) *
    direction;
  const speed = (index: number) =>
    step(index) / ((frames[index]?.t ?? 0) - (frames[index - 1]?.t ?? 0) || 1);
  for (let index = 1; index < frames.length; index += 1) {
    expect(
      step(index),
      `frame ${index} moved backwards`,
    ).toBeGreaterThanOrEqual(-1);
    // The first interval can straddle the click, so speeds compare from the
    // third frame; 0.5px/ms covers whole-pixel rounding.
    if (index >= 3) {
      expect(speed(index), `frame ${index} sped up: a hop`).toBeLessThanOrEqual(
        speed(index - 1) + 0.5,
      );
    }
  }
};

/** The content changed while the view was still gliding. */
const expectChangedMidGlide = (
  frames: readonly GlideFrame[],
  changedAt: number,
) => {
  const moving = frames.filter(
    (frame, index) =>
      index > 0 &&
      Math.abs(frame.offset - (frames[index - 1]?.offset ?? 0)) > 1,
  );
  expect(moving.some((frame) => frame.t > changedAt)).toBe(true);
};

test.describe("a glide over content that moves above it", () => {
  test("history landing above mid-glide still lands the item at the top", async ({
    page,
  }) => {
    await page.goto("/conversation-glide");
    await atEnd(page);
    await page.getByRole("button", { name: "Glide up and load" }).click();
    const { frames, changedAt } = await glideLog(page);
    await expect(page.getByTestId("p0")).toBeAttached();
    expectChangedMidGlide(frames, changedAt);
    // h3 comes down from above the view to its top, never past it.
    expectSmooth(frames, 1);
    for (const frame of frames) expect(frame.offset).toBeLessThanOrEqual(1);
    expect(Math.abs(frames.at(-1)?.offset ?? Number.NaN)).toBeLessThanOrEqual(
      1,
    );
    expect(Math.abs(await offsetOf(page, "h3"))).toBeLessThanOrEqual(1);
  });

  test("trimming above while gliding to the end shows no hop", async ({
    page,
  }) => {
    await page.goto("/conversation-glide");
    await atEnd(page);
    await wheel(page, -300);
    await page.getByRole("button", { name: "Glide down and trim" }).click();
    const { frames, changedAt } = await glideLog(page);
    await expect(page.getByTestId("h11")).not.toBeAttached();
    expectChangedMidGlide(frames, changedAt);
    // The item in view rises steadily as the view glides down to the end.
    expectSmooth(frames, -1);
    await atEnd(page);
  });
});
