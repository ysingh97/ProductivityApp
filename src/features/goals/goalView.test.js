import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GoalView from "./goalView";
import { fetchCategories } from "../categories/categoryService";
import { deleteGoal, fetchGoals, updateGoal } from "./goalService";

jest.mock("../categories/categoryService", () => ({
  fetchCategories: jest.fn()
}));

jest.mock("./goalService", () => ({
  deleteGoal: jest.fn(),
  fetchGoals: jest.fn(),
  updateGoal: jest.fn()
}));

jest.mock("../../components/DateTimePicker", () => {
  const dayjs = require("dayjs");

  return function MockDateTimePicker({
    label = "Target Completion Date",
    value,
    onChange
  }) {
    return (
      <input
        aria-label={label}
        value={value ? value.toISOString() : ""}
        onChange={(event) => onChange(event.target.value ? dayjs(event.target.value) : null)}
      />
    );
  };
});

const renderGoalView = (goal) =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GoalView goal={goal} />
    </MemoryRouter>
  );

const buildGoal = (overrides = {}) => ({
  _id: "goal-1",
  title: "Launch the roadmap",
  description: "Align deliverables for launch.",
  category: { title: "Strategy" },
  estimatedHours: 8,
  timeSpent: 2,
  timeLeft: 6,
  parentGoalId: null,
  targetCompletionDate: "2026-12-10T10:00:00.000Z",
  createdAt: "2025-01-10T10:00:00.000Z",
  isComplete: false,
  subGoals: [],
  subTasks: [],
  ...overrides
});

const waitForEditFormReady = async () => {
  await waitFor(() => expect(fetchGoals).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(fetchCategories).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: /edit details/i }));
  expect(await screen.findByRole("combobox", { name: /parent goal/i })).toBeInTheDocument();
};

const setParentGoal = async (label) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name: /parent goal/i }));
  const listbox = await screen.findByRole("listbox");
  fireEvent.click(within(listbox).getByText(label));
};

describe("GoalView", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    fetchGoals.mockResolvedValue([]);
    fetchCategories.mockResolvedValue([
      { _id: "cat-1", title: "Strategy" },
      { _id: "cat-2", title: "Delivery" }
    ]);
    updateGoal.mockResolvedValue({});
    deleteGoal.mockResolvedValue({});
  });

  test("saves top-level goal edits with parsed values", async () => {
    const goal = buildGoal();
    const updatedGoal = buildGoal({
      title: "Launch the public roadmap",
      description: "Ship the revised launch sequence.",
      category: { title: "Delivery" },
      estimatedHours: 10,
      targetCompletionDate: "2026-12-12T09:00:00.000Z",
      isComplete: true
    });

    updateGoal.mockResolvedValue(updatedGoal);

    renderGoalView(goal);

    await waitForEditFormReady();

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Launch the public roadmap" }
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Ship the revised launch sequence." }
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "Delivery" }
    });
    fireEvent.change(screen.getByLabelText(/estimated hours/i), {
      target: { value: "10" }
    });
    fireEvent.change(screen.getByLabelText(/target completion date/i), {
      target: { value: "2026-12-12T09:00:00.000Z" }
    });
    fireEvent.click(screen.getByRole("switch", { name: /mark complete/i }));

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(updateGoal).toHaveBeenCalledWith("goal-1", {
        title: "Launch the public roadmap",
        description: "Ship the revised launch sequence.",
        category: "Delivery",
        estimatedHours: 10,
        parentGoalId: null,
        targetCompletionDate: expect.any(Date),
        isComplete: true
      })
    );

    expect(await screen.findByText("Launch the public roadmap")).toBeInTheDocument();
    expect(screen.getByText(/delivery - dec 12, 2026/i)).toBeInTheDocument();
  });

  test("reparenting inherits the selected parent category and omits category from the payload", async () => {
    const currentGoal = buildGoal({
      title: "Finalize onboarding",
      category: { title: "Source category" }
    });
    const targetParent = buildGoal({
      _id: "goal-2",
      title: "Company launch",
      category: { title: "Target category" },
      targetCompletionDate: "2026-12-15T10:00:00.000Z"
    });
    const updatedGoal = buildGoal({
      title: "Finalize onboarding",
      category: { title: "Target category" },
      parentGoalId: "goal-2"
    });

    fetchGoals.mockResolvedValue([currentGoal, targetParent]);
    updateGoal.mockResolvedValue(updatedGoal);

    renderGoalView(currentGoal);

    await waitForEditFormReady();

    await setParentGoal("Company launch");

    await waitFor(() => expect(screen.getByLabelText(/category/i)).toHaveValue("Target category"));
    expect(screen.getByLabelText(/category/i)).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(updateGoal).toHaveBeenCalledTimes(1));

    const payload = updateGoal.mock.calls[0][1];
    expect(payload.parentGoalId).toBe("goal-2");
    expect(payload).not.toHaveProperty("category");
  });

  test("blocks reparenting when the goal deadline exceeds the selected parent deadline", async () => {
    const currentGoal = buildGoal({
      targetCompletionDate: "2026-12-20T10:00:00.000Z"
    });
    const tighterParent = buildGoal({
      _id: "goal-2",
      title: "Q4 launch",
      category: { title: "Strategy" },
      targetCompletionDate: "2026-12-18T10:00:00.000Z"
    });

    fetchGoals.mockResolvedValue([currentGoal, tighterParent]);

    renderGoalView(currentGoal);

    await waitForEditFormReady();

    await setParentGoal("Q4 launch");

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByText(/sub-goals cannot have a target completion date later than the parent goal\./i)
    ).toBeInTheDocument();
    expect(updateGoal).not.toHaveBeenCalled();
  });
});
