import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

const getCategoryLabel = (value) => {
  if (!value) return "Uncategorized";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.title) return value.title;
  return "Uncategorized";
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const GoalTreeContextPanel = ({ currentGoal, currentTask, goals = [], tasks = [] }) => {
  const normalizedGoals = useMemo(() => {
    const byId = new Map();

    goals.forEach((goal) => {
      if (goal?._id) {
        byId.set(String(goal._id), goal);
      }
    });

    if (currentGoal?._id) {
      byId.set(String(currentGoal._id), currentGoal);
    }

    return Array.from(byId.values());
  }, [currentGoal, goals]);

  const normalizedTasks = useMemo(() => {
    const byId = new Map();

    tasks
      .filter((task) => task?._id)
      .forEach((task) => {
        byId.set(String(task._id), {
          ...task,
          dueDate: parseDate(task.targetCompletionDate)
        });
      });

    if (currentTask?._id) {
      byId.set(String(currentTask._id), {
        ...currentTask,
        dueDate: parseDate(currentTask.targetCompletionDate)
      });
    }

    return Array.from(byId.values()).filter((task) => task.parentGoalId);
  }, [currentTask, tasks]);

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
      const parentId = String(task.parentGoalId);
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }

      map.get(parentId).push(task);
    });

    map.forEach((goalTasks) => {
      goalTasks.sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return (a.title || "").localeCompare(b.title || "");
      });
    });

    return map;
  }, [normalizedTasks]);

  const selectedGoalId = currentGoal?._id ? String(currentGoal._id) : null;
  const selectedTaskId = currentTask?._id ? String(currentTask._id) : null;

  const rootGoalId = useMemo(() => {
    const contextGoalId = selectedGoalId || (currentTask?.parentGoalId ? String(currentTask.parentGoalId) : null);
    if (!contextGoalId) return null;

    let nextId = contextGoalId;
    const visited = new Set();

    while (nextId && !visited.has(nextId)) {
      visited.add(nextId);
      const goal = goalsById.get(nextId);

      if (!goal) {
        return contextGoalId;
      }

      if (!goal.parentGoalId) {
        return nextId;
      }

      const parentId = String(goal.parentGoalId);
      if (!goalsById.has(parentId)) {
        return contextGoalId;
      }

      nextId = parentId;
    }

    return contextGoalId;
  }, [currentTask, goalsById, selectedGoalId]);

  const rootGoal = rootGoalId ? goalsById.get(rootGoalId) : null;

  const renderTaskNode = (task) => {
    const isSelectedTask = String(task._id) === selectedTaskId;

    return (
    <Paper
      key={task._id}
      component={Link}
      to={`/tasks/${task._id}`}
      variant="outlined"
      sx={{
        p: 1.1,
        borderRadius: 2,
        textDecoration: "none",
        color: "inherit",
        backgroundColor: isSelectedTask
          ? (theme) => alpha(theme.palette.secondary.main, 0.14)
          : (theme) => alpha(theme.palette.secondary.main, 0.08),
        borderColor: isSelectedTask
          ? "secondary.main"
          : (theme) => alpha(theme.palette.secondary.main, 0.28),
        boxShadow: isSelectedTask
          ? (theme) => `0 0 0 1px ${alpha(theme.palette.secondary.main, 0.18)}`
          : "none",
        transition: "0.2s",
        "&:hover": {
          borderColor: "secondary.main",
          backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.12)
        }
      }}
    >
      <Stack spacing={0.75}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
            >
              {task.title}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.25, overflowWrap: "anywhere" }}
            >
              {task.dueDate
                ? `Task due ${task.dueDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}`
                : "Task with no deadline"}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap" }}>
            <Chip label="Task" size="small" color="secondary" variant="outlined" />
            {isSelectedTask && <Chip label="Current" size="small" color="secondary" />}
            <Chip
              label={task.isComplete ? "Complete" : "Open"}
              size="small"
              color={task.isComplete ? "success" : "default"}
              variant={task.isComplete ? "filled" : "outlined"}
            />
          </Stack>
        </Stack>
      </Stack>
    </Paper>
    );
  };

  const renderGoalNode = (nodeId) => {
    const goal = goalsById.get(String(nodeId));
    if (!goal) return null;

    const children = goalsByParent.get(String(nodeId)) || [];
    const goalTasks = tasksByGoal.get(String(nodeId)) || [];
    const isSelectedGoal = String(goal._id) === selectedGoalId;
    const isRootGoal = !goal.parentGoalId;

    return (
      <Stack key={goal._id} spacing={1}>
        <Paper
          component={Link}
          to={`/goals/${goal._id}`}
          variant="outlined"
          sx={{
            p: 1.25,
            borderRadius: 2,
            textDecoration: "none",
            color: "inherit",
            borderColor: isSelectedGoal ? "primary.main" : "divider",
            backgroundColor: isSelectedGoal
              ? (theme) => alpha(theme.palette.primary.main, 0.08)
              : "background.paper",
            boxShadow: isSelectedGoal
              ? (theme) => `0 0 0 1px ${alpha(theme.palette.primary.main, 0.16)}`
              : "none",
            transition: "0.2s",
            "&:hover": {
              borderColor: "primary.main",
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.05)
            }
          }}
        >
          <Stack spacing={0.75}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              sx={{ alignItems: { sm: "flex-start" }, justifyContent: "space-between" }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography
                  variant="body2"
                  fontWeight={isSelectedGoal ? 700 : 600}
                  sx={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
                >
                  {goal.title}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.25, overflowWrap: "anywhere" }}
                >
                  {getCategoryLabel(goal.category)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: "wrap" }}>
                <Chip label="Goal" size="small" color="primary" variant="outlined" />
                {isRootGoal && (
                  <Chip label="Top-level" size="small" variant="outlined" color="primary" />
                )}
                {isSelectedGoal && <Chip label="Current" size="small" color="primary" />}
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        {(children.length > 0 || goalTasks.length > 0) && (
          <Box sx={{ ml: 1.5, pl: 1.75, borderLeft: "1px solid", borderColor: "divider" }}>
            <Stack spacing={1.1}>
              {children.map((child) => renderGoalNode(child._id))}
              {goalTasks.map((task) => renderTaskNode(task))}
            </Stack>
          </Box>
        )}
      </Stack>
    );
  };

  const hasGoalContext = Boolean(rootGoal);
  const showStandaloneTaskMessage = Boolean(currentTask?._id) && !currentTask?.parentGoalId;
  const headingDescription = showStandaloneTaskMessage
    ? "This task is not linked to a goal tree yet."
    : currentTask?._id && rootGoal
      ? `Viewing the tree rooted at ${rootGoal?.title}. The current task is highlighted.`
      : currentTask?._id
        ? "This task's parent goal could not be loaded."
      : String(rootGoal?._id) === selectedGoalId
        ? "This goal is at the top of its tree."
        : `Viewing the tree rooted at ${rootGoal?.title}. The current goal is highlighted.`;

  if (!currentGoal?._id && !currentTask?._id) {
    return null;
  }

  return (
    <Paper
      component="section"
      aria-labelledby="goal-tree-context-heading"
      variant="outlined"
      sx={{ p: 2.5, borderRadius: 3 }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography id="goal-tree-context-heading" variant="subtitle1" fontWeight={700}>
            Goal tree context
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {headingDescription}
          </Typography>
        </Box>

        {hasGoalContext ? (
          <Box sx={{ maxHeight: 420, overflowY: "auto", pr: 0.5 }}>
            <Stack spacing={1.1}>{renderGoalNode(rootGoal._id)}</Stack>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Link this task to a parent goal if you want it to appear inside a goal tree.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default GoalTreeContextPanel;
