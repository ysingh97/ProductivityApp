import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import { MemoryRouter } from "react-router-dom";
import TaskView from "./taskView";
import { fetchCategories } from "../categories/categoryService";
import { fetchGoals } from "../goals/goalService";
import useGoogleCalendarStatus from "../integrations/useGoogleCalendarStatus";
import { fetchLists } from "../lists/listService";
import {
  createTaskTimeEntry,
  deleteTask,
  deleteTaskTimeEntry,
  fetchTasks,
  fetchTaskTimeEntries,
  updateTask,
  updateTaskTimeEntry
} from "./taskService";

jest.mock("../categories/categoryService", () => ({
  fetchCategories: jest.fn()
}));

jest.mock("../goals/goalService", () => ({
  fetchGoals: jest.fn()
}));

jest.mock("../lists/listService", () => ({
  fetchLists: jest.fn()
}));

jest.mock("../integrations/useGoogleCalendarStatus", () => jest.fn());

jest.mock("./taskService", () => ({
  createTaskTimeEntry: jest.fn(),
  deleteTask: jest.fn(),
  deleteTaskTimeEntry: jest.fn(),
  fetchTasks: jest.fn(),
  fetchTaskTimeEntries: jest.fn(),
  updateTask: jest.fn(),
  updateTaskTimeEntry: jest.fn()
}));

jest.mock("./taskCompletionBar", () => () => <div>Task completion bar</div>);

jest.mock("../../components/DateTimePicker", () => {
  const dayjs = require("dayjs");

  return function MockDateTimePicker({
    label = "Date Time",
    value,
    onChange,
    textFieldProps
  }) {
    const inputAriaLabel =
      textFieldProps?.inputProps?.["aria-label"] || label || "Date Time";

    return (
      <input
        aria-label={inputAriaLabel}
        value={value ? value.toISOString() : ""}
        onChange={(event) => onChange(event.target.value ? dayjs(event.target.value) : null)}
      />
    );
  };
});

const renderTaskView = (task) =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <TaskView task={task} />
    </MemoryRouter>
  );

const buildTask = (overrides = {}) => ({
  _id: "task-1",
  title: "Prepare roadmap",
  description: "Draft the next release plan.",
  category: { title: "Planning" },
  listId: null,
  parentGoalId: null,
  estimatedCompletionTime: 4,
  targetCompletionDate: "2026-12-01T10:00:00.000Z",
  timeSpent: 0,
  isComplete: false,
  ...overrides
});

const buildTimeEntry = (overrides = {}) => ({
  _id: "entry-1",
  startedAt: "2025-01-15T09:00:00.000Z",
  endedAt: "2025-01-15T10:00:00.000Z",
  durationMinutes: 60,
  ...overrides
});

const buildGoal = (overrides = {}) => ({
  _id: "goal-1",
  title: "Launch Program",
  category: { title: "Planning" },
  estimatedHours: 8,
  timeSpent: 1,
  timeLeft: 7,
  isComplete: false,
  targetCompletionDate: "2026-12-12T10:00:00.000Z",
  parentGoalId: null,
  ...overrides
});

const setDateTimeValue = (label, value) => {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value }
  });
};

const openInlineTaskEditMode = async () => {
  await screen.findByText(/no logged time yet for this task/i);
  fireEvent.click(screen.getByRole("button", { name: /edit task summary/i }));
  expect(
    await screen.findByRole("spinbutton", { name: /estimated completion time \(hours\)/i })
  ).toBeInTheDocument();
};

describe("TaskView", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    fetchGoals.mockResolvedValue([]);
    fetchTasks.mockResolvedValue([]);
    fetchLists.mockResolvedValue([]);
    fetchCategories.mockResolvedValue([]);
    useGoogleCalendarStatus.mockReturnValue({
      status: null,
      loading: false
    });
    fetchTaskTimeEntries.mockResolvedValue([]);
    createTaskTimeEntry.mockResolvedValue({});
    updateTaskTimeEntry.mockResolvedValue({});
    deleteTaskTimeEntry.mockResolvedValue({});
    updateTask.mockResolvedValue({});
    deleteTask.mockResolvedValue({});
  });

  test("logs a valid time entry and adds it to the recent entries list", async () => {
    const task = buildTask();
    const createdEntry = buildTimeEntry({
      _id: "entry-2",
      startedAt: "2025-01-15T11:00:00.000Z",
      endedAt: "2025-01-15T12:30:00.000Z",
      durationMinutes: 90
    });

    createTaskTimeEntry.mockResolvedValue({
      task: buildTask({ timeSpent: 1.5 }),
      timeEntry: createdEntry,
      duplicate: false
    });

    renderTaskView(task);

    await screen.findByText(/no logged time yet for this task/i);

    setDateTimeValue("Start time", "2025-01-15T11:00:00.000Z");
    setDateTimeValue("End time", "2025-01-15T12:30:00.000Z");

    fireEvent.click(screen.getByRole("button", { name: /^log time$/i }));

    await waitFor(() =>
      expect(createTaskTimeEntry).toHaveBeenCalledWith("task-1", {
        startedAt: expect.any(Date),
        endedAt: expect.any(Date)
      })
    );

    expect(
      await screen.findByText(/logged 1\.5 hours\. total time is now 1\.5 hours\./i)
    ).toBeInTheDocument();
    expect(screen.getByText("1h 30m")).toBeInTheDocument();
  });

  test("blocks invalid time ranges before submitting", async () => {
    renderTaskView(buildTask());

    await screen.findByText(/no logged time yet for this task/i);

    setDateTimeValue("Start time", "2025-01-15T12:30:00.000Z");
    setDateTimeValue("End time", "2025-01-15T11:00:00.000Z");

    fireEvent.click(screen.getByRole("button", { name: /^log time$/i }));

    expect(await screen.findByText(/end time must be after start time\./i)).toBeInTheDocument();
    expect(createTaskTimeEntry).not.toHaveBeenCalled();
  });

  test("edits an existing time entry and refreshes the success summary", async () => {
    const task = buildTask({ timeSpent: 1 });
    const existingEntry = buildTimeEntry();
    const updatedEntry = buildTimeEntry({
      startedAt: "2025-01-15T09:00:00.000Z",
      endedAt: "2025-01-15T11:30:00.000Z",
      durationMinutes: 150
    });

    fetchTaskTimeEntries.mockResolvedValue([existingEntry]);
    updateTaskTimeEntry.mockResolvedValue({
      task: buildTask({ timeSpent: 2.5 }),
      timeEntry: updatedEntry
    });

    renderTaskView(task);

    expect(await screen.findByRole("button", { name: /edit time entry /i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit time entry /i }));

    setDateTimeValue("Edit start time", "2025-01-15T09:00:00.000Z");
    setDateTimeValue("Edit end time", "2025-01-15T11:30:00.000Z");

    fireEvent.click(screen.getByRole("button", { name: /save time entry /i }));

    await waitFor(() =>
      expect(updateTaskTimeEntry).toHaveBeenCalledWith("task-1", "entry-1", {
        startedAt: expect.any(Date),
        endedAt: expect.any(Date)
      })
    );

    expect(
      await screen.findByText(/updated time entry to 2\.5 hours\. total time is now 2\.5 hours\./i)
    ).toBeInTheDocument();
    expect(screen.getByText("2h 30m")).toBeInTheDocument();
  });

  test("deletes an existing time entry and returns to the empty state", async () => {
    const task = buildTask({ timeSpent: 1 });
    const existingEntry = buildTimeEntry();

    fetchTaskTimeEntries.mockResolvedValue([existingEntry]);
    deleteTaskTimeEntry.mockResolvedValue({
      task: buildTask({ timeSpent: 0 })
    });

    renderTaskView(task);

    expect(await screen.findByRole("button", { name: /delete time entry /i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /delete time entry /i }));

    await waitFor(() => expect(deleteTaskTimeEntry).toHaveBeenCalledWith("task-1", "entry-1"));

    expect(
      await screen.findByText(/deleted time entry\. total time is now 0 hours\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/no logged time yet for this task/i)).toBeInTheDocument();
  });

  test("saves inline task edits from the summary and details cards", async () => {
    const updatedTask = buildTask({
      title: "Prepare launch roadmap",
      description: "Rework the rollout milestones.",
      category: { title: "Delivery" },
      estimatedCompletionTime: 6,
      targetCompletionDate: "2026-12-03T10:00:00.000Z",
      isComplete: true
    });

    fetchCategories.mockResolvedValue([
      { _id: "cat-1", title: "Planning" },
      { _id: "cat-2", title: "Delivery" }
    ]);
    updateTask.mockResolvedValue(updatedTask);

    renderTaskView(buildTask());

    await openInlineTaskEditMode();

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Prepare launch roadmap" }
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Rework the rollout milestones." }
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "Delivery" }
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: /estimated completion time \(hours\)/i }), {
      target: { value: "6" }
    });
    setDateTimeValue("Target Completion Date", "2026-12-03T10:00:00.000Z");
    fireEvent.click(screen.getByRole("switch", { name: /mark complete/i }));

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(updateTask).toHaveBeenCalledWith("task-1", {
        title: "Prepare launch roadmap",
        description: "Rework the rollout milestones.",
        listId: null,
        parentGoalId: null,
        estimatedCompletionTime: 6,
        isComplete: true,
        targetCompletionDate: expect.any(Date),
        category: "Delivery"
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Prepare launch roadmap" })
    ).toBeInTheDocument();
    expect(screen.getByText(/delivery - dec 3, 2026/i)).toBeInTheDocument();
  });

  test("clears an existing target date and persists null through save", async () => {
    useGoogleCalendarStatus.mockReturnValue({
      status: {
        connected: true,
        selectedCalendarId: "calendar-primary",
        selectedCalendarSummary: "Primary Calendar",
        syncEnabled: true
      },
      loading: false
    });

    const updatedTask = buildTask({
      targetCompletionDate: null
    });

    updateTask.mockResolvedValue(updatedTask);

    renderTaskView(buildTask());

    await screen.findByText("Dec 1, 2026");
    expect(screen.getByText(/sync active/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit task details/i }));
    setDateTimeValue("Target Completion Date", "");
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(updateTask).toHaveBeenCalledWith("task-1", {
        title: "Prepare roadmap",
        description: "Draft the next release plan.",
        listId: null,
        parentGoalId: null,
        estimatedCompletionTime: 4,
        isComplete: false,
        targetCompletionDate: null,
        category: "Planning"
      })
    );

    expect(await screen.findByText("No deadline")).toBeInTheDocument();
    expect(screen.getByText(/^not syncing$/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/task target date removed\. its google calendar event will also be removed\./i)
    ).toBeInTheDocument();
  });

  test("toggles a task complete directly from the summary card", async () => {
    const completedTask = buildTask({
      isComplete: true
    });

    updateTask.mockResolvedValue(completedTask);

    renderTaskView(buildTask());

    await screen.findByText(/no logged time yet for this task/i);

    const completionToggle = screen.getByRole("switch", { name: /^complete$/i });

    expect(completionToggle).not.toBeChecked();

    fireEvent.click(completionToggle);

    await waitFor(() =>
      expect(updateTask).toHaveBeenCalledWith("task-1", {
        isComplete: true
      })
    );

    await waitFor(() => expect(screen.getByRole("switch", { name: /^complete$/i })).toBeChecked());
    expect(screen.queryByText("In progress")).not.toBeInTheDocument();
  });

  test("allows editing an overdue task without changing its existing past target date", async () => {
    const overdueTask = buildTask({
      _id: "task-overdue",
      title: "Old task",
      targetCompletionDate: "2000-01-10T10:00:00.000Z"
    });
    const updatedTask = buildTask({
      _id: "task-overdue",
      title: "Old task updated",
      targetCompletionDate: "2000-01-10T10:00:00.000Z"
    });

    updateTask.mockResolvedValue(updatedTask);

    renderTaskView(overdueTask);

    await openInlineTaskEditMode();

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Old task updated" }
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(updateTask).toHaveBeenCalledWith(
        "task-overdue",
        expect.objectContaining({
          title: "Old task updated",
          targetCompletionDate: expect.any(Date)
        })
      )
    );
  });

  test("shows goal tree context for a task linked to a goal tree", async () => {
    const rootGoal = buildGoal({
      _id: "goal-root",
      title: "Reach N2 Japanese Fluency"
    });
    const childGoal = buildGoal({
      _id: "goal-child",
      title: "Finish Genki Textbook",
      parentGoalId: "goal-root"
    });
    const siblingTask = buildTask({
      _id: "task-sibling",
      title: "Review kanji deck",
      parentGoalId: "goal-child"
    });
    const currentTask = buildTask({
      _id: "task-current",
      title: "Take mock listening test",
      parentGoalId: "goal-child"
    });

    fetchGoals.mockResolvedValue([rootGoal, childGoal]);
    fetchTasks.mockResolvedValue([siblingTask, currentTask]);

    renderTaskView(currentTask);

    const panel = await screen.findByRole("region", { name: /goal tree context/i });

    expect(
      await screen.findByText(/viewing the tree rooted at reach n2 japanese fluency\. the current task is highlighted\./i)
    ).toBeInTheDocument();
    expect(panel).toHaveTextContent("Goal");
    expect(panel).toHaveTextContent("Task");
    expect(panel).toHaveTextContent("Current");
    expect(panel).toHaveTextContent("Review kanji deck");
    expect(panel).toHaveTextContent("Take mock listening test");
  });

  test("shows a not-linked message when the task has no parent goal", async () => {
    renderTaskView(buildTask({ parentGoalId: null }));

    expect(
      await screen.findByText(/this task is not linked to a goal tree yet\./i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/link this task to a parent goal if you want it to appear inside a goal tree\./i)
    ).toBeInTheDocument();
  });
});
