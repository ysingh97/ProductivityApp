const { test, expect } = require("@playwright/test");
const { seedTestAuth } = require("./support/auth");
const { uniqueSuffix } = require("./support/api");
const { fillDateTimeField } = require("./support/datetime");

test("creates a standalone task from the UI and shows it in the next-seven-days bucket", async ({
  page
}) => {
  const suffix = uniqueSuffix();
  const auth = { session: `task-creation-${suffix}` };
  const taskTitle = `Playwright Task ${suffix}`;
  const taskDescription = "Created by the Playwright task creation spec.";
  const category = "Work";
  const estimatedHours = "3.5";
  const targetDate = new Date();
  const targetDateLabelFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
  const dashboardDateLabelFormatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  });

  targetDate.setDate(targetDate.getDate() + 2);
  targetDate.setHours(12, 0, 0, 0);

  const targetDateLabel = targetDateLabelFormatter.format(targetDate);
  const dashboardDateLabel = dashboardDateLabelFormatter.format(targetDate);

  await seedTestAuth(page, auth);
  await page.goto("/task/new");

  await expect(page.getByRole("heading", { name: /create task/i }).first()).toBeVisible();

  const titleField = page.getByLabel("Title");
  await page.getByRole("button", { name: /^create task$/i }).click();
  await expect(titleField).toBeFocused();
  expect(
    await titleField.evaluate((input) => input.validationMessage)
  ).not.toEqual("");

  await titleField.fill(taskTitle);
  await page.getByLabel("Description").fill(taskDescription);
  await page.getByLabel("Category").fill(category);
  await page.getByLabel("Estimated hours").fill(estimatedHours);
  await fillDateTimeField(page, "Target Completion Date", targetDate);

  await page.getByRole("button", { name: /^create task$/i }).click();

  await expect(page.getByText(`Created "${taskTitle}".`)).toBeVisible();
  await page.getByRole("link", { name: /^open$/i }).click();

  await expect(page).toHaveURL(/\/tasks\/[a-f0-9]{24}$/);
  await expect(page.getByRole("heading", { name: taskTitle })).toBeVisible();
  await expect(page.getByText(taskDescription)).toBeVisible();

  const taskDetailsCard = page
    .locator(".MuiPaper-root")
    .filter({ has: page.getByRole("heading", { name: /task details/i }) })
    .first();
  await expect(taskDetailsCard.getByText(category, { exact: true })).toBeVisible();
  await expect(taskDetailsCard.getByText(estimatedHours, { exact: true })).toBeVisible();
  await expect(taskDetailsCard.getByText(targetDateLabel, { exact: true })).toBeVisible();

  await page.goto("/board");

  const nextWeekSection = page.locator(".MuiPaper-root").filter({
    has: page.getByRole("heading", { name: /next 7 days/i })
  }).first();

  await expect(nextWeekSection.getByRole("heading", { name: /next 7 days/i })).toBeVisible();
  await expect(nextWeekSection.getByRole("link", { name: taskTitle })).toBeVisible();
  await expect(nextWeekSection.getByText(dashboardDateLabel, { exact: true })).toBeVisible();
});
