import { expect, test, type Page } from "@playwright/test";

/**
 * Drops `count` text files named `<prefix>-<n>.txt` on the zone, the way a
 * browser delivers a drag from the desktop: dragenter, dragover, then drop,
 * all carrying one real DataTransfer.
 */
async function dropFiles(page: Page, prefix: string, count: number) {
  await page.getByTestId("zone").evaluate(
    (zone, { prefix, count }) => {
      const data = new DataTransfer();
      for (let index = 0; index < count; index += 1) {
        data.items.add(
          new File([`${prefix} ${index}`], `${prefix}-${index}.txt`, {
            type: "text/plain",
          }),
        );
      }
      for (const type of ["dragenter", "dragover", "drop"]) {
        zone.dispatchEvent(
          new DragEvent(type, {
            dataTransfer: data,
            bubbles: true,
            cancelable: true,
          }),
        );
      }
    },
    { prefix, count },
  );
}

/** Left edges of the stack's cards, from layout (so the tilt doesn't count). */
function cardOffsets(page: Page): Promise<number[]> {
  return page
    .locator("[data-slot=attachment]")
    .evaluateAll((cards) =>
      cards.map((card) => (card instanceof HTMLElement ? card.offsetLeft : -1)),
    );
}

async function gapBetweenFirstCards(page: Page): Promise<number> {
  const [first, second] = await cardOffsets(page);
  if (first === undefined || second === undefined) return Number.NaN;
  return second - first;
}

const count = (page: Page) => page.getByRole("status", { name: "Count" });

test("a dropped picture previews, and removing it revokes its URL", async ({
  page,
}) => {
  await page.goto("/attachments");
  await page.getByTestId("zone").evaluate(async (zone) => {
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (blob === null) throw new Error("no PNG");
    const data = new DataTransfer();
    data.items.add(new File([blob], "dot.png", { type: "image/png" }));
    for (const type of ["dragenter", "dragover", "drop"]) {
      zone.dispatchEvent(
        new DragEvent(type, {
          dataTransfer: data,
          bubbles: true,
          cancelable: true,
        }),
      );
    }
  });

  await expect(count(page)).toHaveText("1");
  const list = page.getByRole("list", { name: "1 attachment" });
  const picture = list.locator("img");
  await expect(picture).toHaveJSProperty("complete", true);
  expect(
    await picture.evaluate((image: HTMLImageElement) => image.naturalWidth),
  ).toBe(8);
  const url = await picture.getAttribute("src");
  expect(url).toMatch(/^blob:/);
  const readable = (target: string) =>
    page.evaluate(
      (target) =>
        fetch(target).then(
          () => true,
          () => false,
        ),
      target,
    );
  expect(await readable(url ?? "")).toBe(true);

  await list.getByRole("button", { name: "Remove dot.png" }).click();
  await expect(count(page)).toHaveText("0");
  await expect.poll(() => readable(url ?? "")).toBe(false);
  // The list is gone with its last attachment; focus went to the message box.
  await expect(page.getByRole("textbox", { name: "Message" })).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
    "BODY",
  );
});

test("25 files fold into a stack that fans out, expands and clears", async ({
  page,
}) => {
  await page.goto("/attachments");
  await dropFiles(page, "single", 1);
  await expect(count(page)).toHaveText("1");
  await dropFiles(page, "batch", 25);
  await expect(count(page)).toHaveText("26");
  await expect(page.getByRole("status", { name: "Refused" })).toHaveText("");

  const stack = page.getByRole("list", { name: "26 attachments" });
  await expect(stack.locator("[data-slot=attachment]")).toHaveCount(4);
  const more = stack.getByRole("button", { name: "Show 22 more" });
  await expect(more).toHaveText("+22");

  // At rest the cards overlap: each shows a 10px sliver of the one behind.
  await page.getByTestId("outside").hover();
  await expect.poll(() => gapBetweenFirstCards(page)).toBe(10);
  await expect(more).toHaveCSS("opacity", "0");

  // Pointed at, the deck fans out: a whole 52px card and an 8px gap apart.
  await stack.hover();
  await expect.poll(() => gapBetweenFirstCards(page)).toBe(60);
  await expect(more).toHaveCSS("opacity", "1");

  await more.click();
  await expect(stack.locator("[data-slot=attachment]")).toHaveCount(26);
  // Focus lands on the first card "+22" was folding, not the page start.
  await expect(
    stack.getByRole("button", { name: "Remove batch-3.txt" }),
  ).toBeFocused();
  await expect(stack.getByText("batch-24.txt")).toBeVisible();

  await page.getByRole("button", { name: "Remove all" }).click();
  await expect(count(page)).toHaveText("0");
  await expect(page.locator("[data-slot=attachments]")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Message" })).toBeFocused();
});

test("the stack fans out for the keyboard, and focus follows removal", async ({
  page,
}) => {
  await page.goto("/attachments");
  await dropFiles(page, "key", 3);
  await expect(count(page)).toHaveText("3");
  await page.getByTestId("outside").hover();

  const stack = page.getByRole("list", { name: "3 attachments" });
  await page.keyboard.press("Tab");
  const first = stack.getByRole("button", { name: "Remove key-0.txt" });
  await expect(first).toBeFocused();
  await expect.poll(() => gapBetweenFirstCards(page)).toBe(60);
  await expect(first).toHaveCSS("opacity", "1");

  await page.keyboard.press("Enter");
  await expect(count(page)).toHaveText("2");
  await expect(
    page
      .getByRole("list", { name: "2 attachments" })
      .getByRole("button", { name: "Remove key-1.txt" }),
  ).toBeFocused();

  // The keyboard clears the rest; the last removal hands focus on.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(count(page)).toHaveText("0");
  await expect(page.locator("[data-slot=attachments]")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Message" })).toBeFocused();
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
    "BODY",
  );
});

test("past the limit, 100 of 120 files join and the rest are refused", async ({
  page,
}) => {
  await page.goto("/attachments");
  await dropFiles(page, "many", 120);
  await expect(count(page)).toHaveText("100");
  await expect(page.getByRole("status", { name: "Refused" })).toHaveText(
    "too-many 20",
  );
  await expect(
    page.getByRole("list", { name: "100 attachments" }).getByRole("button", {
      name: "Show 96 more",
    }),
  ).toHaveText("+96");
});

// A browser only builds file-system entries for a real drag from the
// desktop, which Playwright cannot make. The drop's items are stubbed to
// hand back entries of the same shape, so this covers the zone's walk of
// them, not the browser's side.
test("a dropped folder is walked to the files inside it", async ({ page }) => {
  await page.goto("/attachments");
  await page.getByTestId("zone").evaluate((zone) => {
    type Entry = {
      name: string;
      isFile: boolean;
      isDirectory: boolean;
      file?: (success: (file: File) => void) => void;
      createReader?: () => {
        readEntries: (success: (entries: Entry[]) => void) => void;
      };
    };
    const file = (name: string): Entry => ({
      name,
      isFile: true,
      isDirectory: false,
      file: (success) =>
        success(new File([name], name, { type: "text/plain" })),
    });
    const folder = (name: string, entries: Entry[]): Entry => ({
      name,
      isFile: false,
      isDirectory: true,
      createReader: () => {
        let read = false;
        return {
          readEntries: (success) => {
            success(read ? [] : entries);
            read = true;
          },
        };
      },
    });
    const project = folder("project", [
      file("README.md"),
      file(".DS_Store"),
      folder("src", [file("index.ts"), file("util.ts")]),
      folder("test", [file("index.ts")]),
    ]);
    const items = [
      { kind: "file", getAsFile: () => null, webkitGetAsEntry: () => project },
    ];
    const data = { types: ["Files"], items, files: [], dropEffect: "none" };
    for (const type of ["dragenter", "dragover", "drop"]) {
      const event = new DragEvent(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", { value: data });
      zone.dispatchEvent(event);
    }
  });

  await expect(count(page)).toHaveText("4");
  await expect(page.getByRole("status", { name: "Folders" })).toHaveText(
    "project",
  );
  const stack = page.getByRole("list", { name: "4 attachments" });
  for (const name of [
    "project/README.md",
    "project/src/index.ts",
    "project/src/util.ts",
    "project/test/index.ts",
  ]) {
    await expect(
      stack.getByRole("button", { name: `Remove ${name}` }),
    ).toHaveCount(1);
  }
});

test("files dropped outside the zone do not open in place of the page", async ({
  page,
}) => {
  await page.goto("/attachments");
  const handled = await page.getByTestId("outside").evaluate((outside) => {
    const data = new DataTransfer();
    data.items.add(new File(["stray"], "stray.txt", { type: "text/plain" }));
    return ["dragenter", "dragover", "drop"].map((type) => {
      const event = new DragEvent(type, {
        dataTransfer: data,
        bubbles: true,
        cancelable: true,
      });
      outside.dispatchEvent(event);
      return { type, prevented: event.defaultPrevented };
    });
  });
  expect(handled).toEqual([
    { type: "dragenter", prevented: false },
    { type: "dragover", prevented: true },
    { type: "drop", prevented: true },
  ]);
  await expect(page).toHaveURL(/\/attachments$/);
  await expect(count(page)).toHaveText("0");
});
