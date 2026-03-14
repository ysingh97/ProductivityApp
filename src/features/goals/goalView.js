import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import DateTimePicker from "../../components/DateTimePicker";
import { fetchGoals, updateGoal } from "./goalService";
import { fetchCategories } from "../categories/categoryService";

const getCategoryValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.title) return value.title;
  return "";
};

const getCategoryLabel = (value) => {
  const label = getCategoryValue(value);
  return label || "Uncategorized";
};

const buildFormValues = (goalData) => ({
  title: goalData?.title || "",
  description: goalData?.description || "",
  category: getCategoryValue(goalData?.category),
  parentGoalId: goalData?.parentGoalId ? String(goalData.parentGoalId) : "",
  targetCompletionDate: goalData?.targetCompletionDate
    ? dayjs(goalData.targetCompletionDate)
    : null,
  isComplete: Boolean(goalData?.isComplete)
});

const GoalView = ({ goal }) => {
  const [currentGoal, setCurrentGoal] = useState(goal);
  const [parentGoals, setParentGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [formValues, setFormValues] = useState(buildFormValues(goal));

  useEffect(() => {
    setCurrentGoal(goal);
    setFormValues(buildFormValues(goal));
    setSaveError("");
    setEditOpen(false);
  }, [goal]);

  useEffect(() => {
    let isActive = true;

    const loadMeta = async () => {
      setLoadingMeta(true);
      try {
        const [goalData, categoryData] = await Promise.all([
          fetchGoals(),
          fetchCategories()
        ]);
        if (isActive) {
          setParentGoals(goalData);
          setCategories(categoryData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isActive) {
          setLoadingMeta(false);
        }
      }
    };

    loadMeta();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!formValues.parentGoalId) return;
    const parent = parentGoals.find(
      (pg) => String(pg._id) === String(formValues.parentGoalId)
    );
    if (parent) {
      setFormValues((prev) => ({ ...prev, category: getCategoryValue(parent.category) }));
    }
  }, [formValues.parentGoalId, parentGoals]);

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

  const handleSave = async () => {
    if (!currentGoal) return;

    const now = dayjs();
    const selectedParentGoal = formValues.parentGoalId
      ? parentGoals.find((pg) => String(pg._id) === String(formValues.parentGoalId))
      : null;
    const parentDeadline = selectedParentGoal?.targetCompletionDate
      ? dayjs(selectedParentGoal.targetCompletionDate)
      : null;

    if (formValues.targetCompletionDate && formValues.targetCompletionDate.isBefore(now)) {
      setSaveError("Target completion date cannot be earlier than the current time.");
      return;
    }

    if (
      formValues.targetCompletionDate &&
      parentDeadline &&
      formValues.targetCompletionDate.isAfter(parentDeadline)
    ) {
      setSaveError("Sub-goals cannot have a target completion date later than the parent goal.");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const updates = {
        title: formValues.title.trim(),
        description: formValues.description,
        parentGoalId: formValues.parentGoalId || null,
        targetCompletionDate: formValues.targetCompletionDate
          ? formValues.targetCompletionDate.toDate()
          : null,
        isComplete: formValues.isComplete
      };
      if (!formValues.parentGoalId) {
        updates.category = formValues.category;
      }
      const updatedGoal = await updateGoal(currentGoal._id, updates);
      setCurrentGoal(updatedGoal);
      setFormValues(buildFormValues(updatedGoal));
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      setSaveError("Unable to save changes right now.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormValues(buildFormValues(currentGoal));
    setEditOpen(false);
    setSaveError("");
  };

  if (!currentGoal) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: "left" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const dueDate = parseDate(currentGoal.targetCompletionDate);
  const createdDate = parseDate(currentGoal.createdAt);
  const dueLabel = dueDate ? dateFormatter.format(dueDate) : "No deadline";
  const isOverdue = dueDate && dueDate < startOfToday && !currentGoal.isComplete;
  const categoryLabel = getCategoryLabel(currentGoal.category);
  const parentGoal = currentGoal.parentGoalId
    ? parentGoals.find((pg) => String(pg._id) === String(currentGoal.parentGoalId))
    : null;
  const isCategoryLocked = Boolean(formValues.parentGoalId);
  const parentGoalOptions = parentGoals.filter(
    (pg) => String(pg._id) !== String(currentGoal._id)
  );
  const selectedParentGoalForEdit = formValues.parentGoalId
    ? parentGoals.find((pg) => String(pg._id) === String(formValues.parentGoalId))
    : null;
  const parentDeadlineForEdit = selectedParentGoalForEdit?.targetCompletionDate
    ? dayjs(selectedParentGoalForEdit.targetCompletionDate)
    : null;

  return (
    <Container maxWidth="lg" sx={{ py: 4, textAlign: "left" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
          gap: 3
        }}
      >
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack spacing={2}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 2,
                  flexWrap: "wrap"
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h4" fontWeight={700} gutterBottom>
                    {currentGoal.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {categoryLabel} - {dueLabel}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Chip
                    label={currentGoal.isComplete ? "Complete" : "In progress"}
                    color={currentGoal.isComplete ? "success" : "warning"}
                    size="small"
                  />
                  {isOverdue && <Chip label="Overdue" color="error" size="small" />}
                </Stack>
              </Box>
              <Typography variant="body1" color="text.secondary">
                {currentGoal.description || "No description yet."}
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Goal details
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: 2
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Category
                </Typography>
                <Typography>{categoryLabel}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Target date
                </Typography>
                <Typography>{dueLabel}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Parent goal
                </Typography>
                <Typography>{parentGoal ? parentGoal.title : "None"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Subgoals
                </Typography>
                <Typography>{currentGoal.subGoals?.length || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Subtasks
                </Typography>
                <Typography>{currentGoal.subTasks?.length || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Created
                </Typography>
                <Typography>{createdDate ? dateFormatter.format(createdDate) : "Unknown"}</Typography>
              </Box>
            </Box>
          </Paper>
        </Stack>

        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Actions
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={() => setEditOpen((prev) => !prev)}
              >
                {editOpen ? "Close edit" : "Edit details"}
              </Button>
              <Button
                variant="outlined"
                component={Link}
                to={`/goals/${currentGoal._id}/tree`}
              >
                Open tree view
              </Button>
              <Button
                variant="outlined"
                component={Link}
                to="/goal/new"
                state={{ parentGoal: currentGoal, isParentGoalFixed: true }}
              >
                Create sub-goal
              </Button>
              <Button
                variant="outlined"
                component={Link}
                to={`/task/new?goalId=${currentGoal._id}`}
              >
                Create sub-task
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Edit goal
            </Typography>
            {!editOpen ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Turn on edit mode to update this goal.
              </Typography>
            ) : (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField
                  label="Title"
                  value={formValues.title}
                  onChange={(event) =>
                    setFormValues((prev) => ({ ...prev, title: event.target.value }))
                  }
                  size="small"
                  fullWidth
                />
                <TextField
                  label="Description"
                  value={formValues.description}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      description: event.target.value
                    }))
                  }
                  size="small"
                  multiline
                  minRows={3}
                  fullWidth
                />
                <TextField
                  label="Category"
                  value={formValues.category}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      category: event.target.value
                    }))
                  }
                  size="small"
                  disabled={isCategoryLocked}
                  inputProps={{ list: "goal-category-options" }}
                  helperText={
                    isCategoryLocked
                      ? "Category is inherited from the parent goal."
                      : "Select or type a category."
                  }
                  fullWidth
                />
                <datalist id="goal-category-options">
                  {categories.map((category) => (
                    <option key={category._id} value={category.title} />
                  ))}
                </datalist>
                <FormControl size="small" disabled={loadingMeta} fullWidth>
                  <InputLabel id="parent-goal-label">Parent goal</InputLabel>
                  <Select
                    labelId="parent-goal-label"
                    label="Parent goal"
                    value={formValues.parentGoalId}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        parentGoalId: event.target.value
                      }))
                    }
                  >
                    <MenuItem value="">None</MenuItem>
                    {parentGoalOptions.map((option) => (
                      <MenuItem key={option._id} value={option._id}>
                        {option.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <DateTimePicker
                  value={formValues.targetCompletionDate}
                  onChange={(value) =>
                    setFormValues((prev) => ({ ...prev, targetCompletionDate: value }))
                  }
                  minDateTime={dayjs()}
                  maxDateTime={parentDeadlineForEdit || undefined}
                  textFieldProps={{
                    fullWidth: true,
                    size: "small",
                    helperText: parentDeadlineForEdit
                      ? `Must be on or before ${parentDeadlineForEdit.format("MMM D, YYYY h:mm A")}.`
                      : "Choose a future target date."
                  }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formValues.isComplete}
                      onChange={(event) =>
                        setFormValues((prev) => ({
                          ...prev,
                          isComplete: event.target.checked
                        }))
                      }
                    />
                  }
                  label="Mark complete"
                />
                {saveError && <Typography color="error">{saveError}</Typography>}
                <Divider />
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
                  </Button>
                  <Button variant="outlined" onClick={handleCancel} disabled={saving}>
                    Cancel
                  </Button>
                </Stack>
              </Stack>
            )}
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
};

export default GoalView;
