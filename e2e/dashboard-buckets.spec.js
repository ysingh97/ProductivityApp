const { test, expect } = require("@playwright/test");
const { createTaskFixture, uniqueSuffix } = require("./support/api");
const { seedTestAuth } = require("./support/auth");

test("shows tasks in the correct dashboard due-date buckets", async ({ page }) => {
  const suffix = uniqueSuffix();
  const session = `dashboard-buckets-${suffix}`;
  const auth = { session };
  const now = new Date();
  const overdueDate = new Date(now);
  const todayDate = new Date(now);
  const nextWeekDate = new Date(now);

  overdueDate.setDate(overdueDate.getDate() - 1);
  overdueDate.setHours(9, 0, 0, 0);
  todayDate.setHours(17, 0, 0, 0);
  nextWeekDate.setDate(nextWeekDate.getDate() + 3);
  nextWeekDate.setHours(13, 0, 0, 0);

  const overdueTask = await createTaskFixture({
    title: `Overdue Task ${suffix}`,
    category: "Work",
    targetCompletionDate: overdueDate.toISOString()
  }, auth);
  const todayTask = await createTaskFixture({
    title: `Today Task ${suffix}`,
    category: "Work",
    targetCompletionDate: todayDate.toISOString()
  }, auth);
  const nextWeekTask = await createTaskFixture({
    title: `Next Week Task ${suffix}`,
    category: "Work",
    targetCompletionDate: nextWeekDate.toISOString()
  }, auth);
  await seedTestAuth(page, auth);

  await page.goto("/board");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  const overdueSection = page.locator(".MuiPaper-root").filter({
    has: page.getByRole("heading", { name: /overdue/i })
  }).first();
  const todaySection = page.locator(".MuiPaper-root").filter({
    has: page.getByRole("heading", { name: /today/i })
  }).first();
  const nextWeekSection = page.locator(".MuiPaper-root").filter({
    has: page.getByRole("heading", { name: /next 7 days/i })
  }).first();
  const noDateSection = page.locator(".MuiPaper-root").filter({
    has: page.getByRole("heading", { name: /no date/i })
  }).first();

  await expect(overdueSection.getByRole("link", { name: overdueTask.title })).toBeVisible();
  await expect(todaySection.getByRole("link", { name: todayTask.title })).toBeVisible();
  await expect(nextWeekSection.getByRole("link", { name: nextWeekTask.title })).toBeVisible();
  await expect(noDateSection.getByText(/everything has a date\./i)).toBeVisible();

  await overdueSection.getByRole("link", { name: overdueTask.title }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${overdueTask._id}$`));
  await expect(page.getByRole("heading", { name: overdueTask.title })).toBeVisible();

  await page.goto("/board");
  await todaySection.getByRole("link", { name: todayTask.title }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${todayTask._id}$`));
  await expect(page.getByRole("heading", { name: todayTask.title })).toBeVisible();

  await page.goto("/board");
  await nextWeekSection.getByRole("link", { name: nextWeekTask.title }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${nextWeekTask._id}$`));
  await expect(page.getByRole("heading", { name: nextWeekTask.title })).toBeVisible();
});
