import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CalendarView from "./CalendarView";
import { fetchGoals } from "../features/goals/goalService";
import { fetchTasks } from "../features/tasks/taskService";

jest.mock("../features/goals/goalService", () => ({
  fetchGoals: jest.fn()
}));

jest.mock("../features/tasks/taskService", () => ({
  fetchTasks: jest.fn()
}));

const renderCalendarView = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <CalendarView />
    </MemoryRouter>
  );

const buildGoal = (overrides = {}) => ({
  _id: "goal-1",
  title: "Launch Goal",
  targetCompletionDate: "2026-01-14T10:00:00.000Z",
  parentGoalId: null,
  ...overrides
});

const buildTask = (overrides = {}) => ({
  _id: "task-1",
  title: "Launch Task",
  targetCompletionDate: "2026-01-13T10:00:00.000Z",
  parentGoalId: "goal-child-1",
  ...overrides
});

const getGoalPanel = () => screen.getByText("Top-level goals").closest(".MuiPaper-root");

const getGoalFilterCheckbox = (goalLabel) => {
  const panel = getGoalPanel();
  const goalText = within(panel).getByText(goalLabel);
  const row = goalText.closest("div");

  return row.querySelector('input[type="checkbox"]');
};

describe("CalendarView", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));
    jest.clearAllMocks();

    fetchGoals.mockResolvedValue([
      buildGoal({
        _id: "goal-root-1",
        title: "Launch Goal",
        targetCompletionDate: "2026-01-14T10:00:00.000Z"
      }),
      buildGoal({
        _id: "goal-child-1",
        title: "Launch Subgoal",
        targetCompletionDate: "2026-01-16T10:00:00.000Z",
        parentGoalId: "goal-root-1"
      }),
      buildGoal({
        _id: "goal-root-2",
        title: "Health Goal",
        targetCompletionDate: "2026-01-15T10:00:00.000Z"
      })
    ]);

    fetchTasks.mockResolvedValue([
      buildTask({
        _id: "task-1",
        title: "Launch Task",
        targetCompletionDate: "2026-01-13T10:00:00.000Z",
        parentGoalId: "goal-child-1"
      }),
      buildTask({
        _id: "task-2",
        title: "Standalone Task",
        targetCompletionDate: "2026-01-17T10:00:00.000Z",
        parentGoalId: null
      })
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("navigates between week and month ranges", async () => {
    renderCalendarView();

    expect(await screen.findByText("Jan 11 - Jan 17, 2026")).toBeInTheDocument();
    expect(await screen.findByText("Launch Task")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText("Jan 18 - Jan 24, 2026")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /today/i }));
    expect(await screen.findByText("Jan 11 - Jan 17, 2026")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^month$/i }));
    expect(await screen.findByText("January 2026")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
  });

  test("toggles goal and task item visibility", async () => {
    renderCalendarView();

    expect(await screen.findByText("Launch Task")).toBeInTheDocument();
    expect(screen.getByText("Standalone Task")).toBeInTheDocument();
    expect(screen.getAllByText("Launch Goal")).toHaveLength(2);

    fireEvent.click(screen.getByRole("checkbox", { name: /show tasks/i }));

    await waitFor(() => {
      expect(screen.queryByText("Launch Task")).not.toBeInTheDocument();
      expect(screen.queryByText("Standalone Task")).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("Launch Goal")).toHaveLength(2);

    fireEvent.click(screen.getByRole("checkbox", { name: /show goals/i }));

    await waitFor(() => {
      expect(screen.queryAllByText("Launch Goal")).toHaveLength(0);
      expect(screen.queryByText("Health Goal")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/no goals or tasks due in this range\./i)).toBeInTheDocument();
  });

  test("supports clearing, restoring, and individually filtering goal trees", async () => {
    renderCalendarView();

    expect(await screen.findByText("Launch Task")).toBeInTheDocument();
    expect(screen.getByText("Standalone Task")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /clear/i }));

    await waitFor(() => {
      expect(screen.queryByText("Launch Task")).not.toBeInTheDocument();
      expect(screen.queryByText("Standalone Task")).not.toBeInTheDocument();
      expect(screen.queryAllByText("Launch Goal")).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole("button", { name: /select all/i }));

    expect(await screen.findByText("Launch Task")).toBeInTheDocument();
    expect(screen.getByText("Standalone Task")).toBeInTheDocument();
    expect(screen.getAllByText("Launch Goal")).toHaveLength(2);

    fireEvent.click(getGoalFilterCheckbox("Launch Goal"));

    await waitFor(() => {
      expect(screen.queryByText("Launch Task")).not.toBeInTheDocument();
      expect(screen.getByText("Standalone Task")).toBeInTheDocument();
      expect(screen.queryAllByText("Launch Goal")).toHaveLength(1);
    });
  });
});
