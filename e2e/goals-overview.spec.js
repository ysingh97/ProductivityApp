const { test, expect } = require("@playwright/test");
const { createGoalFixture, futureIso, uniqueSuffix } = require("./support/api");
const { seedTestAuth } = require("./support/auth");

const openSelectOption = async (page, label, optionLabel) => {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: optionLabel, exact: true }).click();
};

test("filters, groups, and navigates through the in-depth goals view", async ({ page }) => {
  const suffix = uniqueSuffix();
  const session = `goals-overview-${suffix}`;
  const auth = { session };
  const healthGoal = await createGoalFixture({
    title: `Alpha Launch ${suffix}`,
    description: "Launch planning and QA.",
    category: "Health",
    isComplete: true,
    targetCompletionDate: futureIso(8)
  }, auth);
  await createGoalFixture({
    title: `Gamma Cleanup ${suffix}`,
    description: "Operations cleanup work.",
    category: "Work",
    isComplete: false,
    targetCompletionDate: futureIso(12)
  }, auth);
  await createGoalFixture({
    title: `Beta Research ${suffix}`,
    description: "Customer interviews and notes.",
    category: "Work",
    isComplete: false,
    targetCompletionDate: null
  }, auth);
  await createGoalFixture({
    title: `Nested Follow-up ${suffix}`,
    description: "Child goal that should not render as top-level.",
    category: "Work",
    parentGoalId: healthGoal._id,
    targetCompletionDate: futureIso(6)
  }, auth);

  await seedTestAuth(page, auth);

  await page.goto("/goals/overview");
  await expect(page.getByRole("heading", { name: /in-depth goals view/i })).toBeVisible();
  await expect(page.getByText(/showing 3 of 3/i)).toBeVisible();
  await expect(page.getByText(`Nested Follow-up ${suffix}`, { exact: true })).toHaveCount(0);

  await page.getByLabel("Search goals").fill("interviews");
  await expect(page.getByText(`Beta Research ${suffix}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Gamma Cleanup ${suffix}`, { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: /^completed$/i }).click();
  await expect(page.getByText(/no top-level goals match these filters\./i)).toBeVisible();

  await page.getByRole("button", { name: /reset filters/i }).click();
  await expect(page.getByText(`Alpha Launch ${suffix}`, { exact: true })).toBeVisible();

  await openSelectOption(page, /category/i, "Health");
  await expect(page.getByText(/showing 1 of 3/i)).toBeVisible();
  await expect(page.getByText(`Alpha Launch ${suffix}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Gamma Cleanup ${suffix}`, { exact: true })).toHaveCount(0);

  await page.goto("/goals/overview");
  await expect(page.getByRole("heading", { name: /in-depth goals view/i })).toBeVisible();
  await openSelectOption(page, /sort by/i, "Category");
  await expect(page.locator("span").filter({ hasText: /^Health$/ }).first()).toBeVisible();
  await expect(page.locator("span").filter({ hasText: /^Work$/ }).first()).toBeVisible();

  await page.getByText(`Alpha Launch ${suffix}`, { exact: true }).click();
  await page.getByRole("link", { name: /tree view/i }).click();

  await expect(page).toHaveURL(new RegExp(`/goals/${healthGoal._id}/tree$`));
  await expect(page.getByRole("heading", { name: /goal tree view/i })).toBeVisible();
  await expect(page.getByText("Selected", { exact: true })).toBeVisible();
});
