# Testing Strategy

## Current baseline

- Backend: `npm --prefix app-server test` passes 96 tests across auth routes, category routes, analytics range/bucket math, CRUD validation, goal/task total rollups, Google Calendar routes, CORS/health wiring, and test-auth helpers.
- Frontend: `npm test -- --watchAll=false` passes 70 tests across auth/session handling, shared validation helpers, task and goal forms/views, and page-level state for Goals Overview, Calendar, Visualizations, Google Calendar Settings, and Goal Tree View.
- Browser E2E: `npx playwright test` passes 20 Chromium specs across auth shell behavior, expired-session recovery, deep-link refreshes, list/task/goal workflows, goal creation, reparenting, delete semantics, dashboards, calendar, visualizations, Google Calendar settings, and multi-account isolation.
- Automation enabler: session-scoped `test:*` auth tokens let Playwright create isolated personas per scenario, so E2E specs do not need to share one long-lived mock account.

## Test commands

Use this as the single local runbook for test setup, targeted runs, and full verification.

### One-time setup

- Install frontend/root dependencies:
  ```powershell
  npm install
  ```
- Install backend dependencies:
  ```powershell
  npm --prefix app-server install
  ```
- Install Playwright's Chromium browser:
  ```powershell
  npm run test:e2e:install
  ```

### Start the app manually

Use these for exploratory testing or the manual E2E pass.

- Start the backend API in development mode:
  ```powershell
  npm --prefix app-server run dev
  ```
- Start the frontend development server:
  ```powershell
  npm start
  ```
- If you want the Google Calendar worker running locally during manual integration checks:
  ```powershell
  npm --prefix app-server run worker:google-calendar
  ```

Playwright does not need the app started manually. `playwright.config.js` starts the frontend and backend automatically through its `webServer` entries.

### Run the automated suites

- Backend Jest:
  ```powershell
  npm run test:backend
  ```
- Backend Jest direct form:
  ```powershell
  npm --prefix app-server test
  ```
- Frontend Jest once:
  ```powershell
  npm test -- --watchAll=false
  ```
- Frontend production build:
  ```powershell
  npm run build
  ```
- Full Playwright suite in headless mode:
  ```powershell
  npm run test:e2e
  ```
- Full Playwright suite in headed mode:
  ```powershell
  npm run test:e2e:headed
  ```
- Deployed smoke check:
  ```powershell
  npm run smoke:deploy
  ```

### Run a focused subset

- One backend suite by filename pattern:
  ```powershell
  npm --prefix app-server test -- taskTimeEntries.test.js
  ```
- One frontend test file in PowerShell:
  ```powershell
  $env:CI='true'; npm test -- --watch=false src/features/tasks/taskView.test.js
  ```
- A few frontend test files in one run:
  ```powershell
  $env:CI='true'; npm test -- --watch=false src/features/tasks/taskForm.test.js src/features/tasks/taskView.test.js
  ```
- One Playwright spec:
  ```powershell
  npx playwright test e2e/reparenting.spec.js
  ```
- One Playwright spec in headed mode:
  ```powershell
  npx playwright test e2e/reparenting.spec.js --headed
  ```

### Run the full local verification gate

Use this when you want the same broad confidence level used during the recent coverage work.

1. Backend Jest
   ```powershell
   npm run test:backend
   ```
2. Frontend Jest
   ```powershell
   $env:CI='true'; npm test -- --watch=false
   ```
3. Frontend build
   ```powershell
   npm run build
   ```
4. Full Playwright suite
   ```powershell
   npx playwright test
   ```

### Existing shortcuts and caveats

- `npm run ci:local` currently runs:
  - backend Jest
  - frontend build
- `npm run ci:local` does not currently run:
  - frontend Jest
  - Playwright
- If Playwright fails because browser binaries are missing or outdated, rerun:
  ```powershell
  npm run test:e2e:install
  ```

## Automated coverage map

### Backend integration and route coverage

- `/api/auth/google`
  - Missing credential rejection, invalid credential rejection, first sign-in user creation, and existing-user profile updates are covered.
- `/api/categories`
  - Auth enforcement, alphabetical ordering, and cross-user isolation.
- `/api/analytics/*`
  - Inclusive date filtering, overlap math, daily/weekly/monthly bucketing, uncategorized data, empty ranges, and validation failures.
- Goal/task/time-entry routes
  - Cached total refreshes, list membership moves, parent-goal changes, category sync, delete cascades/detaches, duplicate time-entry handling, and malformed id/payload validation.
- Google Calendar integration routes
  - Connect URL generation, callback success/error behavior, status reads, calendar listing, settings saves, manual sync queuing, and disconnect.
- App wiring
  - Health endpoint reachability, allowed/disallowed CORS origins, and protected test-auth behavior.

### Frontend page and component coverage

- Auth/session
  - `src/context/AuthContext.js`
  - `src/context/authUtils.js`
  - `src/api/client.js`
  - `src/components/RequireAuth.js`
  - `src/App.js` route smoke coverage
- Shared validation helpers
  - `src/features/tasks/taskValidation.js`
  - `src/features/goals/goalValidation.js`
- Task and goal flows
  - `src/features/tasks/taskForm.js`
  - `src/features/tasks/taskView.js`
  - `src/features/goals/goalForm.js`
  - `src/features/goals/goalView.js`
- Filter-heavy and integration-heavy pages
  - `src/pages/GoalsOverview.js`
  - `src/pages/CalendarView.js`
  - `src/pages/Visualizations.js`
  - `src/pages/GoogleCalendarSettings.js`
  - `src/pages/GoalTreeView.js`

### Browser E2E coverage

- `e2e/auth-and-shell.spec.js`
  - Signed-out redirect, expired stored-session redirect, seeded session persistence, shell navigation, theme persistence, sign-out.
- `e2e/deep-links.spec.js`
  - Direct navigation and browser refresh resilience on major routed pages.
- `e2e/list-creation.spec.js`
  - List creation and empty-title blocking.
- `e2e/task-creation.spec.js`
  - Standalone task creation and dashboard visibility.
- `e2e/goal-creation.spec.js`
  - Top-level goal creation plus verification in goal detail, Goals Overview, and Goal Tree View.
- `e2e/sub-goal-creation.spec.js`
  - Sub-goal creation from a parent goal, inherited category behavior, and deadline guardrails.
- `e2e/task-time-entry.spec.js`
  - Log/edit/delete/duplicate time-entry lifecycle.
- `e2e/goal-rollup.spec.js`
  - Descendant task time updates reflected in goal rollups.
- `e2e/goal-linked-task.spec.js`
  - Goal-linked task creation, inherited deadline/category rules, task editing, completion, and list assignment.
- `e2e/reparenting.spec.js`
  - Goal and task reparenting across trees, ancestor rollups, inherited category changes, and deadline guardrails.
- `e2e/list-management.spec.js`
  - Lists overview/detail management and task deletion from list context.
- `e2e/dashboard-buckets.spec.js`
  - Overdue/today/next-7-days buckets, populated `No Date` coverage, and task deep-links from each section.
- `e2e/goals-overview.spec.js`
  - Search, filter, grouping, sorting, and tree-view navigation.
- `e2e/calendar-view.spec.js`
  - Week/month switching, goal/task visibility toggles, goal filters, and navigation from cells.
- `e2e/visualizations.spec.js`
  - Range controls, invalid custom ranges, chart-mode switching, visible-series toggles, and empty states.
- `e2e/google-calendar-settings.spec.js`
  - Browser-level settings UI flow with mocked OAuth and API responses.
- `e2e/deletion-semantics.spec.js`
  - Task deletion, goal deletion, detach behavior, and rollup refreshes.
- `e2e/multi-account-isolation.spec.js`
  - Cross-persona data isolation in separate browser contexts.

## Where unit tests fit

Unit tests sit at the bottom of the pyramid. They should cover pure rules and state derivation that do not need routing, DOM rendering, HTTP, or MongoDB.

Already in good shape:

- Auth token parsing and expiry checks in `src/context/authUtils.js`
- Shared task validation rules in `src/features/tasks/taskValidation.js`
- Shared goal validation rules in `src/features/goals/goalValidation.js`

Still good extraction targets:

1. `src/pages/CalendarView.js` and `src/components/DashboardCalendar.js`
   - top-level goal resolution
   - date-range filtering
   - per-day grouping helpers
2. `src/pages/Visualizations.js`
   - range-label derivation
   - bucket selection helpers
   - snapshot/summary formatting
3. `app-server/controllers/taskController.js` and `app-server/controllers/goalController.js`
   - parent/deadline/category normalization rules
4. `app-server/controllers/googleCalendarController.js` and related services
   - payload shaping and provider-error normalization

## Remaining highest-value gaps

Most of the practical first-party app gaps are now closed. The remaining gaps are external or optional:

1. Real Google sign-in and account-chooser behavior
   - Automation covers signed-out redirects, expired-session recovery, and seeded session persistence, but not the live Google identity UI or callback behavior.
2. Live Google Calendar smoke coverage
   - Route tests and mocked browser tests exist, but real OAuth/provider sync behavior still belongs in a staging/manual lane.
3. Optional next tier
   - accessibility audits
   - cross-browser coverage beyond Chromium
   - visual regression checks if release risk warrants them

## Recommended test pyramid

### 0. Unit tests

Use unit tests for extracted pure logic and validation helpers.

Good fit:

- date parsing and range derivation
- auth token parsing/expiry logic
- shared task/goal validation helpers
- normalized provider payload helpers

Poor fit:

- route wiring
- persistence behavior
- browser refresh regressions
- cross-page workflows
- real-provider OAuth behavior

### 1. Backend integration tests

Keep using Jest + Supertest + `mongodb-memory-server`.

Best next additions:

- focused suites for extracted controller/service helpers
- Google Calendar worker/background sync behavior
- provider-failure and retry-path coverage around sync jobs

### 2. Frontend page integration tests

Use React Testing Library for component/page state that does not need a real browser.

Best next additions:

- extracted calendar helpers once they move out of page components
- extracted visualization range/bucket helpers
- any future goal-create/sub-goal-create edge cases before adding more E2E

### 3. Browser E2E tests

Use Playwright for routing, refresh resilience, destructive actions, multi-page workflows, and multi-account separation.

Default approach:

- seed `localStorage.authToken` and `localStorage.authUser`
- run backend with `ALLOW_TEST_AUTH=true`
- use isolated session personas per scenario
- stub external Google Calendar endpoints in CI

## Suggested implementation order

1. Keep backend Jest, frontend Jest, and Playwright green in CI.
2. Decide whether to add a staging-only live Google sign-in / Google Calendar smoke lane.
3. Expand accessibility or multi-browser coverage only if the release process benefits from the extra runtime.

## Definition of done

- Every user-facing flow has at least one automated test at the highest-value layer that is practical.
- Real-provider flows that cannot live in CI are explicitly documented as manual/staging checks.
- Every bug fix adds a regression test.
- CI runs:
  - backend Jest
  - frontend Jest
  - frontend build
  - Playwright smoke or full suite
