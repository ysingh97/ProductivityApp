const { test, expect } = require("@playwright/test");
const { seedTestAuth } = require("./support/auth");
const { uniqueSuffix } = require("./support/api");

test("creates a list from the UI after blocking empty-title submission", async ({
  page
}) => {
  const listTitle = `Playwright List ${uniqueSuffix()}`;
  const listDescription = "Created by the Playwright smoke suite.";

  await seedTestAuth(page);
  await page.goto("/lists/new");

  await expect(page.getByRole("heading", { name: /create list/i }).first()).toBeVisible();

  const titleField = page.getByLabel("Title");
  await page.getByRole("button", { name: /^create list$/i }).click();
  await expect(titleField).toBeFocused();
  expect(
    await titleField.evaluate((input) => input.validationMessage)
  ).not.toEqual("");

  await titleField.fill(listTitle);
  await page.getByLabel("Description").fill(listDescription);
  await page.getByRole("button", { name: /^create list$/i }).click();

  await expect(page.getByText(`Created "${listTitle}".`)).toBeVisible();
  await page.getByRole("link", { name: /^open$/i }).click();

  await expect(page).toHaveURL(/\/lists\/[a-f0-9]{24}$/);
  await expect(page.getByRole("heading", { name: listTitle })).toBeVisible();
  await expect(page.getByText(listDescription)).toBeVisible();
  await expect(page.getByText(/0 tasks/i)).toBeVisible();
});
