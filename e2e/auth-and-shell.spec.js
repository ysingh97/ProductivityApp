const { test, expect } = require("@playwright/test");
const { seedTestAuth, TEST_AUTH_USER } = require("./support/auth");

test("redirects signed-out users away from protected routes", async ({ page }) => {
  await page.goto("/board");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/welcome back/i)).toBeVisible();
  await expect(page.getByText(/productivity hub/i)).toBeVisible();
});

test("keeps the authenticated shell stable across navigation, refresh, theme changes, and sign-out", async ({
  page
}) => {
  await seedTestAuth(page);

  await page.goto("/board");
  await expect(page).toHaveURL(/\/board$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(TEST_AUTH_USER.email)).toBeVisible();

  await page.getByRole("button", { name: /open navigation menu/i }).click();
  await page.getByRole("link", { name: /in-depth goals view/i }).click();
  await expect(page).toHaveURL(/\/goals\/overview$/);
  await expect(page.getByRole("textbox", { name: /search goals/i })).toBeVisible();

  await page.getByRole("button", { name: /open navigation menu/i }).click();
  await page.getByRole("link", { name: /^calendar/i }).click();
  await expect(page).toHaveURL(/\/calendar$/);
  await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();

  await page.getByRole("button", { name: /open navigation menu/i }).click();
  await page.getByRole("link", { name: /^lists/i }).click();
  await expect(page).toHaveURL(/\/lists$/);
  await expect(page.getByRole("heading", { name: "Lists", exact: true })).toBeVisible();

  await page.getByRole("button", { name: /open navigation menu/i }).click();
  await page.getByRole("link", { name: /data visualizations/i }).click();
  await expect(page).toHaveURL(/\/visualizations$/);
  await expect(page.getByRole("heading", { name: "Data visualizations" })).toBeVisible();

  await page.getByRole("button", { name: /switch to dark mode/i }).click();
  await page.reload();
  await expect(page).toHaveURL(/\/visualizations$/);
  await expect(page.getByRole("button", { name: /switch to light mode/i })).toBeVisible();

  await page.getByRole("button", { name: new RegExp(TEST_AUTH_USER.email, "i") }).click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/welcome back/i)).toBeVisible();
});
