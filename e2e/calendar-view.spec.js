const { test, expect } = require("@playwright/test");
const dayjs = require("dayjs");
const { createGoalFixture, createTaskFixture, futureIso, uniqueSuffix } = require("./support/api");
const { seedTestAuth } = require("./support/auth");

const getWeekLabel = (date) => {
  const start = dayjs(date).startOf("week");
  const end = dayjs(date).endOf("week");
  return `${start.format("MMM D")} - ${end.format("MMM D, YYYY")}`;
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getGoalFilterCheckbox = (page, goalTitle) =>
  page
    .locator(".MuiPaper-root")
    .filter({ hasText: "Top-level goals" })
    .getByText(goalTitle, { exact: true })
    .locator('xpath=ancestor::div[1]')
    .locator('input[type="checkbox"]')
    .first();

const getTopLevelGoalLink = (page, goalTitle) =>
  page.getByRole("link", {
    name: new RegExp(`top-level\\s+${escapeRegExp(goalTitle)}`, "i")
  });

test("navigates and filters the calendar across week and month views", async ({ page }) => {
  const suffix = uniqueSuffix();
  const today = dayjs();
  const session = `calendar-view-${suffix}`;
  const auth = { session };
  const weekStart = today.startOf("week");
  const rootGoal = await createGoalFixture({
    title: `Launch Goal ${suffix}`,
    category: "Work",
    targetCompletionDate: weekStart.add(1, "day").hour(10).minute(0).second(0).millisecond(0).toISOString()
  }, auth);
  await createGoalFixture({
    title: `Launch Subgoal ${suffix}`,
    category: "Work",
    parentGoalId: rootGoal._id,
    targetCompletionDate: weekStart.add(2, "day").hour(10).minute(0).second(0).millisecond(0).toISOString()
  }, auth);
  await createGoalFixture({
    title: `Health Goal ${suffix}`,
    category: "Health",
    targetCompletionDate: weekStart.add(3, "day").hour(10).minute(0).second(0).millisecond(0).toISOString()
  }, auth);
  const launchTask = await createTaskFixture({
    title: `Launch Task ${suffix}`,
    category: "Work",
    parentGoalId: rootGoal._id,
    targetCompletionDate: weekStart.add(4, "day").hour(14).minute(0).second(0).millisecond(0).toISOString()
  }, auth);
  const standaloneTask = await createTaskFixture({
    title: `Standalone Task ${suffix}`,
    category: "Health",
    targetCompletionDate: weekStart.add(5, "day").hour(11).minute(0).second(0).millisecond(0).toISOString()
  }, auth);

  await seedTestAuth(page, auth);

  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();
  await expect(page.getByText(getWeekLabel(new Date()))).toBeVisible();
  await expect(page.getByText(launchTask.title, { exact: true })).toBeVisible();
  await expect(page.getByText(standaloneTask.title, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^month$/i }).click();
  await expect(page.getByText(dayjs().format("MMMM YYYY"))).toBeVisible();
  await expect(page.getByText("Sun", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^week$/i }).click();
  await expect(page.getByText(getWeekLabel(new Date()))).toBeVisible();

  await page.getByRole("checkbox", { name: /show tasks/i }).click();
  await expect(page.getByText(launchTask.title, { exact: true })).toHaveCount(0);
  await expect(page.getByText(standaloneTask.title, { exact: true })).toHaveCount(0);
  await expect(getTopLevelGoalLink(page, rootGoal.title)).toBeVisible();

  await page.getByRole("checkbox", { name: /show tasks/i }).click();
  await expect(page.getByText(launchTask.title, { exact: true })).toBeVisible();

  await page.getByRole("button", { name: /clear/i }).click();
  await expect(page.getByText(launchTask.title, { exact: true })).toHaveCount(0);
  await expect(getTopLevelGoalLink(page, rootGoal.title)).toHaveCount(0);

  await page.getByRole("button", { name: /select all/i }).click();
  await expect(page.getByText(launchTask.title, { exact: true })).toBeVisible();
  await expect(page.getByText(standaloneTask.title, { exact: true })).toBeVisible();

  await getGoalFilterCheckbox(page, rootGoal.title).uncheck();
  await expect(page.getByText(launchTask.title, { exact: true })).toHaveCount(0);
  await expect(page.getByText(standaloneTask.title, { exact: true })).toBeVisible();

  await page.getByText(standaloneTask.title, { exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${standaloneTask._id}$`));
  await expect(page.getByRole("heading", { name: standaloneTask.title })).toBeVisible();

  await page.goto("/calendar");
  await expect(getTopLevelGoalLink(page, rootGoal.title)).toHaveCount(0);
  await page.getByRole("button", { name: /select all/i }).click();
  await getTopLevelGoalLink(page, rootGoal.title).click();
  await expect(page).toHaveURL(new RegExp(`/goals/${rootGoal._id}$`));
  await expect(page.getByRole("heading", { name: rootGoal.title })).toBeVisible();
});
