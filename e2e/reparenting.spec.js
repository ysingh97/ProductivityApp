const { test, expect } = require("@playwright/test");
const {
  createGoalFixture,
  createTaskFixture,
  createTaskTimeEntryFixture,
  futureIso,
  uniqueSuffix
} = require("./support/api");
const { seedTestAuth } = require("./support/auth");

const selectParentGoal = async (page, label) => {
  await page.getByRole("combobox", { name: /parent goal/i }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
};

test("reparents goals and tasks across trees while keeping rollups and deadline guardrails correct", async ({
  page
}) => {
  const suffix = uniqueSuffix();
  const sourceRoot = await createGoalFixture({
    title: `Source Root ${suffix}`,
    description: "Source tree root for Playwright reparenting.",
    category: "Strategy",
    estimatedHours: 10,
    targetCompletionDate: futureIso(40)
  });
  const targetRoot = await createGoalFixture({
    title: `Target Root ${suffix}`,
    description: "Target tree root for Playwright reparenting.",
    category: "Health",
    estimatedHours: 20,
    targetCompletionDate: futureIso(50)
  });
  const tightGoal = await createGoalFixture({
    title: `Tight Deadline Root ${suffix}`,
    description: "Used to verify blocked reparenting.",
    category: "Health",
    estimatedHours: 8,
    targetCompletionDate: futureIso(15)
  });
  const movedGoal = await createGoalFixture({
    title: `Moved Goal ${suffix}`,
    description: "Child goal that will move trees.",
    category: "Strategy",
    estimatedHours: 6,
    parentGoalId: sourceRoot._id,
    targetCompletionDate: futureIso(20)
  });
  const goalDescendantTask = await createTaskFixture({
    title: `Goal Descendant Task ${suffix}`,
    description: "Task nested under the moved goal.",
    category: "Strategy",
    estimatedCompletionTime: 2,
    parentGoalId: movedGoal._id,
    targetCompletionDate: futureIso(18)
  });
  const movedTask = await createTaskFixture({
    title: `Moved Task ${suffix}`,
    description: "Direct task under the source tree root.",
    category: "Strategy",
    estimatedCompletionTime: 4,
    parentGoalId: sourceRoot._id,
    targetCompletionDate: futureIso(25)
  });

  await createTaskTimeEntryFixture(goalDescendantTask._id, {
    startedAt: "2026-06-20T09:00:00.000Z",
    endedAt: "2026-06-20T10:30:00.000Z"
  });
  await createTaskTimeEntryFixture(movedTask._id, {
    startedAt: "2026-06-20T12:00:00.000Z",
    endedAt: "2026-06-20T14:00:00.000Z"
  });

  await seedTestAuth(page);

  await page.goto(`/goals/${movedGoal._id}`);
  await expect(page.getByRole("heading", { name: movedGoal.title })).toBeVisible();

  await page.getByRole("button", { name: /edit details/i }).click();
  await expect(page.getByRole("combobox", { name: /parent goal/i })).toBeEnabled();

  await selectParentGoal(page, tightGoal.title);
  await expect(page.getByLabel("Category")).toHaveValue("Health");
  await expect(page.getByLabel("Category")).toBeDisabled();

  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(
    page.getByText(/sub-goals cannot have a target completion date later than the parent goal\./i)
  ).toBeVisible();

  await selectParentGoal(page, targetRoot.title);
  await page.getByRole("button", { name: /save changes/i }).click();

  await expect(page.getByRole("heading", { name: movedGoal.title })).toBeVisible();
  await expect(page.getByText(targetRoot.title, { exact: true })).toBeVisible();
  await expect(page.getByText(/health - /i)).toBeVisible();

  await page.goto(`/goals/${sourceRoot._id}/tree`);
  await expect(page.getByText(sourceRoot.title, { exact: true })).toBeVisible();
  await expect(page.getByText(movedGoal.title, { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Estimated 10h \| Spent 2h \| Left 8h/)).toBeVisible();
  await expect(page.getByText(movedTask.title, { exact: true })).toBeVisible();

  await page.goto(`/goals/${targetRoot._id}/tree`);
  await expect(page.getByText(targetRoot.title, { exact: true })).toBeVisible();
  await expect(page.getByText(movedGoal.title, { exact: true })).toBeVisible();
  await expect(page.getByText(/Estimated 20h \| Spent 1\.5h \| Left 18\.5h/)).toBeVisible();
  await expect(page.getByText(/Estimated 6h \| Spent 1\.5h \| Left 4\.5h/)).toBeVisible();
  await expect(page.getByText(goalDescendantTask.title, { exact: true })).toBeVisible();

  await page.goto(`/tasks/${movedTask._id}`);
  await expect(page.getByRole("heading", { name: movedTask.title })).toBeVisible();

  await page.getByRole("button", { name: /edit details/i }).click();
  await expect(page.getByRole("combobox", { name: /parent goal/i })).toBeEnabled();

  await selectParentGoal(page, targetRoot.title);
  await page.getByRole("button", { name: /save changes/i }).click();

  await expect(page.getByRole("heading", { name: movedTask.title })).toBeVisible();
  await expect(page.getByText(targetRoot.title, { exact: true })).toBeVisible();
  await expect(page.getByText(/health - /i)).toBeVisible();

  await page.goto(`/goals/${sourceRoot._id}/tree`);
  await expect(page.getByText(sourceRoot.title, { exact: true })).toBeVisible();
  await expect(page.getByText(movedGoal.title, { exact: true })).toHaveCount(0);
  await expect(page.getByText(movedTask.title, { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Estimated 10h \| Spent 0h \| Left 10h/)).toBeVisible();

  await page.goto(`/goals/${targetRoot._id}`);
  await expect(page.getByRole("heading", { name: targetRoot.title })).toBeVisible();
  await expect(page.getByText("3.5 / 20 hrs")).toBeVisible();

  await page.getByRole("link", { name: /open tree view/i }).click();
  await expect(page).toHaveURL(new RegExp(`/goals/${targetRoot._id}/tree$`));
  await expect(page.getByText(movedGoal.title, { exact: true })).toBeVisible();
  await expect(page.getByText(movedTask.title, { exact: true })).toBeVisible();
  await expect(page.getByText(/Estimated 20h \| Spent 3\.5h \| Left 16\.5h/)).toBeVisible();
  await expect(page.getByText("2 / 4 hrs")).toBeVisible();
});
