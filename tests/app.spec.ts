import { expect, test } from "@playwright/test";

test("loads the vocabulary starter app", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /build a calmer way/i })).toBeVisible();
  await expect(page.getByText("serendipity")).toBeVisible();
});

