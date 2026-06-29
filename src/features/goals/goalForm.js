import React, { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import dayjs from "dayjs";
import { useLocation } from "react-router-dom";
import { fetchCategories } from "../categories/categoryService";
import DateTimePicker from "../../components/DateTimePicker";
import { fetchGoals } from "./goalService";
import {
  getGoalEstimateHoursError,
  getGoalTargetCompletionDateError,
  parseGoalEstimateHours
} from "./goalValidation";

const getCategoryTitle = (value) => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return value.title || "";
};

const GoalForm = ({ onSubmit, goal, isEditing: isEditingProp, submitting = false }) => {
  const [parentGoals, setParentGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const isEditing = Boolean(isEditingProp || goal);
  const now = dayjs();

  const location = useLocation();
  const parentGoal = !isEditing ? location.state?.parentGoal || null : null;
  const isParentGoalFixed = !isEditing ? location.state?.isParentGoalFixed || false : false;
  
  const [title, setTitle] = useState(goal?.title || "");
  const [description, setDescription] = useState(goal?.description || "");
  const [category, setCategory] = useState(getCategoryTitle(goal?.category));
  const [estimatedHours, setEstimatedHours] = useState(
    goal?.estimatedHours !== undefined ? String(goal.estimatedHours) : "0"
  );
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    goal?.targetCompletionDate ? dayjs(goal.targetCompletionDate) : null
  );
  // const [selectedList, setSelectedList] = useState(null);
  const [selectedParentGoal, setSelectedParentGoal] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const parsedEstimatedHours = parseGoalEstimateHours(estimatedHours);

    const parentDeadline = selectedParentGoal?.targetCompletionDate
      ? dayjs(selectedParentGoal.targetCompletionDate)
      : null;

    const targetDateError = getGoalTargetCompletionDateError({
      targetCompletionDate,
      now,
      parentDeadline
    });
    if (targetDateError) {
      setError(targetDateError);
      return;
    }

    const estimateError = getGoalEstimateHoursError(estimatedHours);
    if (estimateError) {
      setError(estimateError);
      return;
    }

    const goalData = {
        title,
        description,
        estimatedHours: parsedEstimatedHours,
        parentGoalId: selectedParentGoal?.value,
        targetCompletionDate: targetCompletionDate ? targetCompletionDate.toDate() : null
        // listId: selectedList.value
    };
    if (!selectedParentGoal?.value) {
      goalData.category = category;
    }
    try {
      const savedGoal = await onSubmit(goalData);
      if (savedGoal?._id) {
        setParentGoals((prevGoals) => {
          const goalExists = prevGoals.some(
            (parentGoalOption) => String(parentGoalOption._id) === String(savedGoal._id)
          );

          if (goalExists) {
            return prevGoals.map((parentGoalOption) =>
              String(parentGoalOption._id) === String(savedGoal._id)
                ? savedGoal
                : parentGoalOption
            );
          }

          return [...prevGoals, savedGoal];
        });
      }

      if (!isEditing) {
        setTitle("");
        setDescription("");
        setCategory("");
        setEstimatedHours("0");
        setTargetCompletionDate(null);
      }
    } catch {
      // The page wrapper displays API errors; the form keeps local validation errors only.
    }
  };

  useEffect(() => {
    if (!goal) {
      if (!isEditing) {
        setTitle("");
        setDescription("");
        setCategory("");
        setEstimatedHours("0");
        setTargetCompletionDate(null);
      }
      return;
    }

    setTitle(goal.title || "");
    setDescription(goal.description || "");
    setCategory(getCategoryTitle(goal.category));
    setEstimatedHours(goal.estimatedHours !== undefined ? String(goal.estimatedHours) : "0");
    setTargetCompletionDate(
      goal.targetCompletionDate ? dayjs(goal.targetCompletionDate) : null
    );
  }, [goal, isEditing]);

  useEffect(() => {
      const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
          const [goalResponse, categoryResponse] = await Promise.all([
            fetchGoals(),
            fetchCategories()
          ]);
          setParentGoals(goalResponse);
          setCategories(categoryResponse);
        } catch (err) {
          setError('Failed to load goals or categories');
          console.error(err.message);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }, []);

  useEffect(() => {
    if (loading) return;

    if (isEditing) {
      if (!goal?.parentGoalId) {
        setSelectedParentGoal(null);
        return;
      }
      const match = parentGoals.find(
        (pg) => String(pg._id) === String(goal.parentGoalId)
      );
      setSelectedParentGoal(
        match
          ? {
              value: match._id,
              label: match.title,
              categoryTitle: getCategoryTitle(match.category),
              targetCompletionDate: match.targetCompletionDate || null
            }
          : null
      );
      return;
    }

    // If goal page is entered from another goal, provide parent goal as default parent goal
    const defaultParentGoal = (parentGoal && isParentGoalFixed)
      ? {
          value: parentGoal._id,
          label: parentGoal.title,
          categoryTitle: getCategoryTitle(parentGoal.category),
          targetCompletionDate: parentGoal.targetCompletionDate || null
        }
      : null;
    setSelectedParentGoal(defaultParentGoal);
  }, [loading, isEditing, goal, parentGoals, parentGoal, isParentGoalFixed]);

  useEffect(() => {
    if (selectedParentGoal) {
      setCategory(selectedParentGoal.categoryTitle || "");
    }
  }, [selectedParentGoal]);

  const selectedParentGoalOptions = parentGoals
    .filter((pg) => !goal || String(pg._id) !== String(goal._id))
    .map(parentGoal => ({
      value: parentGoal._id,
      label: parentGoal.title,
      categoryTitle: getCategoryTitle(parentGoal.category),
      targetCompletionDate: parentGoal.targetCompletionDate || null
    }));
  const categoryOptions = categories.map((categoryOption) => categoryOption.title);
  const parentDeadline = selectedParentGoal?.targetCompletionDate
    ? dayjs(selectedParentGoal.targetCompletionDate)
    : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2.5, md: 3.5 },
        borderRadius: 4,
        position: "relative",
        overflow: "hidden",
        background: (theme) =>
          `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)}, ${theme.palette.background.paper})`,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: "0 0 auto 0",
          height: 4,
          background: (theme) =>
            `linear-gradient(90deg, ${theme.palette.primary.main}, ${alpha(
              theme.palette.primary.main,
              0.1
            )})`
        }
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Typography variant="overline" color="text.secondary" letterSpacing={1}>
            Goal details
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
            {isEditing ? "Refine goal details" : "Set the next goal"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Start with the essentials. You can expand the goal structure and timeline later.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.5}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                gap: 2
              }}
            >
              <TextField
                label="Title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                fullWidth
                size="small"
              />

              <Autocomplete
                freeSolo
                options={categoryOptions}
                value={category}
                inputValue={category}
                onInputChange={(_event, nextValue) => setCategory(nextValue)}
                onChange={(_event, nextValue) => setCategory(nextValue || "")}
                disabled={Boolean(selectedParentGoal)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Category"
                    size="small"
                    helperText={
                      selectedParentGoal
                        ? "Inherited from the selected parent goal."
                        : "Type a category or choose an existing one."
                    }
                  />
                )}
              />

              <TextField
                label="Estimated hours"
                value={estimatedHours}
                onChange={(event) => setEstimatedHours(event.target.value)}
                type="number"
                fullWidth
                size="small"
                inputProps={{ min: 0, step: "0.25" }}
                helperText="Used to track progress and remaining time for this goal."
              />

              <DateTimePicker
                value={targetCompletionDate}
                onChange={setTargetCompletionDate}
                minDateTime={now}
                maxDateTime={parentDeadline || undefined}
                textFieldProps={{
                  fullWidth: true,
                  size: "small",
                  helperText: parentDeadline
                    ? `Must be on or before ${parentDeadline.format("MMM D, YYYY h:mm A")}.`
                    : "Choose a future target date."
                }}
              />

              <Autocomplete
                options={selectedParentGoalOptions}
                value={selectedParentGoal}
                onChange={(_event, nextValue) => setSelectedParentGoal(nextValue)}
                isOptionEqualToValue={(option, value) => option.value === value?.value}
                loading={loading}
                disabled={isParentGoalFixed || loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Parent goal"
                    size="small"
                    helperText={
                      isParentGoalFixed
                        ? "Locked because you opened this from a parent goal."
                        : "Optional. Leave empty to create a top-level goal."
                    }
                  />
                )}
              />
            </Box>

            <TextField
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              multiline
              minRows={4}
              fullWidth
              size="small"
            />

            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                justifyContent: "space-between",
                flexDirection: { xs: "column", sm: "row" },
                gap: 1.5,
                pt: 0.5
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {loading ? (
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={12} />
                    Loading goal options
                  </Box>
                ) : selectedParentGoal ? (
                  parentDeadline
                    ? `Sub-goals inherit category and must finish by ${parentDeadline.format("MMM D, YYYY h:mm A")}.`
                    : "Sub-goals automatically inherit their parent category."
                ) : (
                  "No parent selected means this will be a top-level goal."
                )}
              </Typography>
              <Button type="submit" variant="contained" size="large" disabled={loading || submitting}>
                {submitting ? "Saving..." : isEditing ? "Update goal" : "Create goal"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default GoalForm;
