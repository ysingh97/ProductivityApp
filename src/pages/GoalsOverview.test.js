import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GoalsOverview from "./GoalsOverview";
import { fetchGoals } from "../features/goals/goalService";

jest.mock("../features/goals/goalService", () => ({
  fetchGoals: jest.fn()
}));

const renderGoalsOverview = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <GoalsOverview />
    </MemoryRouter>
  );

const buildGoal = (overrides = {}) => ({
  _id: "goal-1",
  title: "Gamma Cleanup",
  description: "Operations cleanup work.",
  category: { title: "Work" },
  estimatedHours: 6,
  timeSpent: 2,
  timeLeft: 4,
  isComplete: false,
  targetCompletionDate: "2026-01-20T10:00:00.000Z",
  createdAt: "2026-01-05T10:00:00.000Z",
  parentGoalId: null,
  ...overrides
});

const openSelectOption = async (name, optionLabel) => {
  fireEvent.mouseDown(screen.getByRole("combobox", { name }));
  const listbox = await screen.findByRole("listbox");
  fireEvent.click(within(listbox).getByText(optionLabel));
};

const expectBefore = (firstText, secondText) => {
  const first = screen.getByText(firstText);
  const second = screen.getByText(secondText);
  const position = first.compareDocumentPosition(second);

  expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
};

const expectElementBefore = (first, second) => {
  const position = first.compareDocumentPosition(second);

  expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
};

describe("GoalsOverview", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    fetchGoals.mockResolvedValue([
      buildGoal({
        _id: "goal-1",
        title: "Gamma Cleanup",
        description: "Operations cleanup work.",
        category: { title: "Work" },
        isComplete: false,
        targetCompletionDate: "2026-01-20T10:00:00.000Z",
        createdAt: "2026-01-05T10:00:00.000Z"
      }),
      buildGoal({
        _id: "goal-2",
        title: "Alpha Launch",
        description: "Launch planning and QA.",
        category: { title: "Health" },
        isComplete: true,
        targetCompletionDate: "2026-01-10T10:00:00.000Z",
        createdAt: "2026-01-03T10:00:00.000Z"
      }),
      buildGoal({
        _id: "goal-3",
        title: "Beta Research",
        description: "Customer interviews and notes.",
        category: { title: "Work" },
        isComplete: false,
        targetCompletionDate: null,
        createdAt: "2026-01-01T10:00:00.000Z"
      }),
      buildGoal({
        _id: "goal-4",
        title: "Nested follow-up",
        description: "A child goal that should not render in overview.",
        category: { title: "Work" },
        parentGoalId: "goal-1"
      })
    ]);
  });

  test("filters top-level goals by search text and status", async () => {
    renderGoalsOverview();

    expect(await screen.findByText("Gamma Cleanup")).toBeInTheDocument();
    expect(screen.getByText(/showing 3 of 3/i)).toBeInTheDocument();
    expect(screen.queryByText("Nested follow-up")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/search goals/i), {
      target: { value: "interviews" }
    });

    expect(await screen.findByText("Beta Research")).toBeInTheDocument();
    expect(screen.queryByText("Gamma Cleanup")).not.toBeInTheDocument();
    expect(screen.getByText(/showing 1 of 3/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^completed$/i }));

    expect(
      await screen.findByText(/no top-level goals match these filters\./i)
    ).toBeInTheDocument();
  });

  test("filters goals by category", async () => {
    renderGoalsOverview();

    expect(await screen.findByText("Alpha Launch")).toBeInTheDocument();

    await openSelectOption(/category/i, "Health");

    expect(await screen.findByText(/showing 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByText("Alpha Launch")).toBeInTheDocument();
    expect(screen.queryByText("Gamma Cleanup")).not.toBeInTheDocument();
    expect(screen.queryByText("Beta Research")).not.toBeInTheDocument();
  });

  test("re-sorts the goals when sort controls change", async () => {
    renderGoalsOverview();

    expect(await screen.findByText("Alpha Launch")).toBeInTheDocument();
    expectBefore("Alpha Launch", "Gamma Cleanup");
    expectBefore("Gamma Cleanup", "Beta Research");

    await openSelectOption(/sort by/i, "Alphabetical");
    await openSelectOption(/sort order/i, "Descending");

    await waitFor(() => {
      expectBefore("Gamma Cleanup", "Beta Research");
      expectBefore("Beta Research", "Alpha Launch");
    });
  });

  test("groups goals by category when category sorting is selected", async () => {
    renderGoalsOverview();

    expect(await screen.findByText("Alpha Launch")).toBeInTheDocument();

    await openSelectOption(/sort by/i, "Category");

    const healthHeader = await waitFor(() => {
      const header = screen.getAllByText("Health").find((element) => element.tagName === "SPAN");
      expect(header).toBeTruthy();
      return header;
    });
    const workHeader = await waitFor(() => {
      const header = screen.getAllByText("Work").find((element) => element.tagName === "SPAN");
      expect(header).toBeTruthy();
      return header;
    });

    expectElementBefore(healthHeader, workHeader);
    expectElementBefore(healthHeader, screen.getByText("Alpha Launch"));
    expectElementBefore(workHeader, screen.getByText("Gamma Cleanup"));
  });
});
