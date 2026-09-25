import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const STORIES = "http://localhost:61000";

test("every Ladle story is free of serious and critical axe violations", async ({ page, request }) => {
  test.setTimeout(600_000);
  const meta = (await (await request.get(`${STORIES}/meta.json`)).json()) as { stories: Record<string, unknown> };
  const failures: string[] = [];

  for (const theme of ["light", "dark"]) {
    for (const story of Object.keys(meta.stories)) {
      await page.goto(`${STORIES}/?story=${story}&mode=preview&theme=${theme}`);
      await page.locator("[data-storyloaded]").waitFor();
      const { violations } = await new AxeBuilder({ page }).analyze();
      for (const violation of violations) {
        if (violation.impact === "serious" || violation.impact === "critical") {
          failures.push(`${story} (${theme}): ${violation.id} (${violation.nodes.length})`);
        }
      }
    }
  }

  expect(failures).toEqual([]);
});
