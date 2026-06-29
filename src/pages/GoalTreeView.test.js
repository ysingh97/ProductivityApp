import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import GoalTreeView from "./GoalTreeView";
import { fetchGoals } from "../features/goals/goalService";
import { fetchTasks } from "../features/tasks/taskService";

jest.mock("../features/goals/goalService", () => ({
  fetchGoals: jest.fn()
}));

jest.mock("../features/tasks/taskService", () => ({
  fetchTasks: jest.fn()
}));

const renderGoalTreeView = (initialPath = "/goals/goal-child/tree") =>
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/goals/:goalId/tree" element={<GoalTreeView />} />
      </Routes>
    </MemoryRouter>
  );

const buildGoal = (overrides = {}) => ({
  _id: "goal-root",
  title: "Launch Program",
  category: { title: "Work" },
  estimatedHours: 8,
  timeSpent: 5,
  timeLeft: 3,
  isComplete: false,
  targetCompletionDate: "2026-01-30T10:00:00.000Z",
  parentGoalId: null,
  ...overrides
});

const buildTask = (overrides = {}) => ({
  _id: "task-1",
  title: "Write release notes",
  estimatedCompletionTime: 2,
  timeSpent: 1,
  isComplete: false,
  targetCompletionDate: "2026-01-22T10:00:00.000Z",
  parentGoalId: "goal-child",
  ...overrides
});

describe("GoalTreeView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the root tree, selected subgoal context, and related tasks", async () => {
    fetchGoals.mockResolvedValue([
      buildGoal(),
      buildGoal({
        _id: "goal-child",
        title: "QA Pass",
        category: { title: "Work" },
        estimatedHours: 4,
        timeSpent: 1.5,
        timeLeft: 2.5,
        targetCompletionDate: "2026-01-24T10:00:00.000Z",
        parentGoalId: "goal-root"
      })
    ]);
    fetchTasks.mockResolvedValue([
      buildTask({
        _id: "task-root",
        title: "Prepare launch checklist",
        estimatedCompletionTime: 3,
        timeSpent: 2,
        parentGoalId: "goal-root"
      }),
      buildTask()
    ]);

    renderGoalTreeView();

    expect(await screen.findByRole("heading", { name: /goal tree view/i })).toBeInTheDocument();
    expect(await screen.findByText(/showing the full tree for launch program\./i)).toBeInTheDocument();
    expect(fetchGoals).toHaveBeenCalledTimes(1);
    expect(fetchTasks).toHaveBeenCalledTimes(1);

    expect(screen.getByText("Launch Program")).toBeInTheDocument();
    expect(screen.getByText("QA Pass")).toBeInTheDocument();
    expect(screen.getByText("Prepare launch checklist")).toBeInTheDocument();
    expect(screen.getByText("Write release notes")).toBeInTheDocument();
    expect(screen.getByText("Top-level goal")).toBeInTheDocument();
    expect(screen.getByText("Selected")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /open selected goal/i })).toHaveAttribute(
      "href",
      "/goals/goal-child"
    );
    expect(screen.getByRole("link", { name: /open top-level goal/i })).toHaveAttribute(
      "href",
      "/goals/goal-root"
    );
    expect(screen.getByRole("link", { name: /back to in-depth goals view/i })).toHaveAttribute(
      "href",
      "/goals/overview"
    );
  });

  test("shows a not-found state when the requested goal is missing", async () => {
    fetchGoals.mockResolvedValue([buildGoal()]);
    fetchTasks.mockResolvedValue([]);

    renderGoalTreeView("/goals/missing-goal/tree");

    expect(await screen.findByText("Goal not found.")).toBeInTheDocument();
    await waitFor(() => expect(fetchGoals).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/the goal might have been removed or you may not have access\./i)).toBeInTheDocument();
  });
});
