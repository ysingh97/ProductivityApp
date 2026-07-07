import React, { useMemo, useState, useEffect } from "react";
import { fetchTasks } from "../features/tasks/taskService";
import { fetchLists } from "../features/lists/listService";
import { fetchGoals } from "../features/goals/goalService";
import { Link } from "react-router-dom";
import DashboardCalendar from "../components/DashboardCalendar";

import {
  Alert,
  Collapse,
  Container,
  Box,
  Typography,
  Divider,
  Paper,
  Chip,
  Stack,
  CircularProgress,
  IconButton
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const TASK_SECTION_SCROLL_THRESHOLD = 5;
const GOAL_SECTION_SCROLL_THRESHOLD = 4;

const getScrollableSectionSx = (itemCount, threshold) =>
  itemCount > threshold
    ? {
        maxHeight: { xs: 320, md: 380 },
        overflowY: "auto",
        overscrollBehavior: "contain",
        pr: 0.5,
        mr: -0.5
      }
    : {};

const TaskBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGoalsInFocusInfo, setShowGoalsInFocusInfo] = useState(false);

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

  const startOfNextMonth = useMemo(() => {
    const date = new Date(startOfToday);
    date.setDate(date.getDate() + 30);
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

  const normalizedTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        dueDate: parseDate(task.targetCompletionDate)
      })),
    [tasks]
  );

  const normalizedGoals = useMemo(
    () =>
      goals.map((goal) => ({
        ...goal,
        dueDate: parseDate(goal.targetCompletionDate)
      })),
    [goals]
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
    const focus = normalizedGoals
      .filter((goal) => !goal.parentGoalId)
      .map((goal) => {
        const goalTasks = normalizedTasks.filter(
          (task) => task.parentGoalId === goal._id && !task.isComplete
        );
        const nextTask = goalTasks
          .filter((task) => task.dueDate)
          .sort((a, b) => a.dueDate - b.dueDate)[0];
        return {
          ...goal,
          nextTask,
          openTasks: goalTasks.length,
          sortDate: nextTask?.dueDate || goal.dueDate
        };
      })
      .sort((a, b) => {
        if (a.sortDate && b.sortDate) return a.sortDate - b.sortDate;
        if (a.sortDate) return -1;
        if (b.sortDate) return 1;
        return a.title.localeCompare(b.title);
      });
    return focus.slice(0, 4);
  }, [normalizedGoals, normalizedTasks]);

  const upcomingGoals = useMemo(
    () =>
      normalizedGoals
        .filter(
          (goal) =>
            goal.dueDate &&
            goal.dueDate >= startOfToday &&
            goal.dueDate < startOfNextMonth
        )
        .sort((a, b) => a.dueDate - b.dueDate)
        .slice(0, 6),
    [normalizedGoals, startOfToday, startOfNextMonth]
  );

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

  const getGoalDueLabel = (goal) => {
    if (!goal.dueDate) {
      return "No target date";
    }
    if (!goal.isComplete && goal.dueDate < startOfToday) {
      return `Overdue · ${dateFormatter.format(goal.dueDate)}`;
    }
    if (goal.dueDate < startOfTomorrow) {
      return "Target: Today";
    }
    return `Target: ${dateFormatter.format(goal.dueDate)}`;
  };

  const isGoalOverdue = (goal) =>
    Boolean(goal.dueDate) && !goal.isComplete && goal.dueDate < startOfToday;

  const isTaskOverdue = (task) =>
    Boolean(task.dueDate) && !task.isComplete && task.dueDate < startOfToday;

  const renderTaskList = (items, emptyText) => {
    if (!items.length) {
      return (
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      );
    }

    return (
      <Box sx={getScrollableSectionSx(items.length, TASK_SECTION_SCROLL_THRESHOLD)}>
        <Stack spacing={1.5}>
          {items.map((task) => {
            const meta = getTaskMeta(task);
            const chip = getDueChip(task);
            const overdue = isTaskOverdue(task);
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
                  borderColor: overdue ? "error.main" : "divider",
                  backgroundColor: overdue ? "rgba(211, 47, 47, 0.08)" : "transparent",
                  boxShadow: overdue ? "inset 4px 0 0 rgba(211, 47, 47, 0.8)" : "none",
                  transition: "0.2s",
                  "&:hover": {
                    borderColor: overdue ? "error.dark" : "primary.main",
                    backgroundColor: overdue
                      ? "rgba(211, 47, 47, 0.12)"
                      : "rgba(25, 118, 210, 0.04)"
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
      </Box>
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
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 1,
          mb: 3
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track deadlines, stay on top of active work, and jump into the next goal that needs attention.
        </Typography>
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
          {overdueTasks.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Overdue ({overdueTasks.length})
              </Typography>
              {renderTaskList(overdueTasks, "All caught up.")}
            </Paper>
          )}

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
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", justifyContent: "space-between", mb: 1.5 }}
            >
              <Typography variant="h6" fontWeight={700}>
                Goals in Focus
              </Typography>
              <IconButton
                size="small"
                aria-label={
                  showGoalsInFocusInfo
                    ? "Hide Goals in Focus explanation"
                    : "Show Goals in Focus explanation"
                }
                onClick={() => setShowGoalsInFocusInfo((prev) => !prev)}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Collapse in={showGoalsInFocusInfo} unmountOnExit>
              <Alert severity="info" sx={{ mb: 2 }}>
                Shows up to four top-level goals ranked by the earliest due incomplete direct
                child task, then the goal&apos;s own target date. Work nested only under
                subgoals is not included here.
              </Alert>
            </Collapse>
            {goalsInFocus.length ? (
              <Box sx={getScrollableSectionSx(goalsInFocus.length, GOAL_SECTION_SCROLL_THRESHOLD)}>
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
                      border: "1px solid",
                      borderColor: isGoalOverdue(goal) ? "error.main" : "rgba(0, 0, 0, 0.08)",
                      backgroundColor: isGoalOverdue(goal)
                        ? "rgba(211, 47, 47, 0.08)"
                        : "transparent",
                      boxShadow: isGoalOverdue(goal)
                        ? "inset 4px 0 0 rgba(211, 47, 47, 0.8)"
                        : "none",
                      transition: "0.2s",
                      "&:hover": {
                        borderColor: isGoalOverdue(goal) ? "error.dark" : "primary.main",
                        backgroundColor: isGoalOverdue(goal)
                          ? "rgba(211, 47, 47, 0.12)"
                          : "rgba(25, 118, 210, 0.04)"
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
                    <Typography
                      variant="caption"
                      color={isGoalOverdue(goal) ? "error.main" : "text.secondary"}
                      fontWeight={isGoalOverdue(goal) ? 600 : 400}
                    >
                      {getGoalDueLabel(goal)}
                    </Typography>
                  </Box>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No goals yet. Create one to start tracking progress.
              </Typography>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Upcoming Goal Deadlines (30 Days)
            </Typography>
            {upcomingGoals.length ? (
              <Box sx={getScrollableSectionSx(upcomingGoals.length, GOAL_SECTION_SCROLL_THRESHOLD)}>
                <Stack spacing={1.5}>
                  {upcomingGoals.map((goal) => (
                  <Box
                    key={goal._id}
                    component={Link}
                    to={`/goals/${goal._id}`}
                    sx={{
                      textDecoration: "none",
                      color: "inherit",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
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
                    <Typography fontWeight={600} noWrap>
                      {goal.title}
                    </Typography>
                    <Chip
                      label={dateFormatter.format(goal.dueDate)}
                      size="small"
                      color="default"
                    />
                  </Box>
                  ))}
                </Stack>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No goals due in the next 30 days.
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

      <DashboardCalendar goals={goals} tasks={tasks} />
    </Container>
  );
};

export default TaskBoard;
