const { test, expect } = require("@playwright/test");
const { seedTestAuth } = require("./support/auth");

test("walks the Google Calendar settings UI through connect, save, sync, and disconnect states", async ({
  page
}) => {
  const session = `google-calendar-settings-${Date.now()}`;
  let connected = false;
  let selectedCalendarId = "";
  let selectedCalendarSummary = "";
  let syncEnabled = true;
  let lastSyncAt = null;

  const calendars = [
    { id: "calendar-primary", summary: "Primary Calendar", primary: true },
    { id: "calendar-team", summary: "Team Calendar", primary: false }
  ];

  await page.route("**/api/integrations/google-calendar/connect-url", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://accounts.google.com/o/oauth2/auth?mock=1"
      })
    });
  });

  await page.route("**/api/integrations/google-calendar/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        connected,
        googleEmail: connected ? "sync@example.test" : "",
        selectedCalendarId,
        selectedCalendarSummary,
        syncEnabled,
        lastSyncAt,
        lastSyncError: ""
      })
    });
  });

  await page.route("**/api/integrations/google-calendar/calendars", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(calendars)
    });
  });

  await page.route("**/api/integrations/google-calendar/settings", async (route) => {
    const body = route.request().postDataJSON();
    selectedCalendarId = body.selectedCalendarId;
    selectedCalendarSummary = body.selectedCalendarSummary;
    syncEnabled = body.syncEnabled;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        selectedCalendarId,
        selectedCalendarSummary,
        syncEnabled
      })
    });
  });

  await page.route("**/api/integrations/google-calendar/sync-now", async (route) => {
    lastSyncAt = "2026-06-26T19:30:00.000Z";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ queued: true })
    });
  });

  await page.route("**/api/integrations/google-calendar/disconnect", async (route) => {
    connected = false;
    selectedCalendarId = "";
    selectedCalendarSummary = "";
    syncEnabled = true;
    lastSyncAt = null;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ disconnected: true })
    });
  });

  await page.route("https://accounts.google.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body>Mock Google OAuth</body></html>"
    });
  });

  await seedTestAuth(page, { session });

  await page.goto("/settings/google-calendar");
  await expect(page.getByRole("heading", { name: "Google Calendar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /connect google calendar/i })).toBeVisible();

  await Promise.all([
    page.waitForURL(/accounts\.google\.com/),
    page.getByRole("button", { name: /connect google calendar/i }).click()
  ]);
  await expect(page.getByText("Mock Google OAuth")).toBeVisible();

  connected = true;
  await page.goto("/settings/google-calendar?googleCalendar=connected");
  await expect(
    page.getByText(/google calendar connected\. choose a calendar and save your sync settings\./i)
  ).toBeVisible();
  await expect(page.getByText(/connected as sync@example\.test/i)).toBeVisible();

  await page.getByRole("combobox", { name: /destination calendar/i }).click();
  await page.getByRole("option", { name: "Team Calendar", exact: true }).click();
  await page.getByRole("switch", { name: /enable automatic sync after app changes/i }).click();
  await page.getByRole("button", { name: /save settings/i }).click();

  await expect(
    page.getByText(/google calendar settings saved\. a full resync has been queued\./i)
  ).toBeVisible();
  await expect(page.getByText("Sync paused")).toBeVisible();

  await page.getByRole("button", { name: /sync now/i }).click();
  await expect(page.getByText(/google calendar sync queued\./i)).toBeVisible();
  await expect(page.getByRole("combobox", { name: /destination calendar/i })).toHaveText(
    "Team Calendar"
  );
  await expect(page.getByText("Jun 26, 2026, 12:30 PM")).toBeVisible();

  await page.getByRole("button", { name: /disconnect google calendar/i }).click();
  await expect(page.getByText(/google calendar disconnected\./i)).toBeVisible();
  await expect(page.getByRole("button", { name: /connect google calendar/i })).toBeVisible();
});
