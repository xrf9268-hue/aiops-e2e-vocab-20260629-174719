import { expect, test } from "@playwright/test";

test("loads the vocabulary library app shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /vocabulary studio/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "meticulous" })).toBeVisible();
  await expect(page.getByLabel("Search words")).toBeVisible();
});

test("studies a due card and surfaces review progress in the library", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Study" }).click();

  await expect(page.getByRole("heading", { name: /study mode/i })).toBeVisible();
  await expect(page.getByTestId("study-card")).toContainText("meticulous");
  await expect(page.getByText(/showing great attention to detail/i)).toHaveCount(0);

  await page.getByRole("button", { name: "Check answer" }).click();

  await expect(page.getByText(/showing great attention to detail/i)).toBeVisible();

  await page.getByRole("button", { name: "Good" }).click();
  await page.getByRole("button", { name: "Library" }).click();

  const reviewedWord = page.getByTestId("word-card").filter({ hasText: "meticulous" });
  await expect(reviewedWord.getByText("Review: Good")).toBeVisible();
  await expect(reviewedWord.getByText("Reviews: 1")).toBeVisible();
});
