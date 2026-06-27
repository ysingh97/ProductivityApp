const { test, expect } = require("@playwright/test");
const { seedTestAuth } = require("./support/auth");
const { uniqueSuffix } = require("./support/api");
const { fillDateTimeField } = require("./support/datetime");

test("creates a standalone task from the UI and shows it in the next-seven-days bucket", async ({
  page
}) => {
  const taskTitle = `Playwright Task ${uniqueSuffix()}`;
  const taskDescription = "Created by the Playwright task creation spec.";
  const category = "Deep Work";
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

  await seedTestAuth(page);
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
  await expect(page.getByText(category, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(estimatedHours, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(targetDateLabel, { exact: true })).toBeVisible();

  await page.goto("/board");

  await expect(page.getByRole("heading", { name: /next 7 days/i })).toBeVisible();
  await expect(page.getByRole("link", { name: taskTitle })).toBeVisible();
  await expect(page.getByText(dashboardDateLabel, { exact: true }).first()).toBeVisible();
});
