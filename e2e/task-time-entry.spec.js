const { test, expect } = require("@playwright/test");
const { createTaskFixture, uniqueSuffix } = require("./support/api");
const { seedTestAuth } = require("./support/auth");
const { fillDateTimeField } = require("./support/datetime");

test("manages the task time-entry lifecycle from log to duplicate detection to edit and delete", async ({
  page
}) => {
  const task = await createTaskFixture({
    title: `Playwright Time Entry Task ${uniqueSuffix()}`,
    description: "Used by the Playwright time-entry lifecycle spec.",
    category: "Focus",
    estimatedCompletionTime: 4
  });
  const initialStart = new Date();
  const initialEnd = new Date();
  const editedEnd = new Date();
  const invalidStart = new Date();
  const invalidEnd = new Date();
  const futureStart = new Date();
  const futureEnd = new Date();

  initialStart.setDate(initialStart.getDate() - 1);
  initialStart.setHours(9, 0, 0, 0);
  initialEnd.setTime(initialStart.getTime());
  initialEnd.setHours(10, 30, 0, 0);

  editedEnd.setTime(initialStart.getTime());
  editedEnd.setHours(11, 30, 0, 0);

  invalidStart.setDate(invalidStart.getDate() - 1);
  invalidStart.setHours(14, 0, 0, 0);
  invalidEnd.setTime(invalidStart.getTime());
  invalidEnd.setHours(13, 0, 0, 0);

  futureStart.setHours(futureStart.getHours() - 1, 0, 0, 0);
  futureEnd.setTime(futureStart.getTime());
  futureEnd.setHours(futureEnd.getHours() + 2);

  await seedTestAuth(page);
  await page.goto(`/tasks/${task._id}`);

  await expect(page.getByRole("heading", { name: task.title })).toBeVisible();

  await fillDateTimeField(page, "Start time", initialStart);
  await fillDateTimeField(page, "End time", initialEnd);
  await page.getByRole("button", { name: /^log time$/i }).click();

  await expect(
    page.getByText("Logged 1.5 hours. Total time is now 1.5 hours.")
  ).toBeVisible();
  await expect(page.getByText("1h 30m")).toBeVisible();

  await fillDateTimeField(page, "Start time", initialStart);
  await fillDateTimeField(page, "End time", initialEnd);
  await page.getByRole("button", { name: /^log time$/i }).click();

  await expect(
    page.getByText("That exact time range was already logged. Total time remains 1.5 hours.")
  ).toBeVisible();

  await page.getByRole("button", { name: /edit time entry /i }).click();
  await fillDateTimeField(page, "Edit start time", initialStart);
  await fillDateTimeField(page, "Edit end time", editedEnd);
  await page.getByRole("button", { name: /save time entry /i }).click();

  await expect(
    page.getByText("Updated time entry to 2.5 hours. Total time is now 2.5 hours.")
  ).toBeVisible();
  await expect(page.getByText("2h 30m")).toBeVisible();

  await fillDateTimeField(page, "Start time", invalidStart);
  await fillDateTimeField(page, "End time", invalidEnd);
  await page.getByRole("button", { name: /^log time$/i }).click();

  await expect(page.getByText("End time must be after start time.")).toBeVisible();

  await fillDateTimeField(page, "Start time", futureStart);
  await fillDateTimeField(page, "End time", futureEnd);
  await page.getByRole("button", { name: /^log time$/i }).click();

  await expect(page.getByText("End time cannot be in the future.")).toBeVisible();

  await page.getByRole("button", { name: /delete time entry /i }).click();

  await expect(
    page.getByText("Deleted time entry. Total time is now 0 hours.")
  ).toBeVisible();
  await expect(page.getByText("No logged time yet for this task.")).toBeVisible();
});
