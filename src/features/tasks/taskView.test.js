import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import { MemoryRouter } from "react-router-dom";
import TaskView from "./taskView";
import { fetchCategories } from "../categories/categoryService";
import { fetchGoals } from "../goals/goalService";
import { fetchLists } from "../lists/listService";
import {
  createTaskTimeEntry,
  deleteTask,
  deleteTaskTimeEntry,
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

jest.mock("./taskService", () => ({
  createTaskTimeEntry: jest.fn(),
  deleteTask: jest.fn(),
  deleteTaskTimeEntry: jest.fn(),
  fetchTaskTimeEntries: jest.fn(),
  updateTask: jest.fn(),
  updateTaskTimeEntry: jest.fn()
}));

jest.mock("./taskCompletionBar", () => () => <div>Task completion bar</div>);

jest.mock("../../components/DateTimePicker", () => {
  const dayjs = require("dayjs");

  return function MockDateTimePicker({ label = "Date Time", value, onChange }) {
    return (
      <input
        aria-label={label}
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

const setDateTimeValue = (label, value) => {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value }
  });
};

describe("TaskView", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    fetchGoals.mockResolvedValue([]);
    fetchLists.mockResolvedValue([]);
    fetchCategories.mockResolvedValue([]);
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

    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /^edit$/i })).toHaveLength(2)
    );

    fireEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[1]);

    setDateTimeValue("Edit start time", "2025-01-15T09:00:00.000Z");
    setDateTimeValue("Edit end time", "2025-01-15T11:30:00.000Z");

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

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

    expect(await screen.findByRole("button", { name: /^delete$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(deleteTaskTimeEntry).toHaveBeenCalledWith("task-1", "entry-1"));

    expect(
      await screen.findByText(/deleted time entry\. total time is now 0 hours\./i)
    ).toBeInTheDocument();
    expect(screen.getByText(/no logged time yet for this task/i)).toBeInTheDocument();
  });
});
