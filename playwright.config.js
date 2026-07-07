const { defineConfig, devices } = require("@playwright/test");

const frontendBaseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const apiBaseUrl = process.env.E2E_API_BASE_URL || "http://localhost:5000/api";
const frontendApiUrl = process.env.REACT_APP_API_URL || apiBaseUrl;
const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "e2e-google-client-id";

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["dot"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: frontendBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: [
    {
      name: "api",
      command: "npm start",
      cwd: "./app-server",
      url: `${apiBaseUrl}/health`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        NODE_ENV: "development",
        ALLOW_TEST_AUTH: "true",
        CORS_ALLOWED_ORIGINS: "http://localhost:3000"
      }
    },
    {
      name: "frontend",
      command: "npm start",
      cwd: ".",
      url: frontendBaseUrl,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...process.env,
        BROWSER: "none",
        REACT_APP_API_URL: frontendApiUrl,
        REACT_APP_GOOGLE_CLIENT_ID: googleClientId
      }
    }
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ]
});
