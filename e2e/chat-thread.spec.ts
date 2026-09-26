import { expect, test } from "@playwright/test";

test("an agent turn renders its reasoning and tool parts, each expanding on click", async ({ page }) => {
  await page.goto("/chat-thread");
  const turn = page.getByRole("article", { name: "Scout replied" });
  await expect(turn.getByText("Three commits landed today.")).toBeVisible();

  const reasoning = turn.locator("details");
  await expect(reasoning).not.toHaveAttribute("open");
  await reasoning.locator("summary").click();
  await expect(reasoning).toHaveAttribute("open");
  await expect(reasoning.getByText("Check the commit log first.")).toBeVisible();

  const tool = turn.getByRole("button", { name: /Read today's commits/ });
  await expect(tool).toHaveAttribute("aria-expanded", "false");
  await tool.click();
  await expect(tool).toHaveAttribute("aria-expanded", "true");
  await expect(turn.getByText("3 commits")).toBeVisible();
});
