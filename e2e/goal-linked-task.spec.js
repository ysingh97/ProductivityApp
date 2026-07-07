const { test, expect } = require("@playwright/test");
const { createGoalFixture, createListFixture, futureIso, uniqueSuffix } = require("./support/api");
const { seedTestAuth } = require("./support/auth");
const { fillDateTimeField, fillDateTimeGroup } = require("./support/datetime");

const selectComboboxOption = async (page, label, optionLabel) => {
  await page.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: optionLabel, exact: true }).click();
};

test("creates a goal-linked task with inherited rules and updates it from the task detail view", async ({
  page
}) => {
  const suffix = uniqueSuffix();
  const session = `goal-linked-task-${suffix}`;
  const auth = { session };
  const parentGoal = await createGoalFixture({
    title: `Parent Goal ${suffix}`,
    description: "Goal used for Playwright goal-linked task coverage.",
    category: "Delivery",
    estimatedHours: 12,
    targetCompletionDate: futureIso(20)
  }, auth);
  const list = await createListFixture({
    title: `Execution List ${suffix}`,
    description: "List selected during the task edit flow."
  }, auth);
  const laterThanParent = new Date(parentGoal.targetCompletionDate);
  const validTaskDate = new Date(parentGoal.targetCompletionDate);
  const editedTaskDate = new Date(parentGoal.targetCompletionDate);
  const createdTaskTitle = `Goal Linked Task ${suffix}`;
  const editedTaskTitle = `Goal Linked Task Updated ${suffix}`;

  laterThanParent.setDate(laterThanParent.getDate() + 1);
  validTaskDate.setDate(validTaskDate.getDate() - 2);
  validTaskDate.setHours(11, 0, 0, 0);
  editedTaskDate.setDate(editedTaskDate.getDate() - 1);
  editedTaskDate.setHours(9, 30, 0, 0);

  await seedTestAuth(page, auth);

  await page.goto(`/goals/${parentGoal._id}`);
  await expect(page.getByRole("heading", { name: parentGoal.title })).toBeVisible();

  await page.getByRole("link", { name: /create sub-task/i }).click();
  await expect(page).toHaveURL(new RegExp(`/task/new\\?goalId=${parentGoal._id}$`));
  await expect(page.getByRole("heading", { name: /create task/i }).first()).toBeVisible();

  await expect(page.getByRole("combobox", { name: /parent goal/i })).toHaveValue(parentGoal.title);
  await expect(page.getByRole("combobox", { name: /category/i })).toBeDisabled();
  await expect(page.getByRole("combobox", { name: /category/i })).toHaveValue("Delivery");

  await page.getByLabel("Title").fill(createdTaskTitle);
  await page.getByLabel("Description").fill("Created from the parent goal flow.");
  await page.getByLabel("Estimated hours").fill("3");

  await fillDateTimeField(page, "Target Completion Date", laterThanParent);
  await page.getByRole("button", { name: /^create task$/i }).click();

  await expect(
    page.getByText(/subtasks cannot have a target completion date later than the parent goal\./i)
  ).toBeVisible();

  await fillDateTimeField(page, "Target Completion Date", validTaskDate);
  await page.getByRole("button", { name: /^create task$/i }).click();

  await expect(page.getByText(`Created "${createdTaskTitle}".`)).toBeVisible();
  await page.getByRole("link", { name: /^open$/i }).click();

  await expect(page).toHaveURL(/\/tasks\/[a-f0-9]{24}$/);
  await expect(page.getByRole("heading", { name: createdTaskTitle })).toBeVisible();
  await expect(
    page
      .getByText("Parent goal", { exact: true })
      .locator("..")
      .getByText(parentGoal.title, { exact: true })
  ).toBeVisible();
  await expect(page.getByText("Delivery", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: /edit task details/i }).click();
  await expect(page.getByRole("button", { name: /save changes/i })).toBeVisible();

  await page.getByLabel("Title").fill(editedTaskTitle);
  await page.getByLabel("Description").fill("Edited from the task detail page.");
  await selectComboboxOption(page, /list/i, list.title);
  await page.getByLabel(/estimated completion time \(hours\)/i).fill("4");
  await fillDateTimeGroup(
    page.getByText("Target date", { exact: true }).locator("..").getByRole("group").first(),
    editedTaskDate
  );
  await page.getByRole("switch", { name: /mark complete/i }).click();
  await page.getByRole("button", { name: /save changes/i }).click();

  await expect(page.getByRole("heading", { name: editedTaskTitle })).toBeVisible();
  await expect(page.getByText(/complete/i).first()).toBeVisible();
  await expect(page.getByText(list.title, { exact: true })).toBeVisible();

  await page.goto(`/lists/${list._id}`);
  await expect(page.getByRole("heading", { name: list.title })).toBeVisible();
  await expect(page.getByText(editedTaskTitle, { exact: true })).toBeVisible();
  await expect(page.getByText("Complete", { exact: true }).first()).toBeVisible();

  await page.goto(`/goals/${parentGoal._id}/tree`);
  await expect(page.getByRole("heading", { name: /goal tree view/i })).toBeVisible();
  await expect(page.getByText(editedTaskTitle, { exact: true })).toBeVisible();
  await expect(page.getByText("Complete", { exact: true }).first()).toBeVisible();
});
