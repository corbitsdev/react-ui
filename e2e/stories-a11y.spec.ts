import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import known from "./stories-a11y.known.json" with { type: "json" };

const STORIES = "http://localhost:61000";

// Existing violations recorded as a baseline to fix later; only a violation
// not listed here fails.
const KNOWN = new Set(known);

test("every story is free of serious and critical axe violations", async ({
  page,
  request,
}) => {
  test.setTimeout(600_000);
  const index = (await (await request.get(`${STORIES}/index.json`)).json()) as {
    entries: Record<string, { type: string }>;
  };
  const stories = Object.entries(index.entries)
    .filter(([, entry]) => entry.type === "story")
    .map(([id]) => id);
  const failures: string[] = [];

  for (const theme of ["light", "dark"]) {
    for (const story of stories) {
      await page.goto(
        `${STORIES}/iframe.html?id=${story}&viewMode=story&globals=theme:${theme}`,
      );
      // Storybook swaps the body class once the story either renders or throws.
      const body = page.locator("body.sb-show-main, body.sb-show-errordisplay");
      await body.waitFor({ state: "attached" });
      if (await page.locator("body.sb-show-errordisplay").count()) {
        failures.push(`${story} (${theme}): render error`);
        continue;
      }
      // Rows mount a frame late and fade in, so wait for the theme class, two
      // frames and any finite transition before scanning; otherwise contrast
      // is measured mid-fade and depends on runner speed.
      await page
        .locator("html.light, html.dark")
        .waitFor({ state: "attached" });
      await page.evaluate(async () => {
        const frame = () =>
          new Promise((resolve) => requestAnimationFrame(resolve));
        await frame();
        await frame();
        const finite = document
          .getAnimations()
          .filter(
            (animation) =>
              animation.playState === "running" &&
              animation.effect?.getTiming().iterations !== Infinity,
          );
        await Promise.race([
          Promise.all(
            finite.map((animation) => animation.finished.catch(() => {})),
          ),
          new Promise((resolve) => setTimeout(resolve, 2_000)),
        ]);
      });
      const { violations } = await new AxeBuilder({ page }).analyze();
      for (const violation of violations) {
        if (violation.impact === "serious" || violation.impact === "critical") {
          const key = `${story} (${theme}): ${violation.id}`;
          if (!KNOWN.has(key)) {
            failures.push(`${key} (${violation.nodes.length})`);
          }
        }
      }
    }
  }

  expect(failures).toEqual([]);
});
