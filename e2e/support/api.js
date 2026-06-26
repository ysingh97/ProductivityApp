const { TEST_AUTH_TOKEN } = require("./auth");

const apiBaseUrl = process.env.E2E_API_BASE_URL || "http://localhost:5000/api";

const uniqueSuffix = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const futureIso = (daysFromNow = 14) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
};

const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${TEST_AUTH_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(
      `API ${options.method || "GET"} ${path} failed with ${response.status}: ${text}`
    );
  }

  return data;
};

const createListFixture = (overrides = {}) =>
  apiRequest("/lists", {
    method: "POST",
    body: {
      title: `E2E List ${uniqueSuffix()}`,
      description: "Playwright smoke list.",
      ...overrides
    }
  });

const createGoalFixture = (overrides = {}) =>
  apiRequest("/goals", {
    method: "POST",
    body: {
      title: `E2E Goal ${uniqueSuffix()}`,
      description: "Playwright smoke goal.",
      category: "Work",
      estimatedHours: 4,
      targetCompletionDate: futureIso(21),
      ...overrides
    }
  });

const createTaskFixture = (overrides = {}) =>
  apiRequest("/tasks", {
    method: "POST",
    body: {
      title: `E2E Task ${uniqueSuffix()}`,
      description: "Playwright smoke task.",
      category: "Work",
      estimatedCompletionTime: 2,
      targetCompletionDate: futureIso(14),
      ...overrides
    }
  });

module.exports = {
  apiBaseUrl,
  apiRequest,
  createGoalFixture,
  createListFixture,
  createTaskFixture,
  futureIso,
  uniqueSuffix
};
