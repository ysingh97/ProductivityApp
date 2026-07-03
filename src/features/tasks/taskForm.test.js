import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import TaskForm from "./taskForm";
import { fetchCategories } from "../categories/categoryService";
import { fetchGoals } from "../goals/goalService";
import { fetchLists } from "../lists/listService";

jest.mock("../categories/categoryService", () => ({
  fetchCategories: jest.fn()
}));

jest.mock("../goals/goalService", () => ({
  fetchGoals: jest.fn()
}));

jest.mock("../lists/listService", () => ({
  fetchLists: jest.fn()
}));

jest.mock("../../components/DateTimePicker", () => {
  const dayjs = require("dayjs");

  return function MockDateTimePicker({ label = "Target Completion Date", value, onChange }) {
    return (
      <input
        aria-label={label}
        value={value ? value.toISOString() : ""}
        onChange={(event) => onChange(event.target.value ? dayjs(event.target.value) : null)}
      />
    );
  };
});

describe("TaskForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    fetchLists.mockResolvedValue([]);
    fetchGoals.mockResolvedValue([]);
    fetchCategories.mockResolvedValue([
      { _id: "cat-1", title: "Focus" },
      { _id: "cat-2", title: "Deep Work" }
    ]);
  });

  test("submits standalone task data with its own category", async () => {
    const onSubmit = jest.fn().mockResolvedValue({});

    render(<TaskForm onSubmit={onSubmit} />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create task/i })).not.toBeDisabled()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Write release notes" }
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "Focus" }
    });
    fireEvent.change(screen.getByLabelText(/estimated hours/i), {
      target: { value: "2.5" }
    });
    fireEvent.change(screen.getByLabelText(/target completion date/i), {
      target: { value: "2099-01-01T10:00:00.000Z" }
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Capture the release summary." }
    });

    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Write release notes",
        description: "Capture the release summary.",
        estimatedCompletionTime: "2.5",
        category: "Focus",
        targetCompletionDate: expect.any(Date)
      })
    );
  });

  test("uses the parent goal category and omits category from the submitted payload", async () => {
    const onSubmit = jest.fn().mockResolvedValue({});

    fetchGoals.mockResolvedValue([
      {
        _id: "goal-1",
        title: "Launch",
        category: { title: "Deep Work" },
        targetCompletionDate: "2099-01-03T10:00:00.000Z"
      }
    ]);

    render(
      <TaskForm
        onSubmit={onSubmit}
        task={{
          title: "Draft announcement",
          description: "",
          parentGoalId: "goal-1",
          category: { title: "Deep Work" }
        }}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create task/i })).not.toBeDisabled()
    );

    const categoryInput = screen.getByLabelText(/category/i);
    expect(categoryInput).toBeDisabled();
    expect(categoryInput).toHaveValue("Deep Work");

    fireEvent.change(screen.getByLabelText(/target completion date/i), {
      target: { value: "2099-01-02T09:00:00.000Z" }
    });

    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.parentGoalId).toBe("goal-1");
    expect(payload).not.toHaveProperty("category");
  });

  test("submits null when the target completion date is left empty", async () => {
    const onSubmit = jest.fn().mockResolvedValue({});

    render(<TaskForm onSubmit={onSubmit} />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create task/i })).not.toBeDisabled()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Write release notes" }
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "Focus" }
    });
    fireEvent.change(screen.getByLabelText(/estimated hours/i), {
      target: { value: "2.5" }
    });

    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Write release notes",
        category: "Focus",
        targetCompletionDate: null
      })
    );
  });

  test("blocks submission when the task target date exceeds the parent goal deadline", async () => {
    const onSubmit = jest.fn().mockResolvedValue({});

    fetchGoals.mockResolvedValue([
      {
        _id: "goal-1",
        title: "Launch",
        category: { title: "Deep Work" },
        targetCompletionDate: "2099-01-03T10:00:00.000Z"
      }
    ]);

    render(
      <TaskForm
        onSubmit={onSubmit}
        task={{
          title: "Draft announcement",
          description: "",
          parentGoalId: "goal-1",
          category: { title: "Deep Work" }
        }}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create task/i })).not.toBeDisabled()
    );

    fireEvent.change(screen.getByLabelText(/target completion date/i), {
      target: { value: "2099-01-04T09:00:00.000Z" }
    });

    fireEvent.click(screen.getByRole("button", { name: /create task/i }));

    expect(
      await screen.findByText(/subtasks cannot have a target completion date later than the parent goal/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("allows editing an overdue task without changing its existing past target date", async () => {
    const onSubmit = jest.fn().mockResolvedValue({});

    render(
      <TaskForm
        onSubmit={onSubmit}
        isEditing
        task={{
          title: "Existing overdue task",
          description: "Original details",
          category: { title: "Focus" },
          estimatedCompletionTime: 2,
          targetCompletionDate: "2000-01-01T10:00:00.000Z"
        }}
      />
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /update task/i })).not.toBeDisabled()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Existing overdue task updated" }
    });

    fireEvent.click(screen.getByRole("button", { name: /update task/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Existing overdue task updated",
        targetCompletionDate: expect.any(Date)
      })
    );
  });
});
