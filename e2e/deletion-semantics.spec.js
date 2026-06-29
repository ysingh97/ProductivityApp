const { test, expect } = require("@playwright/test");
const {
  createGoalFixture,
  createTaskFixture,
  createTaskTimeEntryFixture,
  futureIso,
  uniqueSuffix
} = require("./support/api");
const { seedTestAuth } = require("./support/auth");

test("deletes timed tasks and detaches direct child goals and tasks when deleting a goal", async ({
  page
}) => {
  const suffix = uniqueSuffix();
  const session = `deletion-semantics-${suffix}`;
  const auth = { session };
  const rootGoal = await createGoalFixture({
    title: `Deletion Root ${suffix}`,
    description: "Root used by the Playwright deletion semantics spec.",
    category: "Work",
    estimatedHours: 10,
    targetCompletionDate: futureIso(30)
  }, auth);
  const goalToDelete = await createGoalFixture({
    title: `Delete Me ${suffix}`,
    description: "Goal that will be deleted through the UI.",
    category: "Work",
    estimatedHours: 5,
    parentGoalId: rootGoal._id,
    targetCompletionDate: futureIso(24)
  }, auth);
  const nestedChildGoal = await createGoalFixture({
    title: `Nested Survivor ${suffix}`,
    description: "Child goal that should survive detached.",
    category: "Work",
    estimatedHours: 2,
    parentGoalId: goalToDelete._id,
    targetCompletionDate: futureIso(18)
  }, auth);
  const taskToDelete = await createTaskFixture({
    title: `Delete Task ${suffix}`,
    description: "Timed task deleted directly.",
    category: "Work",
    estimatedCompletionTime: 1,
    parentGoalId: rootGoal._id,
    targetCompletionDate: futureIso(12)
  }, auth);
  const detachedTask = await createTaskFixture({
    title: `Detached Task ${suffix}`,
    description: "Direct child task of the deleted goal.",
    category: "Work",
    estimatedCompletionTime: 2,
    parentGoalId: goalToDelete._id,
    targetCompletionDate: futureIso(16)
  }, auth);
  const nestedTask = await createTaskFixture({
    title: `Nested Surviving Task ${suffix}`,
    description: "Task under the surviving nested child goal.",
    category: "Work",
    estimatedCompletionTime: 2,
    parentGoalId: nestedChildGoal._id,
    targetCompletionDate: futureIso(14)
  }, auth);

  await createTaskTimeEntryFixture(taskToDelete._id, {
    startedAt: "2026-06-20T09:00:00.000Z",
    endedAt: "2026-06-20T10:00:00.000Z"
  }, auth);
  await createTaskTimeEntryFixture(detachedTask._id, {
    startedAt: "2026-06-20T11:00:00.000Z",
    endedAt: "2026-06-20T12:30:00.000Z"
  }, auth);
  await createTaskTimeEntryFixture(nestedTask._id, {
    startedAt: "2026-06-20T13:00:00.000Z",
    endedAt: "2026-06-20T15:00:00.000Z"
  }, auth);

  await seedTestAuth(page, auth);

  await page.goto(`/tasks/${taskToDelete._id}`);
  await expect(page.getByRole("heading", { name: taskToDelete.title })).toBeVisible();
  await page.getByRole("button", { name: /delete task/i }).click();
  await page.getByRole("button", { name: /confirm delete/i }).click();

  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto(`/goals/${rootGoal._id}`);
  await expect(page.getByRole("heading", { name: rootGoal.title })).toBeVisible();
  await expect(page.getByText("3.5 / 10 hrs")).toBeVisible();

  await page.goto(`/goals/${goalToDelete._id}`);
  await expect(page.getByRole("heading", { name: goalToDelete.title })).toBeVisible();
  await page.getByRole("button", { name: /delete goal/i }).click();
  await page.getByRole("button", { name: /confirm delete/i }).click();

  await expect(page).toHaveURL(/\/goals\/overview$/);
  await expect(page.getByRole("heading", { name: /in-depth goals view/i })).toBeVisible();

  await page.goto(`/goals/${rootGoal._id}`);
  await expect(page.getByRole("heading", { name: rootGoal.title })).toBeVisible();
  await expect(page.getByText("0 / 10 hrs")).toBeVisible();

  await page.goto(`/goals/${nestedChildGoal._id}`);
  await expect(page.getByRole("heading", { name: nestedChildGoal.title })).toBeVisible();
  await expect(page.getByText("None", { exact: true }).first()).toBeVisible();

  await page.goto(`/tasks/${detachedTask._id}`);
  await expect(page.getByRole("heading", { name: detachedTask.title })).toBeVisible();
  await expect(page.getByText("None", { exact: true }).first()).toBeVisible();

  await page.goto(`/tasks/${nestedTask._id}`);
  await expect(page.getByRole("heading", { name: nestedTask.title })).toBeVisible();
  await expect(page.getByText(nestedChildGoal.title, { exact: true })).toBeVisible();
});
