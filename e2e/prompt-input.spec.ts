import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

type Box = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Where `token` lands inside the textarea, worked out independently of the
 * component's mirror: a hidden clone that copies the textarea's computed text
 * and box styles, scrolled the same, with the token in a span. If the mirror's
 * highlight drifts from the typed letters, it drifts from this too.
 */
async function typedTokenBox(page: Page, token: string): Promise<Box> {
  return page
    .getByRole("textbox", { name: "Message" })
    .evaluate((textarea: HTMLTextAreaElement, token) => {
      const style = getComputedStyle(textarea);
      const clone = document.createElement("div");
      const copied = [
        "boxSizing",
        "width",
        "height",
        "paddingTop",
        "paddingRight",
        "paddingBottom",
        "paddingLeft",
        "borderTopWidth",
        "borderRightWidth",
        "borderBottomWidth",
        "borderLeftWidth",
        "borderStyle",
        "fontFamily",
        "fontSize",
        "fontWeight",
        "fontStyle",
        "fontVariantLigatures",
        "letterSpacing",
        "lineHeight",
        "tabSize",
        "textIndent",
        "whiteSpace",
        "overflowWrap",
        "wordBreak",
        "overflowX",
        "overflowY",
        "scrollbarGutter",
      ] as const;
      for (const property of copied) clone.style[property] = style[property];
      const box = textarea.getBoundingClientRect();
      clone.style.position = "fixed";
      clone.style.left = `${box.left}px`;
      clone.style.top = `${box.top}px`;
      clone.style.margin = "0";
      clone.style.visibility = "hidden";
      const at = textarea.value.lastIndexOf(token);
      const span = document.createElement("span");
      span.textContent = token;
      clone.append(
        textarea.value.slice(0, at),
        span,
        textarea.value.slice(at + token.length),
      );
      document.body.append(clone);
      clone.scrollTop = textarea.scrollTop;
      const rect = span.getClientRects()[0];
      clone.remove();
      if (rect === undefined) throw new Error("token did not lay out");
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    }, token);
}

async function highlightBox(page: Page): Promise<Box> {
  return page
    .locator("[data-slot='prompt-input-token']")
    .last()
    .evaluate((mark) => {
      const rect = mark.getClientRects()[0];
      if (rect === undefined) throw new Error("highlight did not lay out");
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    });
}

async function expectHighlightUnderToken(page: Page, token: string) {
  const typed = await typedTokenBox(page, token);
  const drawn = await highlightBox(page);
  expect(Math.abs(drawn.left - typed.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(drawn.top - typed.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(drawn.width - typed.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(drawn.height - typed.height)).toBeLessThanOrEqual(1);
}

/** Two frames: long enough for a scroll event and the layout after it. */
async function settle(page: Page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

const events = (page: Page) => page.getByRole("status", { name: "Events" });
const message = (page: Page) => page.getByRole("textbox", { name: "Message" });

const LONG_DRAFT = Array.from(
  { length: 24 },
  (_, index) => `Line ${index + 1} of the draft, wrapping the text a little.`,
).join("\n");

test("the highlight sits under the typed token after typing", async ({
  page,
}) => {
  await page.goto("/prompt-input");
  await message(page).pressSequentially("Ask @Ada about the numbers");
  await expect(page.locator("[data-slot='prompt-input-token']")).toHaveText(
    "@Ada",
  );
  await expectHighlightUnderToken(page, "@Ada");
});

test("the highlight stays under the token in wide and wrapped text", async ({
  page,
}) => {
  await page.goto("/prompt-input");
  await message(page).fill(
    `日本語のテキストと絵文字 👋🏽🎉 ${"wrapping words ".repeat(6)}@Ada`,
  );
  await settle(page);
  await expectHighlightUnderToken(page, "@Ada");
});

test("the highlight follows a long draft as it scrolls", async ({ page }) => {
  await page.goto("/prompt-input");
  const textarea = message(page);
  await textarea.fill(`${LONG_DRAFT}\nThen ask @Ada to check it.`);
  await textarea.evaluate((element: HTMLTextAreaElement) => {
    element.scrollTop = element.scrollHeight;
  });
  await settle(page);
  expect(
    await textarea.evaluate(
      (element: HTMLTextAreaElement) => element.scrollTop,
    ),
  ).toBeGreaterThan(0);
  await expectHighlightUnderToken(page, "@Ada");

  await textarea.evaluate((element: HTMLTextAreaElement) => {
    element.scrollTop = 37;
  });
  await settle(page);
  await expectHighlightUnderToken(page, "@Ada");
});

test("Enter during IME composition does not submit", async ({ page }) => {
  await page.goto("/prompt-input");
  const textarea = message(page);
  await textarea.fill("にほん");
  await textarea.evaluate((element) => {
    element.dispatchEvent(new CompositionEvent("compositionstart"));
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    element.dispatchEvent(new CompositionEvent("compositionend"));
  });
  await settle(page);
  await expect(events(page)).toHaveText("");
  await expect(textarea).toHaveValue("にほん");

  await textarea.press("Enter");
  await expect(events(page)).toHaveText("submit:にほん");
});

test("Shift+Enter breaks the line and Enter submits", async ({ page }) => {
  await page.goto("/prompt-input");
  const textarea = message(page);
  await textarea.pressSequentially("one");
  await textarea.press("Shift+Enter");
  await textarea.pressSequentially("two");
  await expect(textarea).toHaveValue("one\ntwo");
  await textarea.press("Enter");
  await expect(events(page)).toHaveText("submit:one\ntwo");
});

test("suggestions follow the keyboard and a pick can be undone", async ({
  page,
}) => {
  await page.goto("/prompt-input");
  const textarea = message(page);
  await textarea.pressSequentially("Ask @a");
  const list = page.getByRole("listbox", { name: "Mentions" });
  await expect(list.getByRole("option")).toHaveCount(2);
  await textarea.press("ArrowDown");
  await expect(
    list.getByRole("option", { name: /@Adam/, selected: true }),
  ).toBeVisible();
  await textarea.press("Enter");
  await expect(textarea).toHaveValue("Ask @Adam ");
  await expect(list).toBeHidden();
  await expect(events(page)).toHaveText("");

  await textarea.press("ControlOrMeta+z");
  await expect(textarea).toHaveValue("Ask @a");

  await textarea.press("End");
  await textarea.pressSequentially("da and @");
  await expect(list).toBeVisible();
  await textarea.press("Escape");
  await expect(list).toBeHidden();
  await expect(textarea).toHaveValue("Ask @ada and @");
});

test("a pick mid-draft leaves the caret past the token on its own line", async ({
  page,
}) => {
  await page.goto("/prompt-input");
  const textarea = message(page);
  const list = page.getByRole("listbox", { name: "Mentions" });
  const caret = () =>
    textarea.evaluate((element: HTMLTextAreaElement) => element.selectionStart);

  await textarea.pressSequentially("Ask @ad now");
  await textarea.press("ArrowLeft");
  await textarea.press("ArrowLeft");
  await textarea.press("ArrowLeft");
  await textarea.press("ArrowLeft");
  await expect(list).toBeVisible();
  await textarea.press("Enter");
  await expect(textarea).toHaveValue("Ask @Ada now");
  expect(await caret()).toBe("Ask @Ada ".length);
  await expect(list).toBeHidden();
  await textarea.press("Enter");
  await expect(events(page)).toHaveText("submit:Ask @Ada now");

  await textarea.fill("");
  await textarea.pressSequentially("Ask @ad");
  await textarea.press("Shift+Enter");
  await textarea.pressSequentially("next");
  await textarea.press("Home");
  await textarea.press("ArrowLeft");
  await expect(list).toBeVisible();
  await textarea.press("Enter");
  await expect(textarea).toHaveValue("Ask @Ada \nnext");
  expect(await caret()).toBe("Ask @Ada ".length);
  await expect(list).toBeHidden();
});

test("Escape closes the suggestion list, not the dialog around it", async ({
  page,
}) => {
  await page.goto("/prompt-input-dialog");
  const dialog = page.getByRole("dialog", { name: "Ask" });
  const textarea = message(page);
  const list = page.getByRole("listbox", { name: "Mentions" });
  await textarea.pressSequentially("@a");
  await expect(list).toBeVisible();

  await textarea.press("Escape");
  await expect(list).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(textarea).toBeFocused();

  await textarea.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(events(page)).toHaveText("dialog-closed");
});

test("Send becomes Stop while the agent replies and calls onStop", async ({
  page,
}) => {
  await page.goto("/prompt-input");
  const textarea = message(page);
  await textarea.pressSequentially("Next step");
  await page.getByRole("button", { name: "Reply" }).click();
  const stop = page.getByRole("button", { name: "Stop" });
  await expect(stop).toBeEnabled();
  await expect(page.getByRole("button", { name: "Send" })).toHaveCount(0);

  await textarea.press("Enter");
  await expect(events(page)).toHaveText("");

  await stop.click();
  await expect(events(page)).toHaveText("stop");
  const send = page.getByRole("button", { name: "Send" });
  await expect(send).toBeFocused();
  await send.click();
  await expect(events(page)).toHaveText("stop,submit:Next step");
});

/** Settles, then asserts focus is on the submit button and not on the page:
 * a focused button that turns `disabled` loses focus to `<body>` at the
 * next rendering update, after which `toBeFocused` alone could pass early. */
async function expectSubmitFocused(page: Page) {
  await settle(page);
  expect(
    await page.evaluate(() =>
      document.activeElement?.getAttribute("data-slot"),
    ),
  ).toBe("prompt-input-submit");
}

test("Send keeps focus as a cleared draft makes it unsendable", async ({
  page,
}) => {
  await page.goto("/prompt-input-chat");
  const textarea = message(page);
  const submit = page.locator("[data-slot='prompt-input-submit']");
  const finish = page.getByRole("button", { name: "Finish reply" });

  await textarea.fill("hello");
  await submit.focus();
  await page.keyboard.press("Enter");
  await expect(events(page)).toHaveText("submit:hello");
  await expect(textarea).toHaveValue("");
  await expect(submit).toHaveAccessibleName("Stop");
  await expectSubmitFocused(page);

  // The reply ends: Send again, with nothing to send.
  await finish.click();
  await expect(submit).toHaveAccessibleName("Send");
  await expect(submit).toBeDisabled();
  await expectSubmitFocused(page);

  // Stop ends it too.
  await textarea.fill("again");
  await submit.click();
  await expect(submit).toHaveAccessibleName("Stop");
  await submit.click();
  await expect(events(page)).toHaveText("submit:hello,submit:again,stop");
  await expect(submit).toHaveAccessibleName("Send");
  await expectSubmitFocused(page);

  // Enter on the unsendable Send sends nothing.
  await page.keyboard.press("Enter");
  await settle(page);
  await expect(events(page)).toHaveText("submit:hello,submit:again,stop");
});

test("Send keeps focus while a reply runs with no onStop", async ({ page }) => {
  await page.goto("/prompt-input-chat-no-stop");
  const submit = page.getByRole("button", { name: "Send" });
  await message(page).fill("hello");
  await submit.click();
  await expect(events(page)).toHaveText("submit:hello");
  await expect(submit).toBeDisabled();
  await expectSubmitFocused(page);

  await page.getByRole("button", { name: "Finish reply" }).click();
  await expectSubmitFocused(page);
});

test("an open suggestion list adds no axe violations and is announced", async ({
  page,
}) => {
  await page.goto("/prompt-input");
  const textarea = message(page);
  await expect(textarea).toHaveAttribute("aria-haspopup", "listbox");
  await textarea.pressSequentially("Ask @a");
  await expect(page.getByRole("listbox", { name: "Mentions" })).toBeVisible();
  await expect(
    page.locator("[data-slot='prompt-input'] [role='status']"),
  ).toHaveText("2 suggestions");
  const { violations } = await new AxeBuilder({ page })
    .include("[data-slot='prompt-input']")
    .analyze();
  expect(violations.map((violation) => violation.id)).toEqual([]);

  await textarea.press("Escape");
  await expect(
    page.locator("[data-slot='prompt-input'] [role='status']"),
  ).toHaveText("");
});

test("an attachment alone can be sent with Enter or Send", async ({ page }) => {
  await page.goto("/prompt-input-attachment");
  const textarea = message(page);
  const send = page.getByRole("button", { name: "Send" });
  await expect(send).toBeDisabled();
  await textarea.press("Enter");
  await expect(events(page)).toHaveText("");

  await page.getByRole("button", { name: "Attach file" }).click();
  await expect(send).toBeEnabled();
  await textarea.press("Enter");
  await expect(events(page)).toHaveText("submit:+attachment");
  await send.click();
  await expect(events(page)).toHaveText(
    "submit:+attachment,submit:+attachment",
  );
});

async function heights(page: Page) {
  return message(page).evaluate((element: HTMLTextAreaElement) => ({
    offset: element.offsetHeight,
    client: element.clientHeight,
    scroll: element.scrollHeight,
    inline: element.style.height,
  }));
}

test("field-sizing grows the textarea to its max, then it scrolls", async ({
  page,
}) => {
  await page.goto("/prompt-input");
  const empty = await heights(page);
  await message(page).fill("one\ntwo\nthree");
  const three = await heights(page);
  await message(page).fill(LONG_DRAFT);
  const long = await heights(page);
  expect(three.inline).toBe("");
  expect(three.offset).toBeGreaterThan(empty.offset);
  expect(long.offset).toBe(200);
  expect(long.scroll).toBeGreaterThan(long.client);
});

test.describe("without field-sizing", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const supports = CSS.supports.bind(CSS);
      CSS.supports = (...args: [string, string?]) =>
        args[0].includes("field-sizing")
          ? false
          : args[1] === undefined
            ? supports(args[0])
            : supports(args[0], args[1]);
      document.addEventListener("DOMContentLoaded", () => {
        const style = document.createElement("style");
        style.textContent = "textarea { field-sizing: fixed !important; }";
        document.head.append(style);
      });
    });
  });

  test("the measured fallback grows to the max, then scrolls", async ({
    page,
  }) => {
    await page.goto("/prompt-input");
    const empty = await heights(page);
    await message(page).fill("one\ntwo\nthree");
    const three = await heights(page);
    await message(page).fill(LONG_DRAFT);
    const long = await heights(page);
    await message(page).fill("");
    const cleared = await heights(page);
    expect(three.inline).toMatch(/px$/);
    expect(three.offset).toBeGreaterThan(empty.offset);
    expect(long.offset).toBe(200);
    expect(long.scroll).toBeGreaterThan(long.client);
    expect(cleared.offset).toBe(empty.offset);
  });

  test("the highlight still sits under the token", async ({ page }) => {
    await page.goto("/prompt-input");
    await message(page).fill(`${LONG_DRAFT}\nThen ask @Ada to check it.`);
    await message(page).evaluate((element: HTMLTextAreaElement) => {
      element.scrollTop = element.scrollHeight;
    });
    await settle(page);
    await expectHighlightUnderToken(page, "@Ada");
  });
});
