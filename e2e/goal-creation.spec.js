const { test, expect } = require("@playwright/test");
const { seedTestAuth } = require("./support/auth");
const { fillDateTimeField } = require("./support/datetime");
const { uniqueSuffix } = require("./support/api");

test("creates a top-level goal from the browser and shows it across goal views", async ({
  page
}) => {
  const suffix = uniqueSuffix();
  const session = `goal-creation-${suffix}`;
  const createdGoalTitle = `Top Level Goal ${suffix}`;
  const targetDate = new Date();

  targetDate.setDate(targetDate.getDate() + 18);
  targetDate.setHours(15, 0, 0, 0);

  await seedTestAuth(page, { session });

  await page.goto("/goal/new");
  await expect(page.getByRole("heading", { name: /create goal/i }).first()).toBeVisible();

  await page.getByLabel("Title").fill(createdGoalTitle);
  await page.getByLabel("Category").fill("Strategy");
  await page.getByLabel("Estimated hours").fill("8");
  await fillDateTimeField(page, "Target Completion Date", targetDate);
  await page.getByLabel("Description").fill("Created through the Playwright top-level goal flow.");
  await page.getByRole("button", { name: /^create goal$/i }).click();

  await expect(page.getByText(`Created "${createdGoalTitle}".`)).toBeVisible();
  await page.getByRole("link", { name: /^open$/i }).click();

  await expect(page).toHaveURL(/\/goals\/[a-f0-9]{24}$/);
  const createdGoalUrl = page.url();
  const createdGoalId = createdGoalUrl.split("/").pop();

  await expect(page.getByRole("heading", { name: createdGoalTitle })).toBeVisible();
  await expect(page.getByText("Strategy", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("None", { exact: true })).toBeVisible();
  await expect(page.getByText("0 / 8 hrs")).toBeVisible();

  await page.goto("/goals/overview");
  await expect(page.getByRole("heading", { name: /in-depth goals view/i })).toBeVisible();
  await page.getByRole("textbox", { name: /search goals/i }).fill(createdGoalTitle);
  await expect(page.getByText(createdGoalTitle, { exact: true })).toBeVisible();

  await page.goto(`/goals/${createdGoalId}/tree`);
  await expect(page.getByRole("heading", { name: /goal tree view/i })).toBeVisible();
  await expect(page.getByText(createdGoalTitle, { exact: true })).toBeVisible();
  await expect(page.getByText("Top-level goal", { exact: true })).toBeVisible();
});
