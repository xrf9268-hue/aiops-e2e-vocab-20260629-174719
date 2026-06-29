import { expect, test } from "@playwright/test";

test("loads the vocabulary library app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /vocabulary studio/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "meticulous" })).toBeVisible();
  await expect(page.getByLabel("Search words")).toBeVisible();
});
