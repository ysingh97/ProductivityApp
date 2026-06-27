const { test, expect } = require("@playwright/test");
const {
  createTaskFixture,
  createTaskTimeEntryFixture,
  uniqueSuffix
} = require("./support/api");
const { seedTestAuth } = require("./support/auth");

test("handles range controls, chart modes, and empty states in visualizations", async ({
  page
}) => {
  const suffix = uniqueSuffix();
  const session = `visualizations-${suffix}`;
  const auth = { session };
  const workTask = await createTaskFixture({
    title: `Work Hours ${suffix}`,
    category: "Work",
    estimatedCompletionTime: 4,
    targetCompletionDate: "2026-06-10T18:00:00.000Z"
  }, auth);
  const healthTask = await createTaskFixture({
    title: `Health Hours ${suffix}`,
    category: "Health",
    estimatedCompletionTime: 3,
    targetCompletionDate: "2026-06-12T18:00:00.000Z"
  }, auth);

  await createTaskTimeEntryFixture(workTask._id, {
    startedAt: "2026-06-10T09:00:00.000Z",
    endedAt: "2026-06-10T11:00:00.000Z"
  }, auth);
  await createTaskTimeEntryFixture(healthTask._id, {
    startedAt: "2026-06-12T10:00:00.000Z",
    endedAt: "2026-06-12T11:30:00.000Z"
  }, auth);

  await seedTestAuth(page, auth);

  await page.goto("/visualizations");
  await expect(page.getByRole("heading", { name: /data visualizations/i })).toBeVisible();

  await page.getByRole("button", { name: /^custom$/i }).click();
  await page.getByLabel("Start date").fill("2026-06-01");
  await page.getByLabel("End date").fill("2026-06-30");

  await expect(page.getByRole("button", { name: "Work", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Health", exact: true })).toBeVisible();

  await page.getByLabel("Start date").fill("2026-07-01");
  await page.getByLabel("End date").fill("2026-06-01");
  await expect(page.getByText(/start date must be on or before end date\./i).first()).toBeVisible();

  await page.getByLabel("Start date").fill("2026-06-01");
  await page.getByLabel("End date").fill("2026-06-30");
  await expect(page.getByRole("button", { name: "Work", exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^bars$/i }).click();
  await expect(page.getByRole("button", { name: "Health", exact: true })).toBeVisible();

  await page.getByRole("button", { name: /^stacked$/i }).click();
  await expect(page.getByRole("heading", { name: "Stacked categories" })).toBeVisible();

  await page.getByRole("button", { name: /^lines$/i }).click();
  await expect(page.getByRole("heading", { name: "Category lines" })).toBeVisible();

  await page.getByRole("button", { name: "Total hours", exact: true }).click();
  await page.getByRole("button", { name: "Work", exact: true }).click();
  await page.getByRole("button", { name: "Health", exact: true }).click();
  await expect(page.getByText(/no visible trend series selected\./i)).toBeVisible();

  await page.getByRole("button", { name: /^month$/i }).first().click();
  await page.getByRole("button", { name: /^custom$/i }).click();
  await page.getByLabel("Start date").fill("2027-01-01");
  await page.getByLabel("End date").fill("2027-01-31");
  await expect(page.getByText(/no time entry data is available for this range\./i).first()).toBeVisible();
});
