import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import dayjs from "dayjs";
import { MemoryRouter } from "react-router-dom";
import GoalForm from "./goalForm";
import { fetchCategories } from "../categories/categoryService";
import { fetchGoals } from "./goalService";
import useGoogleCalendarStatus from "../integrations/useGoogleCalendarStatus";

jest.mock("../categories/categoryService", () => ({
  fetchCategories: jest.fn()
}));

jest.mock("./goalService", () => ({
  fetchGoals: jest.fn()
}));

jest.mock("../integrations/useGoogleCalendarStatus", () => jest.fn());

jest.mock("../../components/DateTimePicker", () => {
  const dayjs = require("dayjs");

  return function MockDateTimePicker({
    label = "Target Completion Date",
    value,
    onChange,
    textFieldProps
  }) {
    return (
      <div>
        <input
          aria-label={label}
          value={value ? value.toISOString() : ""}
          onChange={(event) => onChange(event.target.value ? dayjs(event.target.value) : null)}
        />
        {textFieldProps?.helperText ? <span>{textFieldProps.helperText}</span> : null}
      </div>
    );
  };
});

const renderGoalForm = (ui, { state } = {}) =>
  render(
    <MemoryRouter
      initialEntries={[{ pathname: "/", state }]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      {ui}
    </MemoryRouter>
  );

describe("GoalForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    fetchGoals.mockResolvedValue([]);
    fetchCategories.mockResolvedValue([
      { _id: "cat-1", title: "Growth" },
      { _id: "cat-2", title: "Strategy" }
    ]);
    useGoogleCalendarStatus.mockReturnValue({
      status: null,
      loading: false
    });
  });

  test("submits top-level goal data with its own category and parsed estimate", async () => {
    const onSubmit = jest.fn().mockResolvedValue({});

    renderGoalForm(<GoalForm onSubmit={onSubmit} />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create goal/i })).not.toBeDisabled()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Plan Q4 roadmap" }
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "Strategy" }
    });
    fireEvent.change(screen.getByLabelText(/estimated hours/i), {
      target: { value: "8" }
    });
    fireEvent.change(screen.getByLabelText(/target completion date/i), {
      target: { value: "2099-02-01T10:00:00.000Z" }
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Draft milestones and sequencing." }
    });

    fireEvent.click(screen.getByRole("button", { name: /create goal/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Plan Q4 roadmap",
        description: "Draft milestones and sequencing.",
        category: "Strategy",
        estimatedHours: 8,
        targetCompletionDate: expect.any(Date)
      })
    );
  });

  test("blocks creating a goal with a past target date", async () => {
    const onSubmit = jest.fn().mockResolvedValue({});

    renderGoalForm(<GoalForm onSubmit={onSubmit} />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create goal/i })).not.toBeDisabled()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Past-dated goal" }
    });
    fireEvent.change(screen.getByLabelText(/target completion date/i), {
      target: { value: "2000-01-01T10:00:00.000Z" }
    });

    fireEvent.click(screen.getByRole("button", { name: /create goal/i }));

    expect(
      await screen.findByText(/target completion date cannot be earlier than the current time\./i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("inherits the parent goal category and omits category from the submitted payload", async () => {
    const onSubmit = jest.fn().mockResolvedValue({});
    const parentGoal = {
      _id: "goal-1",
      title: "Company Launch",
      category: { title: "Growth" },
      targetCompletionDate: "2099-02-03T10:00:00.000Z"
    };

    fetchGoals.mockResolvedValue([parentGoal]);

    renderGoalForm(<GoalForm onSubmit={onSubmit} />, {
      state: {
        parentGoal,
        isParentGoalFixed: true
      }
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create goal/i })).not.toBeDisabled()
    );

    const categoryInput = screen.getByLabelText(/category/i);
    const parentGoalInput = screen.getByLabelText(/parent goal/i);

    expect(categoryInput).toBeDisabled();
    expect(categoryInput).toHaveValue("Growth");
    expect(parentGoalInput).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Finalize launch copy" }
    });
    fireEvent.change(screen.getByLabelText(/estimated hours/i), {
      target: { value: "3" }
    });
    fireEvent.change(screen.getByLabelText(/target completion date/i), {
      target: { value: "2099-02-02T10:00:00.000Z" }
    });

    fireEvent.click(screen.getByRole("button", { name: /create goal/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.parentGoalId).toBe("goal-1");
    expect(payload).not.toHaveProperty("category");
  });

  test("blocks submission when the goal target date exceeds the parent goal deadline", async () => {
    const onSubmit = jest.fn().mockResolvedValue({});
    const parentGoal = {
      _id: "goal-1",
      title: "Company Launch",
      category: { title: "Growth" },
      targetCompletionDate: "2099-02-03T10:00:00.000Z"
    };

    fetchGoals.mockResolvedValue([parentGoal]);

    renderGoalForm(<GoalForm onSubmit={onSubmit} />, {
      state: {
        parentGoal,
        isParentGoalFixed: true
      }
    });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create goal/i })).not.toBeDisabled()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Finalize launch copy" }
    });
    fireEvent.change(screen.getByLabelText(/target completion date/i), {
      target: { value: "2099-02-04T10:00:00.000Z" }
    });

    fireEvent.click(screen.getByRole("button", { name: /create goal/i }));

    expect(
      await screen.findByText(/sub-goals cannot have a target completion date later than the parent goal/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("allows editing an overdue goal without changing its existing past target date", async () => {
    const onSubmit = jest.fn().mockResolvedValue({});
    const goal = {
      _id: "goal-1",
      title: "Existing overdue goal",
      description: "Original description",
      category: { title: "Growth" },
      estimatedHours: 5,
      targetCompletionDate: "2000-01-01T10:00:00.000Z",
      parentGoalId: null
    };

    renderGoalForm(<GoalForm goal={goal} isEditing onSubmit={onSubmit} />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /update goal/i })).not.toBeDisabled()
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Existing overdue goal updated" }
    });

    fireEvent.click(screen.getByRole("button", { name: /update goal/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Existing overdue goal updated",
        targetCompletionDate: expect.any(Date)
      })
    );
  });

  test("shows a Google Calendar warning when the goal is undated and sync is connected", async () => {
    useGoogleCalendarStatus.mockReturnValue({
      status: { connected: true },
      loading: false
    });

    renderGoalForm(<GoalForm onSubmit={jest.fn()} />);

    expect(
      await screen.findByText(/without a target date, this item will not sync to google calendar\./i)
    ).toBeInTheDocument();
  });
});
