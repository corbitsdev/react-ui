import { expect, test } from "@playwright/test";

test("approve and reject each fire their callback once", async ({ page }) => {
  await page.goto("/approval-card");
  await page.getByRole("button", { name: "Approve" }).click();
  await page.getByRole("button", { name: "Reject" }).click();
  await expect(page.getByRole("status", { name: "Events" })).toHaveText("approve,reject");
});

test("a non-idle state disables both buttons", async ({ page }) => {
  await page.goto("/approval-card-busy");
  const approve = page.getByRole("button", { name: "Approving…" });
  const reject = page.getByRole("button", { name: "Reject" });
  await expect(approve).toBeDisabled();
  await expect(reject).toBeDisabled();
  await approve.click({ force: true });
  await reject.click({ force: true });
  await expect(page.getByRole("status", { name: "Events" })).toHaveText("");
});
