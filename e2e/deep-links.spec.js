const { test, expect } = require("@playwright/test");
const {
  createGoalFixture,
  createListFixture,
  createTaskFixture
} = require("./support/api");
const { seedTestAuth } = require("./support/auth");

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

test("reloads major routed pages without dropping the active screen", async ({
  page
}) => {
  const list = await createListFixture();
  const goal = await createGoalFixture();
  const task = await createTaskFixture({ parentGoalId: goal._id });

  await seedTestAuth(page);

  const routes = [
    {
      path: "/board",
      assertVisible: () =>
        expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible()
    },
    {
      path: "/lists",
      assertVisible: () =>
        expect(page.getByRole("heading", { name: "Lists", exact: true })).toBeVisible()
    },
    {
      path: `/lists/${list._id}`,
      assertVisible: () =>
        expect(page.getByRole("heading", { name: list.title })).toBeVisible()
    },
    {
      path: `/tasks/${task._id}`,
      assertVisible: () => expect(page.getByText(task.title, { exact: true }).first()).toBeVisible()
    },
    {
      path: `/goals/${goal._id}`,
      assertVisible: () => expect(page.getByText(goal.title, { exact: true }).first()).toBeVisible()
    },
    {
      path: "/calendar",
      assertVisible: () =>
        expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible()
    },
    {
      path: "/visualizations",
      assertVisible: () =>
        expect(page.getByRole("heading", { name: "Data visualizations" })).toBeVisible()
    }
  ];

  for (const route of routes) {
    await page.goto(route.path);
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(route.path)}$`));
    await route.assertVisible();

    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(route.path)}$`));
    await route.assertVisible();
  }
});
