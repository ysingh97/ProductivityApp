# TODO

## Completed
- Completed: Revisit post-submit behavior for goal/task create and edit flows. Added success alerts for saved tasks/goals with direct links to their detail views.
- Completed: Add better navigation between task/goal creation forms and their entry points. Added contextual back links from create/update forms to the source task, goal, parent goal, or list.
- Completed: When a new goal is created, add a clear UI affordance that lets the user immediately open that goal. Added a saved-goal confirmation alert with an `Open` action.
- Completed: When a goal is created, show a clear success indication. Added save confirmation for goal create/update flows plus follow-up actions for opening the goal, creating a subgoal, or adding a task.
- Completed: Fix the goal creation flow so the `Parent Goal` dropdown reflects newly created goals immediately instead of only after a refresh. Saved goals are now merged into the local parent-goal options.
- Completed: Rename the website/app branding to `Branchwork` across browser metadata, installed-app metadata, and public-facing copy.
- Completed: Remove the outdated sign-in text saying Google Calendar sync is coming soon. Replaced it with current guidance about connecting sync after sign-in from settings.
- Completed: Move the goal-form helper text about top-level goals closer to the `Parent Goal` dropdown so the relationship is clearer while filling out the form.
- Completed: Include goal tree context inside the goal detail view, with the current goal highlighted so users can keep orientation while navigating related goals.
- Completed: Include goal tree context inside the task detail view, with the current task highlighted so task pages keep the same goal-tree orientation as goal pages.
- Completed: Make the goal detail page editable in place, so the main detail view now handles title, description, estimate, category, parent, date, and status updates without a separate sidebar editor.
- Completed: Make the option to mark a goal or task as complete more visible so it is available from the main detail view instead of being hidden behind the edit flow.

## Potential
- Consider post-create actions that return task/goal creation flows to the originating list, goal, or tree view after saving.
- Consider richer parent-goal relationships, including adding a parent to an existing goal after creation and evaluating the product, UX, and data-model implications of allowing multiple parents for a goal or task.
- Add CRUD operations to the goal tree view for tasks and goals, such as creating child goals/tasks from a node, editing key fields inline, moving items, and deleting items with confirmation.
- Improve the UI when the screen is resized so the application remains usable and readable in compact window sizes, especially for the calendar view on the dashboard.
- Add a Google Calendar sync status indicator in the site header so users can see whether calendar sync is connected, pending, or failing.
- Add search functionality for goals and tasks so users can quickly find items by title and related metadata.
- Add a user-facing bug report flow so users can easily submit issues, reproduction details, and optional screenshots or environment context.
- Adjust dark-mode UI contrast, including borders and dividers that are currently too subtle or invisible.
- Hide nonessential console logging behind a debug-mode flag so production and CI/CD logs stay clean and do not expose sensitive data.
- Optimize CI so backend tests and frontend builds only run when relevant backend, frontend, dependency, or workflow files change.
- Consider skipping CI gates entirely when a change only touches non-runtime docs or notes (for example `TODO.md`) and does not affect application code, dependencies, tests, or workflows.
- Consider creating a separate MongoDB Atlas project and staging-only deployment so staging can have its own IP access policy and data-management workflows without affecting production.
- Add recurring task support, including recurrence rules, generated task instances, and clear UX for editing one occurrence vs the full series.
- Fix the `Not Found` error when refreshing any page, and document the exact SPA rewrite/fallback requirements for deployed environments like Render (for example `/* -> /index.html`) so browser refreshes and deep links work consistently outside local development.
- Allow users to view completed tasks and completed goals, with clear filters or dedicated views so completed work remains accessible without crowding active items.
- Add proper account deletion handling, including confirmation UX and cleanup of all user-owned data and third-party integration records.
- Revisit time-entry overlap handling. Consider three policy options: `1.` exact-match-only idempotency, where only identical start/end ranges count as duplicates; `2.` reject any overlapping entry for the same task, which prevents double counting but may block legitimate logs; `3.` detect overlap and require user/client resolution, which is the best UX but adds more implementation complexity.
- Decide whether calendar filtering should happen on the backend vs frontend to avoid performance bottlenecks.
- Decide deletion behavior for goals. Specifically evaluate whether deleting a goal should detach subgoals/subtasks, block deletion until children are moved, or cascade-delete all subgoals, subtasks, and related time entries.
