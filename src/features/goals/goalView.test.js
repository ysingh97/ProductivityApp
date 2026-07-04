import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GoalView from "./goalView";
import { fetchCategories } from "../categories/categoryService";
import { deleteGoal, fetchGoals, updateGoal } from "./goalService";
import { fetchTasks } from "../tasks/taskService";
import useGoogleCalendarStatus from "../integrations/useGoogleCalendarStatus";

jest.mock("../categories/categoryService", () => ({
  fetchCategories: jest.fn()
}));

jest.mock("./goalService", () => ({
  deleteGoal: jest.fn(),
  fetchGoals: jest.fn(),
  updateGoal: jest.fn()
}));

jest.mock("../tasks/taskService", () => ({
  fetchTasks: jest.fn()
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
    const inputAriaLabel =
      textFieldProps?.inputProps?.["aria-label"] || label || "Target Completion Date";

    return (
      <input
        aria-label={inputAriaLabel}
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

const buildTask = (overrides = {}) => ({
  _id: "task-1",
  title: "Practice reading drills",
  estimatedCompletionTime: 2,
  timeSpent: 0.5,
  isComplete: false,
  targetCompletionDate: "2026-12-08T10:00:00.000Z",
  parentGoalId: "goal-child",
  ...overrides
});

const openInlineEditMode = async () => {
  await waitFor(() => expect(fetchGoals).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(fetchCategories).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: /edit goal summary/i }));
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
    fetchTasks.mockResolvedValue([]);
    useGoogleCalendarStatus.mockReturnValue({
      status: null,
      loading: false
    });
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

    await openInlineEditMode();

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Launch the public roadmap" }
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Ship the revised launch sequence." }
    });
    fireEvent.change(screen.getByLabelText(/category/i), {
      target: { value: "Delivery" }
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: /estimated hours/i }), {
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

    expect(
      await screen.findByRole("heading", { name: "Launch the public roadmap" })
    ).toBeInTheDocument();
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

    await openInlineEditMode();

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

    await openInlineEditMode();

    await setParentGoal("Q4 launch");

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByText(/sub-goals cannot have a target completion date later than the parent goal\./i)
    ).toBeInTheDocument();
    expect(updateGoal).not.toHaveBeenCalled();
  });

  test("allows saving other edits on an overdue goal without changing its past target date", async () => {
    const overdueGoal = buildGoal({
      _id: "goal-overdue",
      title: "Old roadmap",
      targetCompletionDate: "2000-01-10T10:00:00.000Z"
    });
    const updatedGoal = buildGoal({
      _id: "goal-overdue",
      title: "Old roadmap updated",
      targetCompletionDate: "2000-01-10T10:00:00.000Z"
    });

    updateGoal.mockResolvedValue(updatedGoal);

    renderGoalView(overdueGoal);

    await openInlineEditMode();

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Old roadmap updated" }
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(updateGoal).toHaveBeenCalledWith(
        "goal-overdue",
        expect.objectContaining({
          title: "Old roadmap updated",
          targetCompletionDate: expect.any(Date)
        })
      )
    );
  });

  test("still blocks changing an overdue goal to a different past target date", async () => {
    const overdueGoal = buildGoal({
      _id: "goal-overdue",
      targetCompletionDate: "2000-01-10T10:00:00.000Z"
    });

    renderGoalView(overdueGoal);

    await openInlineEditMode();

    fireEvent.change(screen.getByLabelText(/target completion date/i), {
      target: { value: "2000-01-11T10:00:00.000Z" }
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByText(/target completion date cannot be earlier than the current time\./i)
    ).toBeInTheDocument();
    expect(updateGoal).not.toHaveBeenCalled();
  });

  test("does not offer descendant goals as parent options", async () => {
    const currentGoal = buildGoal({
      _id: "goal-root",
      title: "Program root"
    });
    const childGoal = buildGoal({
      _id: "goal-child",
      title: "Nested child",
      parentGoalId: "goal-root"
    });
    const siblingGoal = buildGoal({
      _id: "goal-sibling",
      title: "Valid sibling parent",
      parentGoalId: null
    });

    fetchGoals.mockResolvedValue([currentGoal, childGoal, siblingGoal]);

    renderGoalView(currentGoal);

    await openInlineEditMode();

    fireEvent.mouseDown(screen.getByRole("combobox", { name: /parent goal/i }));
    const listbox = await screen.findByRole("listbox");

    expect(within(listbox).getByText("None")).toBeInTheDocument();
    expect(within(listbox).getByText("Valid sibling parent")).toBeInTheDocument();
    expect(within(listbox).queryByText("Nested child")).not.toBeInTheDocument();
  });

  test("shows goal tree context with the current goal highlighted", async () => {
    const rootGoal = buildGoal({
      _id: "goal-root",
      title: "Launch Program",
      category: { title: "Work" },
      parentGoalId: null
    });
    const siblingGoal = buildGoal({
      _id: "goal-sibling",
      title: "Messaging",
      category: { title: "Work" },
      parentGoalId: "goal-root"
    });
    const currentGoal = buildGoal({
      _id: "goal-child",
      title: "QA Pass",
      category: { title: "Work" },
      parentGoalId: "goal-root"
    });
    const childGoal = buildGoal({
      _id: "goal-grandchild",
      title: "Regression sweep",
      category: { title: "Work" },
      parentGoalId: "goal-child"
    });
    const currentGoalTask = buildTask({
      _id: "task-child",
      title: "Take mock listening test",
      parentGoalId: "goal-child"
    });

    fetchGoals.mockResolvedValue([rootGoal, siblingGoal, currentGoal, childGoal]);
    fetchTasks.mockResolvedValue([currentGoalTask]);

    renderGoalView(currentGoal);

    const panel = await screen.findByRole("region", { name: /goal tree context/i });

    expect(within(panel).getByText(/viewing the tree rooted at launch program\./i)).toBeInTheDocument();
    expect(within(panel).getByText("Current")).toBeInTheDocument();
    expect(within(panel).getByText("Top-level")).toBeInTheDocument();
    expect(within(panel).getByText("Messaging")).toBeInTheDocument();
    expect(within(panel).getByText("Regression sweep")).toBeInTheDocument();
    expect(within(panel).getByText("Take mock listening test")).toBeInTheDocument();
    expect(within(panel).getByText("Task")).toBeInTheDocument();
    expect(within(panel).getAllByText("Goal").length).toBeGreaterThan(0);
    expect(within(panel).getByRole("link", { name: /launch program/i })).toHaveAttribute(
      "href",
      "/goals/goal-root"
    );
    expect(within(panel).getByRole("link", { name: /qa pass/i })).toHaveAttribute(
      "href",
      "/goals/goal-child"
    );
    expect(within(panel).getByRole("link", { name: /take mock listening test/i })).toHaveAttribute(
      "href",
      "/tasks/task-child"
    );
  });

  test("goal tree context does not recurse forever when cyclic goal data exists", async () => {
    const currentGoal = buildGoal({
      _id: "goal-a",
      title: "Cycle A",
      parentGoalId: "goal-b"
    });
    const parentGoal = buildGoal({
      _id: "goal-b",
      title: "Cycle B",
      parentGoalId: "goal-a"
    });

    fetchGoals.mockResolvedValue([currentGoal, parentGoal]);

    renderGoalView(currentGoal);

    const panel = await screen.findByRole("region", { name: /goal tree context/i });

    expect(within(panel).getByRole("link", { name: /cycle a/i })).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /cycle b/i })).toBeInTheDocument();
  });

  test("canceling edit mode restores the original goal detail values", async () => {
    const goal = buildGoal();

    renderGoalView(goal);

    await openInlineEditMode();

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: "Draft launch message" }
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Temporary unsaved description." }
    });

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(screen.getByRole("heading", { name: "Launch the roadmap" })).toBeInTheDocument();
    expect(screen.getByText("Align deliverables for launch.")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Draft launch message")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Temporary unsaved description.")).not.toBeInTheDocument();
  });

  test("edit mode uses a single visible label for inline detail fields", async () => {
    renderGoalView(buildGoal());

    await openInlineEditMode();

    expect(screen.getAllByText(/^Estimated hours$/i)).toHaveLength(1);
    expect(screen.getAllByText(/^Category$/i)).toHaveLength(1);
    expect(screen.getAllByText(/^Parent goal$/i)).toHaveLength(1);
  });

  test("shows Google Calendar sync state and a toast when a goal date is removed", async () => {
    useGoogleCalendarStatus.mockReturnValue({
      status: {
        connected: true,
        selectedCalendarId: "calendar-primary",
        selectedCalendarSummary: "Primary Calendar",
        syncEnabled: true
      },
      loading: false
    });

    const updatedGoal = buildGoal({
      targetCompletionDate: null
    });

    updateGoal.mockResolvedValue(updatedGoal);

    renderGoalView(buildGoal());

    expect(screen.getByText(/eligible to sync/i)).toBeInTheDocument();
    expect(
      screen.getByText(/dated, incomplete items sync to primary calendar\./i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /edit goal details/i }));
    fireEvent.change(screen.getByLabelText(/target completion date/i), {
      target: { value: "" }
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(updateGoal).toHaveBeenCalledWith(
        "goal-1",
        expect.objectContaining({
          targetCompletionDate: null
        })
      )
    );

    expect(await screen.findByText("No deadline")).toBeInTheDocument();
    expect(
      screen.getByText(/items without a target date do not sync to google calendar\./i)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/goal target date removed\. its google calendar event will also be removed\./i)
    ).toBeInTheDocument();
  });
});
