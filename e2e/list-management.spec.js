const { test, expect } = require("@playwright/test");
const { createListFixture, createTaskFixture, futureIso, uniqueSuffix } = require("./support/api");
const { seedTestAuth } = require("./support/auth");
const { fillDateTimeField } = require("./support/datetime");

test("manages tasks from the lists overview and list detail page", async ({ page }) => {
  const suffix = uniqueSuffix();
  const session = `list-management-${suffix}`;
  const auth = { session };
  const list = await createListFixture({
    title: `Planning List ${suffix}`,
    description: "List used by the Playwright list management spec."
  }, auth);
  const existingTask = await createTaskFixture({
    title: `Existing List Task ${suffix}`,
    description: "Existing task already attached to the list.",
    category: "Operations",
    estimatedCompletionTime: 2,
    timeSpent: 1,
    listId: list._id,
    targetCompletionDate: futureIso(6)
  }, auth);
  const newTaskTitle = `Added From List ${suffix}`;
  const newTaskDate = new Date();

  newTaskDate.setDate(newTaskDate.getDate() + 4);
  newTaskDate.setHours(10, 0, 0, 0);

  await seedTestAuth(page, auth);

  await page.goto("/lists");
  await expect(page.getByRole("heading", { name: "Lists", exact: true })).toBeVisible();
  const listCard = page
    .locator(".MuiPaper-root")
    .filter({ has: page.getByText(list.title, { exact: true }) })
    .first();
  await expect(listCard.getByText(list.title, { exact: true })).toBeVisible();
  await expect(listCard.getByText(/1 tasks - created/i)).toBeVisible();

  await page.goto(`/lists/${list._id}`);
  await expect(page.getByRole("heading", { name: list.title })).toBeVisible();
  await expect(page.getByText("1 tasks")).toBeVisible();
  await expect(page.getByText(existingTask.title, { exact: true })).toBeVisible();

  await page.getByRole("link", { name: /add task/i }).click();
  await expect(page).toHaveURL(new RegExp(`/task/new\\?listId=${list._id}$`));
  await expect(page.getByRole("heading", { name: /create task/i }).first()).toBeVisible();

  await expect(page.getByRole("combobox", { name: /list/i })).toBeDisabled();
  await page.getByLabel("Title").fill(newTaskTitle);
  await page.getByLabel("Description").fill("Created from the list detail page.");
  await page.getByRole("combobox", { name: /category/i }).fill("Operations");
  await page.getByLabel("Estimated hours").fill("3");
  await fillDateTimeField(page, "Target Completion Date", newTaskDate);
  await page.getByRole("button", { name: /^create task$/i }).click();

  await expect(page.getByText(`Created "${newTaskTitle}".`)).toBeVisible();
  await page.getByRole("link", { name: /^open$/i }).click();
  await expect(page.getByRole("heading", { name: newTaskTitle })).toBeVisible();
  await expect(page.getByText(list.title, { exact: true })).toBeVisible();

  await page.goto(`/lists/${list._id}`);
  await expect(page.getByRole("heading", { name: list.title })).toBeVisible();
  await expect(page.getByText("2 tasks")).toBeVisible();
  await expect(page.getByText(newTaskTitle, { exact: true })).toBeVisible();

  const existingTaskCard = page
    .getByText(existingTask.title, { exact: true })
    .locator('xpath=ancestor::*[contains(@class,"MuiPaper-root")][1]');
  await existingTaskCard.getByRole("button", { name: /^delete$/i }).click();

  await expect(page.getByText("1 tasks")).toBeVisible();
  await expect(page.getByText(existingTask.title, { exact: true })).toHaveCount(0);
  await expect(page.getByText(newTaskTitle, { exact: true })).toBeVisible();
});
