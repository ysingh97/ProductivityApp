const { test, expect } = require("@playwright/test");
const { createListFixture, createTaskFixture, uniqueSuffix } = require("./support/api");
const { seedTestAuth } = require("./support/auth");

test("keeps lists and tasks isolated across different test-auth personas", async ({ browser }) => {
  const suffix = uniqueSuffix();
  const basicList = await createListFixture(
    {
      title: `Basic List ${suffix}`,
      description: "Visible only to the basic persona."
    },
    { persona: "basic" }
  );
  const powerList = await createListFixture(
    {
      title: `Power List ${suffix}`,
      description: "Visible only to the power persona."
    },
    { persona: "power" }
  );
  const basicTask = await createTaskFixture(
    {
      title: `Basic Task ${suffix}`,
      category: "Work",
      listId: basicList._id,
      targetCompletionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    { persona: "basic" }
  );
  const powerTask = await createTaskFixture(
    {
      title: `Power Task ${suffix}`,
      category: "Work",
      listId: powerList._id,
      targetCompletionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    { persona: "power" }
  );

  const basicContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  const powerContext = await browser.newContext({ baseURL: "http://localhost:3000" });
  const basicPage = await basicContext.newPage();
  const powerPage = await powerContext.newPage();

  try {
    await seedTestAuth(basicPage, { persona: "basic" });
    await basicPage.goto("/lists");
    await expect(basicPage.getByRole("heading", { name: "Lists", exact: true })).toBeVisible();
    await expect(basicPage.getByText(basicList.title, { exact: true })).toBeVisible();
    await expect(basicPage.getByText(powerList.title, { exact: true })).toHaveCount(0);

    await basicPage.goto("/board");
    const basicNextWeekSection = basicPage.locator(".MuiPaper-root").filter({
      has: basicPage.getByRole("heading", { name: /next 7 days/i })
    }).first();
    await expect(basicNextWeekSection.getByRole("link", { name: basicTask.title })).toBeVisible();
    await expect(basicNextWeekSection.getByRole("link", { name: powerTask.title })).toHaveCount(0);

    await seedTestAuth(powerPage, { persona: "power" });
    await powerPage.goto("/lists");
    await expect(powerPage.getByRole("heading", { name: "Lists", exact: true })).toBeVisible();
    await expect(powerPage.getByText(powerList.title, { exact: true })).toBeVisible();
    await expect(powerPage.getByText(basicList.title, { exact: true })).toHaveCount(0);

    await powerPage.goto("/board");
    const powerNextWeekSection = powerPage.locator(".MuiPaper-root").filter({
      has: powerPage.getByRole("heading", { name: /next 7 days/i })
    }).first();
    await expect(powerNextWeekSection.getByRole("link", { name: powerTask.title })).toBeVisible();
    await expect(powerNextWeekSection.getByRole("link", { name: basicTask.title })).toHaveCount(0);

    await basicPage.goto("/lists");
    await expect(basicPage.getByText(basicList.title, { exact: true })).toBeVisible();
    await expect(basicPage.getByText(powerList.title, { exact: true })).toHaveCount(0);
  } finally {
    await basicContext.close();
    await powerContext.close();
  }
});
