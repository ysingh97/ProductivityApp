const { test, expect } = require("@playwright/test");
const {
  createGoalFixture,
  createTaskFixture,
  uniqueSuffix
} = require("./support/api");
const { seedTestAuth } = require("./support/auth");
const { fillDateTimeField } = require("./support/datetime");

test("updates goal rollups after logging time on a descendant task", async ({ page }) => {
  const goal = await createGoalFixture({
    title: `Playwright Rollup Goal ${uniqueSuffix()}`,
    description: "Used by the Playwright goal rollup spec.",
    category: "Strategy",
    estimatedHours: 6
  });
  const task = await createTaskFixture({
    title: `Playwright Goal Task ${uniqueSuffix()}`,
    description: "Child task used by the Playwright goal rollup spec.",
    parentGoalId: goal._id,
    estimatedCompletionTime: 4
  });
  const start = new Date();
  const end = new Date();

  start.setDate(start.getDate() - 1);
  start.setHours(13, 0, 0, 0);
  end.setTime(start.getTime());
  end.setHours(14, 30, 0, 0);

  await seedTestAuth(page);
  await page.goto(`/goals/${goal._id}`);

  await expect(page.getByRole("heading", { name: goal.title })).toBeVisible();
  await expect(page.getByText("0 / 6 hrs")).toBeVisible();

  await page.goto(`/tasks/${task._id}`);
  await expect(page.getByRole("heading", { name: task.title })).toBeVisible();

  await fillDateTimeField(page, "Start time", start);
  await fillDateTimeField(page, "End time", end);
  await page.getByRole("button", { name: /^log time$/i }).click();

  await expect(
    page.getByText("Logged 1.5 hours. Total time is now 1.5 hours.")
  ).toBeVisible();

  await page.goto(`/goals/${goal._id}`);
  await page.reload();

  await expect(page.getByRole("heading", { name: goal.title })).toBeVisible();
  await expect(page.getByText("1.5 / 6 hrs")).toBeVisible();

  await page.getByRole("link", { name: /open tree view/i }).click();

  await expect(page).toHaveURL(new RegExp(`/goals/${goal._id}/tree$`));
  await expect(page.getByRole("heading", { name: /goal tree view/i })).toBeVisible();
  await expect(page.getByText(task.title, { exact: true })).toBeVisible();
  await expect(page.getByText("1.5 / 4 hrs")).toBeVisible();
  await expect(
    page.getByText(/Estimated 6h \| Spent 1\.5h \| Left 4\.5h/)
  ).toBeVisible();
});
