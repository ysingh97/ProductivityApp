import React, { useMemo, useState, useEffect } from "react";
import { fetchTasks } from "../features/tasks/taskService";
import { fetchLists } from "../features/lists/listService";
import { fetchGoals } from "../features/goals/goalService";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import {
  Container,
  Box,
  Typography,
  Button,
  Divider,
  Paper,
  Chip,
  Stack,
  CircularProgress
} from "@mui/material";

const TaskBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric"
      }),
    []
  );

  const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const startOfToday = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const startOfTomorrow = useMemo(() => {
    const date = new Date(startOfToday);
    date.setDate(date.getDate() + 1);
    return date;
  }, [startOfToday]);

  const startOfNextWeek = useMemo(() => {
    const date = new Date(startOfToday);
    date.setDate(date.getDate() + 7);
    return date;
  }, [startOfToday]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [taskRes, listRes, goalRes] = await Promise.all([
          fetchTasks(),
          fetchLists(),
          fetchGoals()
        ]);

        setTasks(taskRes);
        setLists(listRes);
        setGoals(goalRes);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSignOut = () => {
    logout();
    navigate("/", { replace: true });
  };

  const normalizedTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        dueDate: parseDate(task.targetCompletionDate)
      })),
    [tasks]
  );

  const overdueTasks = useMemo(
    () =>
      normalizedTasks
        .filter((task) => task.dueDate && task.dueDate < startOfToday && !task.isComplete)
        .sort((a, b) => a.dueDate - b.dueDate),
    [normalizedTasks, startOfToday]
  );

  const todayTasks = useMemo(
    () =>
      normalizedTasks
        .filter(
          (task) =>
            task.dueDate &&
            task.dueDate >= startOfToday &&
            task.dueDate < startOfTomorrow &&
            !task.isComplete
        )
        .sort((a, b) => a.dueDate - b.dueDate),
    [normalizedTasks, startOfToday, startOfTomorrow]
  );

  const nextWeekTasks = useMemo(
    () =>
      normalizedTasks
        .filter(
          (task) =>
            task.dueDate &&
            task.dueDate >= startOfTomorrow &&
            task.dueDate < startOfNextWeek &&
            !task.isComplete
        )
        .sort((a, b) => a.dueDate - b.dueDate),
    [normalizedTasks, startOfTomorrow, startOfNextWeek]
  );

  const noDateTasks = useMemo(
    () =>
      normalizedTasks
        .filter((task) => !task.dueDate && !task.isComplete)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [normalizedTasks]
  );

  const listById = useMemo(
    () => new Map(lists.map((list) => [list._id, list.title])),
    [lists]
  );

  const goalById = useMemo(
    () => new Map(goals.map((goal) => [goal._id, goal.title])),
    [goals]
  );

  const goalsInFocus = useMemo(() => {
    const focus = goals
      .filter((goal) => !goal.parentGoalId)
      .map((goal) => {
        const goalTasks = normalizedTasks.filter(
          (task) => task.parentGoalId === goal._id && !task.isComplete
        );
        const nextTask = goalTasks
          .filter((task) => task.dueDate)
          .sort((a, b) => a.dueDate - b.dueDate)[0];
        const goalDueDate = parseDate(goal.targetCompletionDate);
        return {
          ...goal,
          nextTask,
          openTasks: goalTasks.length,
          sortDate: nextTask?.dueDate || goalDueDate
        };
      })
      .sort((a, b) => {
        if (a.sortDate && b.sortDate) return a.sortDate - b.sortDate;
        if (a.sortDate) return -1;
        if (b.sortDate) return 1;
        return a.title.localeCompare(b.title);
      });
    return focus.slice(0, 4);
  }, [goals, normalizedTasks]);

  const getTaskMeta = (task) => {
    if (task.parentGoalId && goalById.has(task.parentGoalId)) {
      return `Goal: ${goalById.get(task.parentGoalId)}`;
    }
    if (task.listId && listById.has(task.listId)) {
      return `List: ${listById.get(task.listId)}`;
    }
    return null;
  };

  const getDueChip = (task) => {
    if (!task.dueDate) {
      return { label: "No date", color: "default" };
    }
    if (task.dueDate < startOfToday) {
      return {
        label: `Overdue · ${dateFormatter.format(task.dueDate)}`,
        color: "error"
      };
    }
    if (task.dueDate < startOfTomorrow) {
      return { label: "Today", color: "warning" };
    }
    return { label: dateFormatter.format(task.dueDate), color: "default" };
  };

  const renderTaskList = (items, emptyText) => {
    if (!items.length) {
      return (
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      );
    }

    return (
      <Stack spacing={1.5}>
        {items.map((task) => {
          const meta = getTaskMeta(task);
          const chip = getDueChip(task);
          return (
            <Paper
              key={task._id}
              component={Link}
              to={`/tasks/${task._id}`}
              variant="outlined"
              sx={{
                p: 1.5,
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                borderRadius: 2,
                transition: "0.2s",
                "&:hover": {
                  borderColor: "primary.main",
                  backgroundColor: "rgba(25, 118, 210, 0.04)"
                }
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={600} noWrap>
                  {task.title}
                </Typography>
                {meta && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {meta}
                  </Typography>
                )}
              </Box>
              <Chip label={chip.label} color={chip.color} size="small" />
            </Paper>
          );
        })}
      </Stack>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Dashboard Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          Dashboard
        </Typography>

        {/* Header Action Buttons */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {user && (
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="body2" fontWeight={600}>
                {user.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          )}
          <Button variant="contained" component={Link} to="/task/new">
            New Task
          </Button>
          <Button variant="contained" component={Link} to="/createGoalPage">
            New Goal
          </Button>
          <Button variant="outlined" component={Link} to="/createListPage">
            New List
          </Button>
          <Button variant="text" color="inherit" onClick={handleSignOut}>
            Sign out
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 4 }} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
          gap: 3
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Overdue ({overdueTasks.length})
            </Typography>
            {renderTaskList(overdueTasks, "All caught up.")}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Today ({todayTasks.length})
            </Typography>
            {renderTaskList(todayTasks, "No tasks due today.")}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Next 7 Days ({nextWeekTasks.length})
            </Typography>
            {renderTaskList(nextWeekTasks, "Nothing scheduled for the next week.")}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              No Date ({noDateTasks.length})
            </Typography>
            {renderTaskList(noDateTasks, "Everything has a date.")}
          </Paper>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Goals in Focus
            </Typography>
            {goalsInFocus.length ? (
              <Stack spacing={2}>
                {goalsInFocus.map((goal) => (
                  <Box
                    key={goal._id}
                    component={Link}
                    to={`/goals/${goal._id}`}
                    sx={{
                      textDecoration: "none",
                      color: "inherit",
                      borderRadius: 2,
                      p: 1.5,
                      border: "1px solid rgba(0, 0, 0, 0.08)",
                      transition: "0.2s",
                      "&:hover": {
                        borderColor: "primary.main",
                        backgroundColor: "rgba(25, 118, 210, 0.04)"
                      }
                    }}
                  >
                    <Typography fontWeight={600}>{goal.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {goal.openTasks} open task{goal.openTasks === 1 ? "" : "s"}
                      {goal.nextTask
                        ? ` · Next: ${goal.nextTask.title}`
                        : " · No upcoming tasks"}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No goals yet. Create one to start tracking progress.
              </Typography>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Quick Stats
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                {tasks.length} tasks · {goals.length} goals · {lists.length} lists
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {overdueTasks.length} overdue · {todayTasks.length} due today
              </Typography>
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default TaskBoard;
