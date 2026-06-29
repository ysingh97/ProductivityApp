const { TEST_AUTH_TOKEN, createTestAuthSession, getTestAuthToken } = require("./auth");

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
  const session = options.session ? createTestAuthSession(options.session) : null;
  const authToken =
    options.token ||
    session?.token ||
    (options.persona ? getTestAuthToken(options.persona) : TEST_AUTH_TOKEN);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
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

const createListFixture = (overrides = {}, options = {}) =>
  apiRequest("/lists", {
    method: "POST",
    body: {
      title: `E2E List ${uniqueSuffix()}`,
      description: "Playwright smoke list.",
      ...overrides
    },
    ...options
  });

const createGoalFixture = (overrides = {}, options = {}) =>
  apiRequest("/goals", {
    method: "POST",
    body: {
      title: `E2E Goal ${uniqueSuffix()}`,
      description: "Playwright smoke goal.",
      category: "Work",
      estimatedHours: 4,
      targetCompletionDate: futureIso(21),
      ...overrides
    },
    ...options
  });

const createTaskFixture = (overrides = {}, options = {}) =>
  apiRequest("/tasks", {
    method: "POST",
    body: {
      title: `E2E Task ${uniqueSuffix()}`,
      description: "Playwright smoke task.",
      category: "Work",
      estimatedCompletionTime: 2,
      targetCompletionDate: futureIso(14),
      ...overrides
    },
    ...options
  });

const createTaskTimeEntryFixture = (taskId, overrides = {}, options = {}) =>
  apiRequest(`/tasks/${taskId}/time-entries`, {
    method: "POST",
    body: {
      startedAt: overrides.startedAt,
      endedAt: overrides.endedAt
    },
    ...options
  });

const updateTaskFixture = (taskId, updates = {}, options = {}) =>
  apiRequest(`/tasks/${taskId}`, {
    method: "PUT",
    body: updates,
    ...options
  });

module.exports = {
  apiBaseUrl,
  apiRequest,
  createGoalFixture,
  createListFixture,
  createTaskTimeEntryFixture,
  createTaskFixture,
  futureIso,
  updateTaskFixture,
  uniqueSuffix
};
