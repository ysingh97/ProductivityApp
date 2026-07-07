import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CreateGoalPage from "./createGoalPage";
import { createGoal, fetchGoalById, updateGoal } from "./goalService";

jest.mock("./goalService", () => ({
  createGoal: jest.fn(),
  fetchGoalById: jest.fn(),
  updateGoal: jest.fn()
}));

jest.mock("./goalForm", () => function MockGoalForm({ onSubmit }) {
  return (
    <button
      type="button"
      onClick={() =>
        onSubmit({
          title: "Launch plan",
          description: "Milestones",
          estimatedHours: 4
        })
      }
    >
      Submit goal form
    </button>
  );
});

const renderCreateGoalPage = (initialPath = "/goal/new") =>
  render(
    <MemoryRouter
      initialEntries={[initialPath]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/goal/new" element={<CreateGoalPage />} />
        <Route path="/goal/:goalId/edit" element={<CreateGoalPage />} />
      </Routes>
    </MemoryRouter>
  );

describe("CreateGoalPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows follow-up actions after creating a goal", async () => {
    createGoal.mockResolvedValue({
      _id: "goal-123",
      title: "Launch plan"
    });

    renderCreateGoalPage();

    fireEvent.click(screen.getByRole("button", { name: /submit goal form/i }));

    expect(await screen.findByText(/created "launch plan"\./i)).toBeInTheDocument();

    const openLink = screen.getByRole("link", { name: /^open$/i });
    const subgoalLink = screen.getByRole("link", { name: /add subgoal/i });
    const taskLink = screen.getByRole("link", { name: /add task/i });

    expect(openLink).toHaveAttribute("href", "/goals/goal-123");
    expect(subgoalLink).toHaveAttribute("href", "/goal/new");
    expect(taskLink).toHaveAttribute("href", "/task/new?goalId=goal-123");
  });

  test("keeps the success action compact when updating a goal", async () => {
    fetchGoalById.mockResolvedValue({
      _id: "goal-123",
      title: "Launch plan"
    });
    updateGoal.mockResolvedValue({
      _id: "goal-123",
      title: "Launch plan"
    });

    renderCreateGoalPage("/goal/goal-123/edit");

    await waitFor(() => expect(fetchGoalById).toHaveBeenCalledWith("goal-123"));
    await screen.findByRole("button", { name: /submit goal form/i });

    fireEvent.click(screen.getByRole("button", { name: /submit goal form/i }));

    expect(await screen.findByText(/updated "launch plan"\./i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^open$/i })).toHaveAttribute(
      "href",
      "/goals/goal-123"
    );
    expect(screen.queryByRole("link", { name: /add subgoal/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /add task/i })).not.toBeInTheDocument();
  });
});
