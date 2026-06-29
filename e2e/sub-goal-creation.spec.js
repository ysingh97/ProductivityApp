const { test, expect } = require("@playwright/test");
const { createGoalFixture, futureIso, uniqueSuffix } = require("./support/api");
const { seedTestAuth } = require("./support/auth");
const { fillDateTimeField } = require("./support/datetime");

test("creates a sub-goal from a parent goal with inherited category and deadline guardrails", async ({
  page
}) => {
  const suffix = uniqueSuffix();
  const session = `sub-goal-creation-${suffix}`;
  const auth = { session };
  const parentGoal = await createGoalFixture({
    title: `Parent Goal ${suffix}`,
    description: "Parent goal used for Playwright sub-goal coverage.",
    category: "Growth",
    estimatedHours: 12,
    targetCompletionDate: futureIso(24)
  }, auth);
  const subGoalTitle = `Sub Goal ${suffix}`;
  const laterThanParent = new Date(parentGoal.targetCompletionDate);
  const validSubGoalDate = new Date(parentGoal.targetCompletionDate);

  laterThanParent.setDate(laterThanParent.getDate() + 1);
  validSubGoalDate.setDate(validSubGoalDate.getDate() - 2);
  validSubGoalDate.setHours(10, 30, 0, 0);

  await seedTestAuth(page, auth);

  await page.goto(`/goals/${parentGoal._id}`);
  await expect(page.getByRole("heading", { name: parentGoal.title })).toBeVisible();

  await page.getByRole("link", { name: /create sub-goal/i }).click();
  await expect(page).toHaveURL(/\/goal\/new$/);
  await expect(page.getByRole("heading", { name: /create goal/i }).first()).toBeVisible();

  await expect(page.getByRole("combobox", { name: /parent goal/i })).toHaveValue(parentGoal.title);
  await expect(page.getByRole("combobox", { name: /parent goal/i })).toBeDisabled();
  await expect(page.getByLabel("Category")).toHaveValue("Growth");
  await expect(page.getByLabel("Category")).toBeDisabled();

  await page.getByLabel("Title").fill(subGoalTitle);
  await page.getByLabel("Estimated hours").fill("3");
  await page.getByLabel("Description").fill("Created from the parent goal page.");

  await fillDateTimeField(page, "Target Completion Date", laterThanParent);
  await page.getByRole("button", { name: /^create goal$/i }).click();

  await expect(
    page.getByText(/sub-goals cannot have a target completion date later than the parent goal\./i)
  ).toBeVisible();

  await fillDateTimeField(page, "Target Completion Date", validSubGoalDate);
  await page.getByRole("button", { name: /^create goal$/i }).click();

  await expect(page.getByText(`Created "${subGoalTitle}".`)).toBeVisible();
  await page.getByRole("link", { name: /^open$/i }).click();

  await expect(page).toHaveURL(/\/goals\/[a-f0-9]{24}$/);
  const createdSubGoalId = page.url().split("/").pop();

  await expect(page.getByRole("heading", { name: subGoalTitle })).toBeVisible();
  await expect(page.getByText(parentGoal.title, { exact: true })).toBeVisible();
  await expect(page.getByText("Growth", { exact: true }).first()).toBeVisible();

  await page.goto(`/goals/${parentGoal._id}/tree`);
  await expect(page.getByRole("heading", { name: /goal tree view/i })).toBeVisible();
  await expect(page.getByText(parentGoal.title, { exact: true })).toBeVisible();
  await expect(page.getByText(subGoalTitle, { exact: true })).toBeVisible();

  await page.goto(`/goals/${createdSubGoalId}/tree`);
  await expect(page.getByText(parentGoal.title, { exact: true })).toBeVisible();
  await expect(page.getByText(subGoalTitle, { exact: true })).toBeVisible();
});
