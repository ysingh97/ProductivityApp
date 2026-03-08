import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { fetchGoals } from "../features/goals/goalService";
import { fetchTasks } from "../features/tasks/taskService";

const GoalTreeView = () => {
  const { goalId } = useParams();
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isActive = true;

    const loadData = async () => {
      setError("");
      setLoading(true);
      try {
        const [goalData, taskData] = await Promise.all([fetchGoals(), fetchTasks()]);
        if (isActive) {
          setGoals(goalData);
          setTasks(taskData);
        }
      } catch (err) {
        console.error(err);
        if (isActive) {
          setError("Unable to load the goal tree right now.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      isActive = false;
    };
  }, []);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }),
    []
  );

  const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getCategoryLabel = (goal) => {
    if (!goal?.category) return "Uncategorized";
    if (typeof goal.category === "string") return goal.category;
    if (typeof goal.category === "object" && goal.category.title) {
      return goal.category.title;
    }
    return "Uncategorized";
  };

  const normalizedGoals = useMemo(
    () =>
      goals.map((goal) => ({
        ...goal,
        dueDate: parseDate(goal.targetCompletionDate),
        categoryLabel: getCategoryLabel(goal)
      })),
    [goals]
  );

  const normalizedTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        dueDate: parseDate(task.targetCompletionDate)
      })),
    [tasks]
  );

  const goalsById = useMemo(() => {
    const map = new Map();
    normalizedGoals.forEach((goal) => {
      map.set(String(goal._id), goal);
    });
    return map;
  }, [normalizedGoals]);

  const goalsByParent = useMemo(() => {
    const map = new Map();
    normalizedGoals.forEach((goal) => {
      if (!goal.parentGoalId) return;
      const parentId = String(goal.parentGoalId);
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId).push(goal);
    });
    map.forEach((children) => {
      children.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    });
    return map;
  }, [normalizedGoals]);

  const tasksByGoal = useMemo(() => {
    const map = new Map();
    normalizedTasks.forEach((task) => {
      if (!task.parentGoalId) return;
      const parentId = String(task.parentGoalId);
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId).push(task);
    });
    map.forEach((items) => {
      items.sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return (a.title || "").localeCompare(b.title || "");
      });
    });
    return map;
  }, [normalizedTasks]);

  const rootGoal = goalsById.get(String(goalId));

  const renderGoalNode = (nodeId, depth = 0) => {
    const goal = goalsById.get(String(nodeId));
    if (!goal) return null;

    const children = goalsByParent.get(String(nodeId)) || [];
    const goalTasks = tasksByGoal.get(String(nodeId)) || [];
    const dueLabel = goal.dueDate ? dateFormatter.format(goal.dueDate) : "No deadline";

    return (
      <Box
        key={goal._id}
        sx={{
          pl: depth ? 2 : 0,
          mt: depth ? 2 : 0,
          borderLeft: depth ? "1px solid" : "none",
          borderColor: depth ? "divider" : "transparent"
        }}
      >
        <Stack spacing={1.5}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={700}>{goal.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {goal.categoryLabel} • {dueLabel}
                </Typography>
              </Box>
              <Chip
                label={goal.isComplete ? "Complete" : "In progress"}
                color={goal.isComplete ? "success" : "warning"}
                size="small"
              />
            </Stack>
          </Paper>

          {goalTasks.length > 0 && (
            <Stack spacing={1} sx={{ pl: 2 }}>
              {goalTasks.map((task) => (
                <Paper
                  key={task._id}
                  variant="outlined"
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    backgroundColor: "rgba(0, 0, 0, 0.02)"
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {task.dueDate
                          ? `Due ${dateFormatter.format(task.dueDate)}`
                          : "No deadline"}
                      </Typography>
                    </Box>
                    <Chip
                      label={task.isComplete ? "Complete" : "Open"}
                      size="small"
                      color={task.isComplete ? "success" : "default"}
                      variant={task.isComplete ? "filled" : "outlined"}
                    />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}

          {children.map((child) => renderGoalNode(child._id, depth + 1))}
        </Stack>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, textAlign: "left" }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Goal tree view
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Explore the hierarchy of goals, subgoals, and subtasks.
          </Typography>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <Button variant="outlined" component={Link} to="/goals/overview">
            Back to in-depth goals view
          </Button>
          {rootGoal && (
            <Button variant="contained" component={Link} to={`/goals/${rootGoal._id}`}>
              Open goal
            </Button>
          )}
        </Stack>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        ) : !rootGoal ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="body1" fontWeight={600}>
              Goal not found.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The goal might have been removed or you may not have access.
            </Typography>
          </Paper>
        ) : (
          renderGoalNode(rootGoal._id)
        )}
      </Stack>
    </Container>
  );
};

export default GoalTreeView;
