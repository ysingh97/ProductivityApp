import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { fetchGoals } from "../features/goals/goalService";

const sortOptions = [
  { value: "deadline", label: "Deadline" },
  { value: "title", label: "Alphabetical" },
  { value: "category", label: "Category" },
  { value: "created", label: "Created date" }
];

const secondarySortOptions = [
  { value: "none", label: "None" },
  { value: "deadline", label: "Deadline" },
  { value: "title", label: "Alphabetical" },
  { value: "created", label: "Created date" }
];

const GoalsOverview = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("deadline");
  const [thenBy, setThenBy] = useState("none");
  const [sortOrder, setSortOrder] = useState("asc");

  useEffect(() => {
    let isActive = true;

    const loadGoals = async () => {
      setError("");
      setLoading(true);
      try {
        const goalData = await fetchGoals();
        if (isActive) {
          setGoals(goalData);
        }
      } catch (err) {
        console.error(err);
        if (isActive) {
          setError("Unable to load goals right now.");
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadGoals();
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

  const startOfToday = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

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

  const topLevelGoals = useMemo(
    () => goals.filter((goal) => !goal.parentGoalId),
    [goals]
  );

  const directSubgoalCount = useMemo(() => {
    const counts = new Map();
    goals.forEach((goal) => {
      if (!goal.parentGoalId) return;
      const parentId = String(goal.parentGoalId);
      counts.set(parentId, (counts.get(parentId) || 0) + 1);
    });
    return counts;
  }, [goals]);

  const normalizedGoals = useMemo(
    () =>
      topLevelGoals.map((goal) => ({
        ...goal,
        dueDate: parseDate(goal.targetCompletionDate),
        createdDate: parseDate(goal.createdAt),
        categoryLabel: getCategoryLabel(goal)
      })),
    [topLevelGoals]
  );

  const categoryOptions = useMemo(() => {
    const options = new Set();
    normalizedGoals.forEach((goal) => {
      options.add(goal.categoryLabel);
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [normalizedGoals]);

  const filteredGoals = useMemo(() => {
    const term = query.trim().toLowerCase();
    return normalizedGoals.filter((goal) => {
      if (statusFilter === "active" && goal.isComplete) return false;
      if (statusFilter === "completed" && !goal.isComplete) return false;
      if (categoryFilter.length && !categoryFilter.includes(goal.categoryLabel)) return false;
      if (term) {
        const text = `${goal.title || ""} ${goal.description || ""}`.toLowerCase();
        if (!text.includes(term)) return false;
      }
      return true;
    });
  }, [normalizedGoals, query, statusFilter, categoryFilter]);

  const compareDates = (a, b) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a - b;
  };

  const compareBy = (a, b, key) => {
    switch (key) {
      case "deadline":
        return compareDates(a.dueDate, b.dueDate);
      case "title":
        return (a.title || "").localeCompare(b.title || "", undefined, {
          sensitivity: "base"
        });
      case "category":
        return (a.categoryLabel || "").localeCompare(b.categoryLabel || "", undefined, {
          sensitivity: "base"
        });
      case "created":
        return compareDates(a.createdDate, b.createdDate);
      default:
        return 0;
    }
  };

  const sortedGoals = useMemo(() => {
    const goalsCopy = [...filteredGoals];
    goalsCopy.sort((a, b) => {
      const primary = compareBy(a, b, sortBy);
      if (primary !== 0) {
        return sortOrder === "asc" ? primary : -primary;
      }
      if (thenBy && thenBy !== "none") {
        return compareBy(a, b, thenBy);
      }
      return 0;
    });
    return goalsCopy;
  }, [filteredGoals, sortBy, thenBy, sortOrder]);

  const groupedGoals = useMemo(() => {
    if (sortBy !== "category") return null;
    const groups = new Map();
    sortedGoals.forEach((goal) => {
      const key = goal.categoryLabel || "Uncategorized";
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(goal);
    });
    return groups;
  }, [sortedGoals, sortBy]);

  const handleStatusChange = (event, nextValue) => {
    if (nextValue) {
      setStatusFilter(nextValue);
    }
  };

  const handleCategoryChange = (event) => {
    const value = event.target.value;
    setCategoryFilter(typeof value === "string" ? value.split(",") : value);
  };

  const handleSortByChange = (event) => {
    const value = event.target.value;
    setSortBy(value);
    if (thenBy === value) {
      setThenBy("none");
    }
  };

  const handleReset = () => {
    setQuery("");
    setCategoryFilter([]);
    setStatusFilter("all");
    setSortBy("deadline");
    setThenBy("none");
    setSortOrder("asc");
  };

  const renderGoalCard = (goal) => {
    const dueLabel = goal.dueDate ? dateFormatter.format(goal.dueDate) : "No deadline";
    const isOverdue = goal.dueDate && goal.dueDate < startOfToday && !goal.isComplete;
    const subgoalCount = directSubgoalCount.get(String(goal._id)) || 0;

    return (
      <Accordion
        key={goal._id}
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          "&:before": { display: "none" }
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            px: 2,
            "& .MuiAccordionSummary-content": {
              alignItems: "center",
              gap: 2,
              my: 1
            }
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              gap: 2
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={700} noWrap>
                {goal.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {goal.categoryLabel} • {dueLabel}
              </Typography>
            </Box>
            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: "wrap", justifyContent: "flex-end" }}
            >
              <Chip
                label={goal.isComplete ? "Complete" : "In progress"}
                color={goal.isComplete ? "success" : "warning"}
                size="small"
              />
              {isOverdue && <Chip label="Overdue" color="error" size="small" />}
            </Stack>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2, pb: 2 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {goal.description ? goal.description : "No description yet."}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: 1.5
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Category
                </Typography>
                <Typography>{goal.categoryLabel}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Target date
                </Typography>
                <Typography>{dueLabel}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Direct subgoals
                </Typography>
                <Typography>{subgoalCount}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Estimated hours
                </Typography>
                <Typography>{goal.estimatedHours ?? 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Time spent
                </Typography>
                <Typography>{goal.timeSpent ?? 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Time left
                </Typography>
                <Typography>{goal.timeLeft ?? 0}</Typography>
              </Box>
            </Box>

            <Divider />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <Button variant="contained" component={Link} to={`/goals/${goal._id}`}>
                Open goal
              </Button>
              <Button variant="outlined" component={Link} to={`/goals/${goal._id}/tree`}>
                Tree view
              </Button>
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4, textAlign: "left" }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            In-depth goals view
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Review every top-level goal and dive deeper when you are ready.
          </Typography>
        </Box>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack spacing={2}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                gap: 2
              }}
            >
              <TextField
                label="Search goals"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                size="small"
                placeholder="Title or description"
              />
              <FormControl size="small">
                <InputLabel id="category-filter-label">Category</InputLabel>
                <Select
                  labelId="category-filter-label"
                  multiple
                  value={categoryFilter}
                  onChange={handleCategoryChange}
                  label="Category"
                  displayEmpty
                  renderValue={(selected) =>
                    selected.length ? selected.join(", ") : "All categories"
                  }
                >
                  {categoryOptions.length ? (
                    categoryOptions.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No categories yet</MenuItem>
                  )}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel id="sort-by-label">Sort by</InputLabel>
                <Select
                  labelId="sort-by-label"
                  value={sortBy}
                  label="Sort by"
                  onChange={handleSortByChange}
                >
                  {sortOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel id="then-by-label">Then by</InputLabel>
                <Select
                  labelId="then-by-label"
                  value={thenBy}
                  label="Then by"
                  onChange={(event) => setThenBy(event.target.value)}
                >
                  {secondarySortOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small">
                <InputLabel id="sort-order-label">Sort order</InputLabel>
                <Select
                  labelId="sort-order-label"
                  value={sortOrder}
                  label="Sort order"
                  onChange={(event) => setSortOrder(event.target.value)}
                >
                  <MenuItem value="asc">Ascending</MenuItem>
                  <MenuItem value="desc">Descending</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}
            >
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={handleStatusChange}
                size="small"
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="active">Active</ToggleButton>
                <ToggleButton value="completed">Completed</ToggleButton>
              </ToggleButtonGroup>

              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                <Chip
                  label={`Showing ${sortedGoals.length} of ${topLevelGoals.length}`}
                  size="small"
                  color="default"
                  variant="outlined"
                />
                <Button variant="text" onClick={handleReset}>
                  Reset filters
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        ) : sortedGoals.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="body1" fontWeight={600}>
              No top-level goals match these filters.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try clearing a filter or create a new goal.
            </Typography>
          </Paper>
        ) : sortBy === "category" && groupedGoals ? (
          <Stack spacing={3}>
            {[...groupedGoals.entries()].map(([category, goalsInGroup]) => (
              <Box key={category}>
                <Typography variant="overline" color="text.secondary">
                  {category}
                </Typography>
                <Stack spacing={2} sx={{ mt: 1.5 }}>
                  {goalsInGroup.map((goal) => renderGoalCard(goal))}
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          <Stack spacing={2}>{sortedGoals.map((goal) => renderGoalCard(goal))}</Stack>
        )}
      </Stack>
    </Container>
  );
};

export default GoalsOverview;
