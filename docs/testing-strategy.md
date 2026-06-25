# Testing Strategy

## Current baseline

- Backend: `npm --prefix app-server test` passes 66 tests across auth gating, analytics date/bucket math, list route validation, task time-entry lifecycle, and goal/task total rollups.
- Frontend: the React test runner now executes again, but automated UI coverage is still only smoke-level.
- Automation enabler: non-production `test:*` auth tokens now work in the frontend auth context, which means browser automation can bypass Google sign-in when `ALLOW_TEST_AUTH=true` on the backend.
- Existing unit-style coverage is limited. The clearest current example is model-level validation in `app-server/__tests__/timeEntry.test.js`.

## What is already covered well

- Analytics aggregation logic, including date-range overlap handling and bucket generation.
- Goal/task derived totals (`timeSpent`, `timeLeft`) and ancestor rollups.
- Task time-entry create, update, delete, duplicate handling, and user isolation.
- Protected-route auth enforcement in the backend.
- Mock persona data seeding in backend tests.

## Highest-value gaps

### Backend integration gaps

1. `app-server/routes/authRoutes.js`
   - Missing tests for missing credentials, invalid credentials, and user upsert/update behavior.
2. `app-server/routes/categoryRoutes.js`
   - Missing tests for auth protection, alphabetical sorting, and cross-user isolation.
3. `app-server/controllers/googleCalendarController.js`
   - No automated coverage for connect URL generation, callback success/error handling, status responses, settings saves, manual sync, and disconnect.
4. CRUD negative paths
   - Add 400/404 coverage for invalid `goalId`, `listId`, `taskId`, parent self-reference, and malformed payloads on task/goal/list routes.
5. CORS and app wiring
   - Add a small suite around `app-server/app.js` to verify allowed/disallowed origins and the unauthenticated health endpoint.

### Frontend component and page gaps

1. Auth/session handling
   - `src/context/AuthContext.js`
   - `src/api/client.js`
   - `src/components/RequireAuth.js`
2. Task creation/editing/time-entry flows
   - `src/features/tasks/taskForm.js`
   - `src/features/tasks/taskView.js`
3. Goal creation/editing and hierarchy rules
   - `src/features/goals/goalForm.js`
   - `src/features/goals/goalView.js`
   - `src/pages/GoalTreeView.js`
4. View/filter-heavy pages
   - `src/pages/GoalsOverview.js`
   - `src/pages/CalendarView.js`
   - `src/pages/Visualizations.js`
5. Google Calendar settings state machine
   - `src/pages/GoogleCalendarSettings.js`
6. Reparenting regressions
   - task moved from one goal tree to another
   - sub-goal moved from one parent goal to another
   - old/new ancestor totals, tree placement, and inherited category/deadline behavior

### Unit-test gaps

1. Extracted pure business logic
   - Several high-value rules live inside large React components or controllers, which makes them awkward to unit test directly.
2. Reused validation rules
   - Task and goal deadline, estimate, and parent-child constraints are duplicated across create/edit surfaces and should be centralized.
3. Date/range derivation helpers
   - Calendar and analytics logic should be covered by fast deterministic tests before relying on page-level or route-level coverage.

## Recommended test pyramid

### 0. Unit tests

Use unit tests for pure logic and small validation/state helpers. These should be the fastest tests in the repo and should not require routing, DOM rendering, HTTP mocking, or MongoDB.

Good fit:

- date parsing, bucketing, and range-label logic
- auth token parsing and expiry checks
- task/goal validation rules
- tree and rollup helper functions once extracted from controllers/components

Poor fit:

- route wiring
- persistence behavior
- CORS behavior
- browser refresh/deep-link regressions
- cross-page user workflows

Best extraction targets for this repo:

1. `src/context/AuthContext.js`
   - Extract `isTestAuthToken`, `decodeJwtPayload`, and `isTokenExpired` into a small auth utility module.
2. `src/features/tasks/taskForm.js` and `src/features/tasks/taskView.js`
   - Extract shared task validation into a `taskValidation` helper:
   - future-date checks
   - parent-goal deadline checks
   - estimate parsing/normalization
   - time-entry range validation
3. `src/features/goals/goalForm.js` and `src/features/goals/goalView.js`
   - Extract shared goal validation into a `goalValidation` helper:
   - future-date checks
   - parent-goal deadline checks
   - estimate parsing/normalization
4. `src/pages/Visualizations.js`
   - Extract range and chart-state helpers:
   - `formatRangeLabel`
   - `getAutoBucket`
   - `getAllowedBuckets`
   - `getPreviousRangeState`
   - signed-hour formatting and snapshot derivation
5. `src/pages/CalendarView.js` and `src/components/DashboardCalendar.js`
   - Extract calendar/tree helpers:
   - top-level goal resolution
   - item filtering by date range
   - per-day grouping
6. `app-server/controllers/analyticsController.js`
   - Extract analytics date helpers and bucket math into a utility/service module so they can be tested without Express or Mongo setup.
7. `app-server/controllers/taskController.js` and `app-server/controllers/goalController.js`
   - Extract parent/deadline/category normalization rules where possible, then unit test them separately from route integration tests.

### 1. Backend integration tests

Keep using Jest + Supertest + `mongodb-memory-server`.

Add next:

- Small unit suites for extracted analytics, auth, and validation helpers.
- Auth route tests for `/api/auth/google`.
- Category route tests for `/api/categories`.
- Google Calendar route/controller tests with mocked service dependencies.
- Negative-path validation tests for goal/task/list CRUD.
- App-level CORS tests.

### 2. Frontend page integration tests

Use React Testing Library with MSW.

Prioritize:

1. `App`, `RequireAuth`, and `apiClient` 401 handling.
2. `TaskForm` and `GoalForm` behavior after shared validation logic is extracted.
3. `TaskView` time-entry add/edit/delete flows.
4. `GoalsOverview` filters/sorts.
5. `CalendarView` and `Visualizations` control state changes.
6. `GoogleCalendarSettings` connected/disconnected/error states.

### 3. Browser E2E tests

Use Playwright.

Automate first:

1. Auth bootstrap and protected-route access.
2. Deep-link and browser refresh resilience on routed pages.
3. Create list.
4. Create standalone task.
5. Create goal-linked task.
6. Log/edit/delete task time.
7. Goal rollup update after time-entry changes.
8. Goal/task reparenting between different parent goal trees.
9. Calendar and analytics smoke checks.

Do not start with:

- Real Google sign-in UI automation.
- Live Google Calendar API automation in CI.

Instead:

- Seed `localStorage.authToken = "test:basic"` and `localStorage.authUser`.
- Run the backend with `ALLOW_TEST_AUTH=true`.
- Stub or sandbox Google Calendar endpoints for CI.

## Suggested implementation order

### Phase 1

- Keep backend suite green.
- Extract pure helpers before adding large numbers of frontend tests.
- Add focused unit tests for extracted auth, analytics, and validation helpers.
- Add MSW to frontend tests.
- Add page-level tests for auth, task form, goal form, and task time-entry flows.

### Phase 2

- Add Playwright with seeded test personas.
- Automate the `P0` scenarios from `docs/manual-e2e-test-pass.md`.
- Run Playwright smoke on every PR.

### Phase 3

- Expand Playwright to cover filters, calendar, analytics, and delete/detach semantics.
- Add explicit reparenting regression coverage for goals and tasks, including old/new ancestor total validation.
- Add Google Calendar controller tests with service mocks.
- Add monthly extended regression coverage for multi-account isolation and external integrations.

## Definition of done

- Every user-facing flow has at least one automated test at the highest-value layer.
- Every validation rule has either a backend integration test or a page-level frontend test.
- Every bug fix adds a regression test.
- CI runs:
  - backend Jest
  - frontend Jest
  - frontend build
  - Playwright smoke
