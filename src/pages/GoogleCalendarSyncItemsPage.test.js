import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import GoogleCalendarSyncItemsPage from "./GoogleCalendarSyncItemsPage";
import { fetchGoals } from "../features/goals/goalService";
import { fetchTasks } from "../features/tasks/taskService";

jest.mock("../features/goals/goalService", () => ({
  fetchGoals: jest.fn()
}));

jest.mock("../features/tasks/taskService", () => ({
  fetchTasks: jest.fn()
}));

const renderGoogleCalendarSyncItemsPage = (initialPath) =>
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/settings/google-calendar/items/:reasonSlug"
          element={<GoogleCalendarSyncItemsPage />}
        />
      </Routes>
    </MemoryRouter>
  );

describe("GoogleCalendarSyncItemsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    fetchGoals.mockResolvedValue([
      {
        _id: "goal-root",
        title: "Reach fluency",
        category: { title: "Learning" },
        targetCompletionDate: null,
        isComplete: false,
        parentGoalId: null
      },
      {
        _id: "goal-child",
        title: "Finish textbook",
        category: { title: "Learning" },
        targetCompletionDate: null,
        isComplete: false,
        parentGoalId: "goal-root"
      },
      {
        _id: "goal-complete",
        title: "Archive portfolio",
        category: { title: "Career" },
        targetCompletionDate: "2026-07-01T17:00:00.000Z",
        isComplete: true,
        parentGoalId: null
      }
    ]);

    fetchTasks.mockResolvedValue([
      {
        _id: "task-tree",
        title: "Do chapter 5",
        category: { title: "Learning" },
        targetCompletionDate: null,
        isComplete: false,
        parentGoalId: "goal-child"
      },
      {
        _id: "task-standalone",
        title: "Inbox cleanup",
        category: { title: "Admin" },
        targetCompletionDate: null,
        isComplete: false,
        parentGoalId: null
      },
      {
        _id: "task-complete",
        title: "Ship release notes",
        category: { title: "Career" },
        targetCompletionDate: "2026-07-02T16:30:00.000Z",
        isComplete: true,
        parentGoalId: null
      }
    ]);
  });

  test("groups missing-target-date items by category and tree hierarchy", async () => {
    renderGoogleCalendarSyncItemsPage("/settings/google-calendar/items/missing-target-date");

    expect(await screen.findByText(/items without target dates/i)).toBeInTheDocument();
    expect(await screen.findByText("Learning")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getAllByText("Reach fluency").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/reach fluency > finish textbook > do chapter 5/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Standalone tasks")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/goals/goal-child")
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/tasks/task-tree")
    ).toBe(true);
    expect(screen.queryByText("Archive portfolio")).not.toBeInTheDocument();
  });

  test("shows completed items on the completed view", async () => {
    renderGoogleCalendarSyncItemsPage("/settings/google-calendar/items/completed");

    expect(await screen.findByText(/completed items/i)).toBeInTheDocument();
    expect(await screen.findByText("Career")).toBeInTheDocument();
    expect(screen.getAllByText("Archive portfolio").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ship release notes").length).toBeGreaterThan(0);
    expect(screen.queryByText("Inbox cleanup")).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/goals/goal-complete")
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link")
        .some((link) => link.getAttribute("href") === "/tasks/task-complete")
    ).toBe(true);
    await waitFor(() => expect(fetchGoals).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(fetchTasks).toHaveBeenCalledTimes(1));
  });
});
