import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { fetchGoals } from "../features/goals/goalService";
import { fetchTasks } from "../features/tasks/taskService";

dayjs.extend(isBetween);

const UNASSIGNED_ID = "unassigned";
const baseColors = [
  "#1d4ed8",
  "#059669",
  "#ea580c",
  "#e11d48",
  "#0f766e",
  "#0ea5e9",
  "#84cc16",
  "#16a34a",
  "#f59e0b",
  "#dc2626"
];

const formatDayKey = (value) => dayjs(value).format("YYYY-MM-DD");

const CalendarView = () => {
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("week");
  const [activeDate, setActiveDate] = useState(dayjs());
  const [selectedGoalIds, setSelectedGoalIds] = useState(new Set());
  const [hasUserFiltered, setHasUserFiltered] = useState(false);
  const [showGoals, setShowGoals] = useState(true);
  const [showTasks, setShowTasks] = useState(true);

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
          setError("Unable to load calendar data right now.");
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

  const today = useMemo(() => dayjs(), []);

  const viewStart = useMemo(() => {
    if (viewMode === "month") {
      return activeDate.startOf("month").startOf("week");
    }
    return activeDate.startOf("week");
  }, [activeDate, viewMode]);

  const viewEnd = useMemo(() => {
    if (viewMode === "month") {
      return activeDate.endOf("month").endOf("week");
    }
    return activeDate.endOf("week");
  }, [activeDate, viewMode]);

  const rangeLabel = useMemo(() => {
    if (viewMode === "month") {
      return activeDate.format("MMMM YYYY");
    }
    const startLabel = viewStart.format("MMM D");
    const endLabel = viewEnd.format("MMM D, YYYY");
    return `${startLabel} - ${endLabel}`;
  }, [activeDate, viewEnd, viewMode, viewStart]);

  const goalsById = useMemo(() => {
    const map = new Map();
    goals.forEach((goal) => map.set(String(goal._id), goal));
    return map;
  }, [goals]);

  const topLevelByGoalId = useMemo(() => {
    const map = new Map();

    const resolveTopLevel = (goalId, trail) => {
      if (!goalId) return null;
      const id = String(goalId);
      if (map.has(id)) {
        return map.get(id);
      }
      if (trail.has(id)) {
        map.set(id, id);
        return id;
      }
      const goal = goalsById.get(id);
      if (!goal) {
        map.set(id, id);
        return id;
      }
      if (!goal.parentGoalId) {
        map.set(id, id);
        return id;
      }
      trail.add(id);
      const parentId = String(goal.parentGoalId);
      const rootId = resolveTopLevel(parentId, trail);
      map.set(id, rootId || id);
      return map.get(id);
    };

    goalsById.forEach((_goal, id) => {
      resolveTopLevel(id, new Set());
    });

    return map;
  }, [goalsById]);

  const getTopLevelId = (goalId) => {
    if (!goalId) return null;
    const id = String(goalId);
    return topLevelByGoalId.get(id) || id;
  };

  const topLevelIds = useMemo(() => {
    const ids = new Set();
    goalsById.forEach((_goal, id) => {
      ids.add(getTopLevelId(id) || id);
    });
    return Array.from(ids);
  }, [goalsById, topLevelByGoalId]);

  const goalColorMap = useMemo(() => {
    const sortedGoals = topLevelIds
      .map((id) => ({
        id,
        title: goalsById.get(id)?.title || "Unknown goal"
      }))
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    const map = new Map();
    sortedGoals.forEach((goal, index) => {
      map.set(goal.id, baseColors[index % baseColors.length]);
    });
    map.set(UNASSIGNED_ID, "#64748b");
    return map;
  }, [goalsById, topLevelIds]);

  const goalsInRange = useMemo(
    () =>
      goals.filter((goal) => {
        if (!goal.targetCompletionDate) return false;
        const goalDate = dayjs(goal.targetCompletionDate);
        return goalDate.isBetween(viewStart, viewEnd, null, "[]");
      }),
    [goals, viewEnd, viewStart]
  );

  const tasksInRange = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.targetCompletionDate) return false;
        const taskDate = dayjs(task.targetCompletionDate);
        return taskDate.isBetween(viewStart, viewEnd, null, "[]");
      }),
    [tasks, viewEnd, viewStart]
  );

  const goalItemsInRange = useMemo(
    () =>
      goalsInRange.map((goal) => ({
        type: "goal",
        id: String(goal._id),
        title: goal.title,
        topLevelId: getTopLevelId(goal._id),
        isTopLevel: !goal.parentGoalId,
        date: goal.targetCompletionDate
      })),
    [goalsInRange, topLevelByGoalId]
  );

  const taskItemsInRange = useMemo(
    () =>
      tasksInRange.map((task) => ({
        type: "task",
        id: String(task._id),
        title: task.title,
        topLevelId: task.parentGoalId
          ? getTopLevelId(task.parentGoalId)
          : UNASSIGNED_ID,
        date: task.targetCompletionDate
      })),
    [tasksInRange, topLevelByGoalId]
  );

  const itemsForDisplay = useMemo(() => {
    const items = [];
    if (showGoals) {
      items.push(...goalItemsInRange);
    }
    if (showTasks) {
      items.push(...taskItemsInRange);
    }
    return items;
  }, [goalItemsInRange, showGoals, showTasks, taskItemsInRange]);

  const availableGoalIds = useMemo(() => {
    const ids = new Set();
    itemsForDisplay.forEach((item) => {
      ids.add(item.topLevelId || UNASSIGNED_ID);
    });
    return Array.from(ids);
  }, [itemsForDisplay]);

  const availableGoals = useMemo(() => {
    const items = availableGoalIds
      .map((id) => {
        if (id === UNASSIGNED_ID) {
          return { id, title: "Unassigned tasks", isPseudo: true };
        }
        const goal = goalsById.get(id);
        return { id, title: goal?.title || "Unknown goal" };
      })
      .sort((a, b) => {
        if (a.isPseudo) return 1;
        if (b.isPseudo) return -1;
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      });
    return items;
  }, [availableGoalIds, goalsById]);

  useEffect(() => {
    setSelectedGoalIds((prev) => {
      if (availableGoalIds.length === 0) {
        return new Set();
      }
      if (!hasUserFiltered) {
        return new Set(availableGoalIds);
      }
      const next = new Set();
      availableGoalIds.forEach((id) => {
        if (prev.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [availableGoalIds.join("|"), hasUserFiltered]);

  const itemsByDayKey = useMemo(() => {
    const map = new Map();

    const addItem = (dateValue, item) => {
      const key = formatDayKey(dateValue);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    };

    itemsForDisplay.forEach((item) => {
      addItem(item.date, item);
    });

    map.forEach((items) => {
      items.sort((a, b) => {
        if (a.type === b.type) {
          return (a.title || "").localeCompare(b.title || "", undefined, {
            sensitivity: "base"
          });
        }
        return a.type === "goal" ? -1 : 1;
      });
    });

    return map;
  }, [itemsForDisplay]);

  const handleToggleGoal = (goalId) => {
    setHasUserFiltered(true);
    setSelectedGoalIds((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setHasUserFiltered(false);
    setSelectedGoalIds(new Set(availableGoalIds));
  };

  const handleClearAll = () => {
    setHasUserFiltered(true);
    setSelectedGoalIds(new Set());
  };

  const handleShift = (direction) => {
    setActiveDate((prev) =>
      viewMode === "month" ? prev.add(direction, "month") : prev.add(direction, "week")
    );
  };

  const handleViewChange = (_event, nextView) => {
    if (nextView) {
      setViewMode(nextView);
    }
  };

  const renderCalendarItem = (item) => {
    const color = goalColorMap.get(item.topLevelId) || "#64748b";
    const base = alpha(color, 0.12);
    const accent = alpha(color, 0.28);
    const isGoal = item.type === "goal";
    const isTopLevelGoal = Boolean(item.isTopLevel);

    return (
      <Box
        key={`${item.type}-${item.id}`}
        component={Link}
        to={isGoal ? `/goals/${item.id}` : `/tasks/${item.id}`}
        title={item.title}
        sx={{
          display: "block",
          px: 1.2,
          py: 0.6,
          borderRadius: isGoal ? 999 : 2,
          border: `${isTopLevelGoal ? 2 : 1}px ${isGoal ? "solid" : "dashed"} ${alpha(
            color,
            isTopLevelGoal ? 0.9 : 0.4
          )}`,
          textDecoration: "none",
          color: "text.primary",
          fontSize: "0.75rem",
          fontWeight: isTopLevelGoal ? 700 : isGoal ? 600 : 500,
          background: `linear-gradient(135deg, ${accent}, ${base})`,
          boxShadow: isTopLevelGoal
            ? `inset 0 0 0 1px ${alpha(color, 0.22)}`
            : "none",
          "&:hover": {
            background: `linear-gradient(135deg, ${alpha(color, 0.32)}, ${alpha(
              color,
              0.18
            )})`
          }
        }}
      >
        {isTopLevelGoal ? (
          <Stack spacing={0.1}>
            <Typography
              component="span"
              sx={{
                fontSize: "0.58rem",
                fontWeight: 700,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                lineHeight: 1.1
              }}
            >
              Top-level
            </Typography>
            <Typography component="span" sx={{ fontSize: "0.75rem", lineHeight: 1.2 }}>
              {item.title}
            </Typography>
          </Stack>
        ) : (
          item.title
        )}
      </Box>
    );
  };

  const renderDayCell = (day) => {
    const dayKey = day.format("YYYY-MM-DD");
    const isToday = day.isSame(today, "day");
    const isCurrentMonth = day.month() === activeDate.month();
    const items = (itemsByDayKey.get(dayKey) || []).filter((item) =>
      selectedGoalIds.has(item.topLevelId)
    );

    return (
      <Box
        key={dayKey}
        sx={{
          minHeight: viewMode === "month" ? 140 : 200,
          border: "1px solid",
          borderColor: isToday ? "primary.main" : "divider",
          borderRadius: 2,
          p: 1.5,
          backgroundColor: isToday ? alpha("#1976d2", 0.08) : "background.paper",
          opacity: viewMode === "month" && !isCurrentMonth ? 0.55 : 1,
          display: "flex",
          flexDirection: "column",
          gap: 1
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          {viewMode === "week" ? (
            <Typography variant="subtitle2" fontWeight={600}>
              {day.format("ddd")}
            </Typography>
          ) : (
            <Box />
          )}
          <Typography variant="caption" color="text.secondary">
            {day.format("D")}
          </Typography>
        </Box>
        <Stack spacing={0.75} sx={{ flex: 1 }}>
          {items.length > 0 ? (
            items.map((item) => renderCalendarItem(item))
          ) : viewMode === "week" ? (
            <Typography variant="caption" color="text.secondary">
              No due items
            </Typography>
          ) : null}
        </Stack>
      </Box>
    );
  };

  const weekDays = useMemo(() => {
    if (viewMode === "week") {
      return Array.from({ length: 7 }, (_, index) => viewStart.add(index, "day"));
    }
    const days = [];
    let cursor = viewStart;
    while (cursor.isBefore(viewEnd, "day") || cursor.isSame(viewEnd, "day")) {
      days.push(cursor);
      cursor = cursor.add(1, "day");
    }
    return days;
  }, [viewEnd, viewMode, viewStart]);

  const dayOfWeekLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        viewStart.startOf("week").add(index, "day")
      ),
    [viewStart]
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4, textAlign: "left" }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Calendar
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track goals and tasks by deadline across week and month views.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
          >
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewChange}
              size="small"
            >
              <ToggleButton value="week">Week</ToggleButton>
              <ToggleButton value="month">Month</ToggleButton>
            </ToggleButtonGroup>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Button variant="outlined" size="small" onClick={() => handleShift(-1)}>
                Prev
              </Button>
              <Button variant="outlined" size="small" onClick={() => setActiveDate(dayjs())}>
                Today
              </Button>
              <Button variant="outlined" size="small" onClick={() => handleShift(1)}>
                Next
              </Button>
            </Stack>

            <Typography variant="subtitle1" fontWeight={600}>
              {rangeLabel}
            </Typography>
          </Stack>
        </Paper>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "280px 1fr" },
            gap: 3
          }}
        >
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  Top-level goals
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Toggle which goal trees and related tasks are visible.
                </Typography>
              </Box>

              <Stack spacing={1.5}>
                <Typography variant="subtitle2" color="text.secondary">
                  Display
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showGoals}
                        onChange={(event) => setShowGoals(event.target.checked)}
                        size="small"
                      />
                    }
                    label="Show goals"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={showTasks}
                        onChange={(event) => setShowTasks(event.target.checked)}
                        size="small"
                      />
                    }
                    label="Show tasks"
                  />
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1}>
                <Button size="small" variant="text" onClick={handleSelectAll}>
                  Select all
                </Button>
                <Button size="small" variant="text" onClick={handleClearAll}>
                  Clear
                </Button>
              </Stack>

              <Divider />

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : availableGoals.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No goals or tasks due in this range.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {availableGoals.map((goal) => {
                    const color = goalColorMap.get(goal.id) || "#64748b";
                    return (
                      <Box
                        key={goal.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            minWidth: 0
                          }}
                        >
                          <Checkbox
                            checked={selectedGoalIds.has(goal.id)}
                            onChange={() => handleToggleGoal(goal.id)}
                            size="small"
                          />
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              backgroundColor: color
                            }}
                          />
                          <Typography variant="body2" noWrap>
                            {goal.title}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: 1.5
                }}
              >
                {viewMode === "month" &&
                  dayOfWeekLabels.map((day) => (
                    <Box
                      key={`label-${day.format("ddd")}`}
                      sx={{ textAlign: "center", color: "text.secondary" }}
                    >
                      <Typography variant="caption" fontWeight={600}>
                        {day.format("ddd")}
                      </Typography>
                    </Box>
                  ))}
                {weekDays.map((day) => renderDayCell(day))}
              </Box>
            )}
          </Paper>
        </Box>
      </Stack>
    </Container>
  );
};

export default CalendarView;
