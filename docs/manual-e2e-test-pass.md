# Manual E2E Test Pass

Use these tables as copyable run sheets. Leave `Actual Result`, `Pass/Fail`, and `Notes` blank during execution, then fill them in during the pass.

For routine regression work, prioritize the scenarios marked `Partially automated` or `Manual only`. Scenarios marked `Automated` already have Playwright coverage and are best used for human spot-checks on major releases, staging deploys, or visual UX review.

## Run notes

- Preferred environment: local or staging with a clean test account.
- For automation later, prefer seeded test personas over real Google UI.
- If you want the full dashboard and analytics checks, seed at least:
  - one top-level goal
  - one sub-goal
  - one standalone task
  - one goal-linked task
  - at least two time entries across different dates/categories

## Automation legend

- `Automated`
  - Covered end to end in Playwright.
- `Partially automated`
  - Some automated coverage exists, but the manual pass still covers a real provider flow, a missing browser path, or a scenario not yet deterministic in CI.
- `Manual only`
  - No dedicated browser automation exists yet.

## Current automation map

| Scenario | Status | Primary automated coverage | Remaining manual focus |
| --- | --- | --- | --- |
| `E2E-01` Sign-in, protected routing, and session recovery | Partially automated | `e2e/auth-and-shell.spec.js`, `src/api/client.test.js`, `src/context/AuthContext.test.js` | Live Google sign-in and account chooser behavior |
| `E2E-02` App shell navigation and theme persistence | Automated | `e2e/auth-and-shell.spec.js` | Optional visual spot-check after shell changes |
| `E2E-03` Deep-link and browser refresh resilience | Automated | `e2e/deep-links.spec.js` | Optional deployed-environment spot-check |
| `E2E-04` Create a list | Automated | `e2e/list-creation.spec.js` | Optional exploratory UX review |
| `E2E-05` Create a standalone task | Automated | `e2e/task-creation.spec.js` | Optional exploratory UX review |
| `E2E-06` Time-entry lifecycle on a task | Automated | `e2e/task-time-entry.spec.js` | Optional exploratory UX review |
| `E2E-07` Goal progress rollup from descendant tasks | Automated | `e2e/goal-rollup.spec.js` | Optional exploratory UX review |
| `E2E-08` Create a top-level goal | Automated | `e2e/goal-creation.spec.js` | Optional exploratory UX review |
| `E2E-09` Create a sub-goal with inherited category and deadline guardrails | Automated | `e2e/sub-goal-creation.spec.js` | Optional exploratory UX review |
| `E2E-10` Create a goal-linked task with inherited rules | Automated | `e2e/goal-linked-task.spec.js` | Optional exploratory UX review |
| `E2E-11` Edit task details and completion state | Automated | `e2e/goal-linked-task.spec.js` | Optional exploratory UX review |
| `E2E-12` Reparent goals and tasks across goal trees | Automated | `e2e/reparenting.spec.js` | Optional exploratory UX review |
| `E2E-13` Lists overview and list detail management | Automated | `e2e/list-management.spec.js` | Optional exploratory UX review |
| `E2E-14` Goals overview filters, sorting, and tree navigation | Automated | `e2e/goals-overview.spec.js` | Optional exploratory UX review |
| `E2E-15` Dashboard due-date buckets | Automated | `e2e/dashboard-buckets.spec.js` | Optional exploratory UX review |
| `E2E-16` Calendar views, filters, and navigation | Automated | `e2e/calendar-view.spec.js` | Optional exploratory UX review |
| `E2E-17` Visualizations range controls and chart states | Automated | `e2e/visualizations.spec.js` | Optional exploratory UX review |
| `E2E-18` Goal and task deletion semantics | Automated | `e2e/deletion-semantics.spec.js` | Optional exploratory UX review |
| `E2E-19` Google Calendar integration lifecycle | Partially automated | `e2e/google-calendar-settings.spec.js`, `app-server/__tests__/googleCalendarRoutes.test.js` | Live OAuth and real provider sync behavior |
| `E2E-20` Multi-account isolation | Partially automated | `e2e/multi-account-isolation.spec.js` | Real Google-account switching and account chooser behavior |

## Recommended manual focus

- `E2E-01`
  - Use a real Google sign-in and verify the live account chooser/callback path.
- `E2E-19`
  - Use a disposable live Google Calendar connection in staging when validating real integration behavior.
- `E2E-20`
  - Verify real-account isolation if the release changes auth/account-switching behavior.

## Smoke scenarios

### E2E-01 Sign-in, protected routing, and session recovery

Preconditions: signed out; backend reachable.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/`. | Sign-in screen renders. |  |  |  |
| 2 | Navigate directly to `/board` while signed out. | App redirects back to `/`. |  |  |  |
| 3 | Sign in with a valid account. | App lands on `/board`. |  |  |  |
| 4 | Refresh the page. | Session persists and `/board` stays accessible. |  |  |  |
| 5 | Force an expired/invalid session and reload. | App redirects to `/` and shows the session-expired message. |  |  |  |

### E2E-02 App shell navigation and theme persistence

Preconditions: signed in.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open the navigation drawer. | Drawer opens and shows Dashboard, Goals, Calendar, Lists, and Visualizations links. |  |  |  |
| 2 | Navigate to each major page once. | Each route loads without redirect or blank state caused by routing errors. |  |  |  |
| 3 | Toggle color mode. | Theme changes immediately. |  |  |  |
| 4 | Refresh the browser. | Previously selected color mode persists. |  |  |  |
| 5 | Open the account menu and sign out. | App returns to `/`. |  |  |  |

### E2E-03 Deep-link and browser refresh resilience

Preconditions: signed in; at least one real task id, goal id, and list id are available.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/board` directly in a new tab and refresh the page. | Dashboard reloads instead of returning a 404/blank page. |  |  |  |
| 2 | Open `/lists` directly and refresh the page. | Lists page reloads correctly. |  |  |  |
| 3 | Open one real `/lists/:listId` route directly and refresh the page. | List detail page reloads correctly. |  |  |  |
| 4 | Open one real `/tasks/:taskId` route directly and refresh the page. | Task detail page reloads correctly. |  |  |  |
| 5 | Open one real `/goals/:goalId` route directly and refresh the page. | Goal detail page reloads correctly. |  |  |  |
| 6 | Open `/calendar` and `/visualizations` directly, refreshing each once. | Both routed pages reload correctly. |  |  |  |

### E2E-04 Create a list

Preconditions: signed in.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/lists/new`. | Create-list form renders. |  |  |  |
| 2 | Submit with an empty title. | Client-side validation blocks submission. |  |  |  |
| 3 | Create a list with title and description. | Success alert appears with an `Open` action. |  |  |  |
| 4 | Open the new list. | List detail page renders with zero tasks and correct title/description. |  |  |  |

### E2E-05 Create a standalone task

Preconditions: signed in; at least one reusable category exists or create one on the fly.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/task/new`. | Task form renders and loads list/goal/category options. |  |  |  |
| 2 | Create a task without a parent goal and without a list. | Success alert appears and task can be opened. |  |  |  |
| 3 | Verify the task page. | Title, category, estimate, and target date match the form input. |  |  |  |
| 4 | Return to `/board`. | Task appears in the correct due-date bucket. |  |  |  |

### E2E-06 Time-entry lifecycle on a task

Preconditions: an existing task with an estimate.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open the task page and log a valid time range. | Success message appears and `Total time spent` increases. |  |  |  |
| 2 | Submit the exact same start/end range again. | App reports that the exact range was already logged and does not duplicate total time. |  |  |  |
| 3 | Edit the existing time entry to a new valid range. | Entry updates and task totals recalculate. |  |  |  |
| 4 | Attempt an invalid entry with end before start. | Validation blocks the save. |  |  |  |
| 5 | Attempt an entry that ends in the future. | Validation blocks the save. |  |  |  |
| 6 | Delete the time entry. | Entry disappears and totals recalculate downward. |  |  |  |

### E2E-07 Goal progress rollup from descendant tasks

Preconditions: a goal with at least one descendant task and one time entry.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open the goal page and note `Estimated`, `Time spent`, and `Time left`. | Goal totals are visible. |  |  |  |
| 2 | Open a descendant task and add or edit logged time. | Task totals change immediately. |  |  |  |
| 3 | Return to the goal page and refresh if needed. | Goal totals reflect the descendant task change. |  |  |  |
| 4 | Open the goal tree view. | The same task/goal progress numbers remain consistent there. |  |  |  |

## Core regression scenarios

### E2E-08 Create a top-level goal

Preconditions: signed in.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/goal/new`. | Goal form renders. |  |  |  |
| 2 | Create a goal with title, category, estimate, and target date. | Success alert appears with an `Open` action. |  |  |  |
| 3 | Open the goal. | Goal details show the new values and zero spent time. |  |  |  |
| 4 | Open Goals Overview and Tree View. | New goal appears in both places. |  |  |  |

### E2E-09 Create a sub-goal with inherited category and deadline guardrails

Preconditions: an existing parent goal with a future target date and category.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | From the parent goal page, click `Create sub-goal`. | Parent goal is preselected and locked. |  |  |  |
| 2 | Try to set a sub-goal target date later than the parent goal deadline. | Validation blocks submission. |  |  |  |
| 3 | Create the sub-goal with a valid earlier date. | Success alert appears. |  |  |  |
| 4 | Open the saved sub-goal. | Category matches the inherited parent category. |  |  |  |
| 5 | Open Tree View from either goal. | Sub-goal appears beneath the parent goal. |  |  |  |

### E2E-10 Create a goal-linked task with inherited rules

Preconditions: an existing parent goal with a future target date and category.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | From the parent goal page, click `Create sub-task`. | Parent goal is preselected in the task form. |  |  |  |
| 2 | Confirm the category field is inherited/locked. | Category cannot be edited manually. |  |  |  |
| 3 | Try to set a task target date later than the parent goal deadline. | Validation blocks submission. |  |  |  |
| 4 | Create the task with a valid earlier date. | Success alert appears. |  |  |  |
| 5 | Open the task. | Task shows the parent goal link and inherited category. |  |  |  |

### E2E-11 Edit task details and completion state

Preconditions: an existing task linked to a list or goal.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open the task and enable edit mode. | Editable fields become visible. |  |  |  |
| 2 | Update title, description, estimate, list, or target date. | Save succeeds and task details refresh. |  |  |  |
| 3 | Mark the task complete and save. | Status chip changes to complete. |  |  |  |
| 4 | Revisit the dashboard/list/goal context that references the task. | The updated values and completion state are reflected there. |  |  |  |

### E2E-12 Reparent goals and tasks across goal trees

Preconditions: two top-level goals with different categories; at least one child goal and one child task already exist under the source tree; both target deadlines allow the move.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open an existing child goal from the source tree and enable edit mode. | Parent-goal selector is editable. |  |  |  |
| 2 | Change the child goal's parent from source tree A to target tree B and save. | Save succeeds. |  |  |  |
| 3 | Reopen the moved goal. | Parent goal now points to tree B and inherited category matches tree B. |  |  |  |
| 4 | Open tree view for both old and new top-level goals. | The moved goal is gone from tree A and appears under tree B. |  |  |  |
| 5 | If the moved goal has descendant tasks with logged time, compare rollups on both trees. | Old ancestor totals decrease and new ancestor totals increase appropriately. |  |  |  |
| 6 | Open an existing task from source tree A and enable edit mode. | Parent-goal selector is editable. |  |  |  |
| 7 | Reassign the task to a goal in target tree B and save. | Save succeeds. |  |  |  |
| 8 | Reopen the task. | Parent goal now points to tree B and category matches tree B. |  |  |  |
| 9 | Verify tree view and goal detail totals on both sides again. | The task appears only under tree B and old/new ancestor totals update correctly. |  |  |  |
| 10 | Try to move a task or sub-goal to a parent with an earlier deadline than its current target date. | Validation blocks the move until the target date is adjusted. |  |  |  |

### E2E-13 Lists overview and list detail management

Preconditions: at least one list with at least one task.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/lists`. | List overview shows counts and latest lists. |  |  |  |
| 2 | Open a list detail page. | Snapshot values match the tasks shown. |  |  |  |
| 3 | Add a new task from the list detail page. | New task inherits the fixed list and appears in the list. |  |  |  |
| 4 | Delete a task from the list page. | Task disappears and list counts update. |  |  |  |

### E2E-14 Goals overview filters, sorting, and tree navigation

Preconditions: multiple top-level goals across categories and states.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/goals/overview`. | Goals load with default sort/filter state. |  |  |  |
| 2 | Search by goal title or description. | Results narrow to matching goals. |  |  |  |
| 3 | Filter by status and category. | Result counts and displayed cards update correctly. |  |  |  |
| 4 | Change sort order and grouped-by-category mode. | Ordering/grouping updates without breaking card details. |  |  |  |
| 5 | Open a goal and then its tree view. | Navigation works and the selected goal is highlighted in the tree. |  |  |  |

### E2E-15 Dashboard due-date buckets

Preconditions: seeded data includes tasks due today, in the next 7 days, without dates, and ideally at least one overdue task.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/board`. | Dashboard loads task buckets and quick stats. |  |  |  |
| 2 | Verify `Today`, `Next 7 Days`, and `No Date` sections. | Each task appears in the correct section. |  |  |  |
| 3 | If seeded, verify `Overdue` section. | Overdue tasks are shown separately with the overdue chip. |  |  |  |
| 4 | Open a task from each populated section. | Links land on the correct task detail page. |  |  |  |

### E2E-16 Calendar views, filters, and navigation

Preconditions: seeded goals/tasks span multiple dates and at least two top-level goals.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/calendar`. | Week view loads. |  |  |  |
| 2 | Switch between week and month views. | Calendar grid and range label update correctly. |  |  |  |
| 3 | Use `Prev`, `Today`, and `Next`. | Range shifts correctly each time. |  |  |  |
| 4 | Toggle `Show goals` and `Show tasks`. | Visible calendar items update immediately. |  |  |  |
| 5 | Use `Select all`, `Clear`, and individual goal filters. | Only the selected goal trees remain visible. |  |  |  |
| 6 | Open a task and a goal from calendar cells. | Links go to the correct detail pages. |  |  |  |

### E2E-17 Visualizations range controls and chart states

Preconditions: seeded time-entry data exists across multiple days and categories.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/visualizations`. | Summary stats and charts load. |  |  |  |
| 2 | Change period modes among week, month, year, and custom. | Labels, previous comparison, and charts update correctly. |  |  |  |
| 3 | Try an invalid custom range where start is after end. | Validation message appears and chart requests are blocked. |  |  |  |
| 4 | Toggle pie/bar category views and line/stacked trend views. | Chart presentation changes without losing data context. |  |  |  |
| 5 | Toggle category chips and total-hours line. | Visible series update correctly. |  |  |  |
| 6 | Pick a range with no time data. | Empty-state messaging appears instead of broken charts. |  |  |  |

## Extended regression scenarios

### E2E-18 Goal and task deletion semantics

Preconditions: one goal with direct child goals, direct child tasks, and logged time exists in disposable test data.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Delete a task with logged time. | Task is removed and related time entries no longer affect parent rollups. |  |  |  |
| 2 | Delete a goal that has direct child goals and tasks. | Goal is removed. Direct child goals/tasks are detached rather than deleted. |  |  |  |
| 3 | Reopen affected child goals/tasks from search/list/tree context. | Detached items still exist and no longer reference the deleted parent. |  |  |  |

### E2E-19 Google Calendar integration lifecycle

Preconditions: disposable Google account or a safe mocked/staging integration target.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Open `/settings/google-calendar` while disconnected. | Disconnected state renders with `Connect Google Calendar`. |  |  |  |
| 2 | Complete the connection flow. | App returns to settings with the connected success message. |  |  |  |
| 3 | Select a calendar and save settings. | Status updates and success feedback confirms a queued resync. |  |  |  |
| 4 | Trigger `Sync now`. | Queue confirmation appears and last-sync metadata refreshes if available. |  |  |  |
| 5 | Disconnect the integration. | Disconnected state returns cleanly. |  |  |  |

### E2E-20 Multi-account isolation

Preconditions: two separate accounts with distinct tasks/goals/lists.

| Step | Action | Expected Result | Actual Result | Pass/Fail | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Sign in as account A and note visible data. | Only account A data is visible. |  |  |  |
| 2 | Sign out and sign in as account B. | Only account B data is visible. |  |  |  |
| 3 | Return to account A. | Account A data remains unchanged and isolated. |  |  |  |
