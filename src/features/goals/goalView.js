import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DateTimePicker from "../../components/DateTimePicker";
import { deleteGoal, fetchGoals, updateGoal } from "./goalService";
import { fetchCategories } from "../categories/categoryService";
import { fetchTasks } from "../tasks/taskService";
import {
  getGoalEstimateHoursError,
  getGoalTargetCompletionDateMinDateTime,
  getGoalTargetCompletionDateError,
  parseGoalEstimateHours
} from "./goalValidation";
import {
  filterEligibleParentGoals,
  getBlockedParentGoalIds,
  mergeGoalsById
} from "./goalHierarchy";
import GoalTreeContextPanel from "./GoalTreeContextPanel";

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
  estimatedHours:
    goalData?.estimatedHours !== undefined ? String(goalData.estimatedHours) : "0",
  parentGoalId: goalData?.parentGoalId ? String(goalData.parentGoalId) : "",
  targetCompletionDate: goalData?.targetCompletionDate
    ? dayjs(goalData.targetCompletionDate)
    : null,
  isComplete: Boolean(goalData?.isComplete)
});

const formatHours = (value) => {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const GoalView = ({ goal }) => {
  const navigate = useNavigate();
  const [currentGoal, setCurrentGoal] = useState(goal);
  const [parentGoals, setParentGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingGoal, setDeletingGoal] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [formValues, setFormValues] = useState(buildFormValues(goal));

  useEffect(() => {
    setCurrentGoal(goal);
    setFormValues(buildFormValues(goal));
    setSaveError("");
    setDeleteConfirmOpen(false);
    setDeletingGoal(false);
    setDeleteError("");
    setEditOpen(false);
  }, [goal]);

  useEffect(() => {
    let isActive = true;

    const loadMeta = async () => {
      setLoadingMeta(true);
      try {
        const [goalData, categoryData, taskData] = await Promise.all([
          fetchGoals(),
          fetchCategories(),
          fetchTasks()
        ]);
        if (isActive) {
          setParentGoals(goalData);
          setCategories(categoryData);
          setTasks(taskData);
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
  const now = dayjs();
  const allKnownGoals = useMemo(
    () => mergeGoalsById(parentGoals, currentGoal),
    [currentGoal, parentGoals]
  );
  const blockedParentGoalIds = useMemo(
    () => getBlockedParentGoalIds(allKnownGoals, currentGoal?._id),
    [allKnownGoals, currentGoal?._id]
  );
  const parentGoalOptions = useMemo(
    () => (currentGoal ? filterEligibleParentGoals(allKnownGoals, currentGoal._id) : []),
    [allKnownGoals, currentGoal]
  );

  const parseDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const handleSave = async () => {
    if (!currentGoal) return;

    if (formValues.parentGoalId && blockedParentGoalIds.has(String(formValues.parentGoalId))) {
      setSaveError("A goal cannot be moved under one of its descendants.");
      return;
    }

    const estimatedHours = parseGoalEstimateHours(formValues.estimatedHours);
    const selectedParentGoal = formValues.parentGoalId
      ? parentGoals.find((pg) => String(pg._id) === String(formValues.parentGoalId))
      : null;
    const parentDeadline = selectedParentGoal?.targetCompletionDate
      ? dayjs(selectedParentGoal.targetCompletionDate)
      : null;

    const targetDateError = getGoalTargetCompletionDateError({
      targetCompletionDate: formValues.targetCompletionDate,
      now,
      parentDeadline,
      originalTargetCompletionDate: currentGoal.targetCompletionDate
        ? dayjs(currentGoal.targetCompletionDate)
        : null,
      allowUnchangedPastDate: true
    });
    if (targetDateError) {
      setSaveError(targetDateError);
      return;
    }

    const estimateError = getGoalEstimateHoursError(formValues.estimatedHours);
    if (estimateError) {
      setSaveError(estimateError);
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const updates = {
        title: formValues.title.trim(),
        description: formValues.description,
        estimatedHours,
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
      setSaveError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to save changes right now."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = () => {
    const nextFormValues = buildFormValues(currentGoal);
    if (
      nextFormValues.parentGoalId &&
      blockedParentGoalIds.has(String(nextFormValues.parentGoalId))
    ) {
      nextFormValues.parentGoalId = "";
    }
    setFormValues(nextFormValues);
    setSaveError("");
    setEditOpen(true);
  };

  const handleCancel = () => {
    setFormValues(buildFormValues(currentGoal));
    setEditOpen(false);
    setSaveError("");
  };

  const handleDeleteGoal = async () => {
    if (!currentGoal?._id) return;

    setDeletingGoal(true);
    setDeleteError("");
    try {
      await deleteGoal(currentGoal._id);
      navigate("/goals/overview");
    } catch (err) {
      console.error(err);
      setDeleteError(
        err.response?.data?.error || err.response?.data?.message || "Unable to delete goal right now."
      );
    } finally {
      setDeletingGoal(false);
    }
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
  const categoryLabel = getCategoryLabel(currentGoal.category);
  const parentGoal = currentGoal.parentGoalId
    ? allKnownGoals.find((pg) => String(pg._id) === String(currentGoal.parentGoalId))
    : null;
  const isCategoryLocked = Boolean(formValues.parentGoalId);
  const selectedParentGoalForEdit = formValues.parentGoalId
    ? allKnownGoals.find((pg) => String(pg._id) === String(formValues.parentGoalId))
    : null;
  const parentDeadlineForEdit = selectedParentGoalForEdit?.targetCompletionDate
    ? dayjs(selectedParentGoalForEdit.targetCompletionDate)
    : null;
  const originalTargetCompletionDate = currentGoal.targetCompletionDate
    ? dayjs(currentGoal.targetCompletionDate)
    : null;
  const minimumTargetCompletionDate = getGoalTargetCompletionDateMinDateTime({
    now,
    originalTargetCompletionDate,
    allowUnchangedPastDate: true
  });
  const displayedDueDate = editOpen
    ? formValues.targetCompletionDate?.toDate() || null
    : dueDate;
  const displayedDueLabel = displayedDueDate
    ? dateFormatter.format(displayedDueDate)
    : "No deadline";
  const displayedCategoryLabel = editOpen
    ? getCategoryLabel(
        formValues.parentGoalId ? selectedParentGoalForEdit?.category : formValues.category
      )
    : categoryLabel;
  const displayedIsComplete = editOpen ? formValues.isComplete : currentGoal.isComplete;
  const displayedIsOverdue =
    displayedDueDate && displayedDueDate < startOfToday && !displayedIsComplete;
  const estimatedHours = Number(currentGoal.estimatedHours) || 0;
  const timeSpent = Number(currentGoal.timeSpent) || 0;
  const timeLeft = Number(currentGoal.timeLeft) || 0;
  const progressValue =
    estimatedHours > 0 ? Math.min((timeSpent / estimatedHours) * 100, 100) : 0;

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
                  {editOpen ? (
                    <TextField
                      label="Title"
                      value={formValues.title}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, title: event.target.value }))
                      }
                      size="small"
                      fullWidth
                    />
                  ) : (
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                      {currentGoal.title}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {displayedCategoryLabel} - {displayedDueLabel}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                  <Chip
                    label={displayedIsComplete ? "Complete" : "In progress"}
                    color={displayedIsComplete ? "success" : "warning"}
                    size="small"
                  />
                  {displayedIsOverdue && <Chip label="Overdue" color="error" size="small" />}
                  <IconButton
                    onClick={editOpen ? handleCancel : handleStartEdit}
                    aria-label={editOpen ? "Cancel goal summary editing" : "Edit goal summary"}
                    size="small"
                  >
                    {editOpen ? (
                      <CloseOutlinedIcon fontSize="small" />
                    ) : (
                      <EditOutlinedIcon fontSize="small" />
                    )}
                  </IconButton>
                </Stack>
              </Box>
              {editOpen ? (
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
              ) : (
                <Typography variant="body1" color="text.secondary">
                  {currentGoal.description || "No description yet."}
                </Typography>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
            >
              <Typography variant="h6" fontWeight={700}>
                Goal details
              </Typography>
              <IconButton
                onClick={editOpen ? handleCancel : handleStartEdit}
                aria-label={editOpen ? "Cancel goal detail editing" : "Edit goal details"}
                size="small"
              >
                {editOpen ? (
                  <CloseOutlinedIcon fontSize="small" />
                ) : (
                  <EditOutlinedIcon fontSize="small" />
                )}
              </IconButton>
            </Stack>
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary">
                Goal progress
              </Typography>
              {estimatedHours > 0 ? (
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    {formatHours(timeSpent)} / {formatHours(estimatedHours)} hrs
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={progressValue}
                    sx={{ height: 8, borderRadius: 999 }}
                  />
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Add an estimate to track remaining time for this goal.
                </Typography>
              )}
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Time tracking
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
                    Estimated hours
                  </Typography>
                  {editOpen ? (
                    <TextField
                      value={formValues.estimatedHours}
                      onChange={(event) =>
                        setFormValues((prev) => ({
                          ...prev,
                          estimatedHours: event.target.value
                        }))
                      }
                      type="number"
                      size="small"
                      inputProps={{
                        "aria-label": "Estimated hours",
                        min: 0,
                        step: "0.25"
                      }}
                      helperText="Used to track time spent and remaining time."
                      fullWidth
                      sx={{ mt: 0.5 }}
                    />
                  ) : (
                    <Typography sx={{ mt: 0.5 }}>{formatHours(estimatedHours)}</Typography>
                  )}
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Time spent
                  </Typography>
                  <Typography>{formatHours(timeSpent)}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Time left
                  </Typography>
                  <Typography>{formatHours(timeLeft)}</Typography>
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
                gap: 2
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Category
                </Typography>
                {editOpen ? (
                  <TextField
                    value={formValues.category}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        category: event.target.value
                      }))
                    }
                    size="small"
                    disabled={isCategoryLocked}
                    inputProps={{
                      "aria-label": "Category",
                      list: "goal-category-options"
                    }}
                    helperText={
                      isCategoryLocked
                        ? "Category is inherited from the parent goal."
                        : "Select or type a category."
                    }
                    fullWidth
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography>{categoryLabel}</Typography>
                )}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Target date
                </Typography>
                {editOpen ? (
                  <Box sx={{ mt: 0.5 }}>
                    <DateTimePicker
                      label=""
                      value={formValues.targetCompletionDate}
                      onChange={(value) =>
                        setFormValues((prev) => ({ ...prev, targetCompletionDate: value }))
                      }
                      minDateTime={minimumTargetCompletionDate}
                      maxDateTime={parentDeadlineForEdit || undefined}
                      textFieldProps={{
                        fullWidth: true,
                        size: "small",
                        inputProps: {
                          "aria-label": "Target Completion Date"
                        },
                        helperText: parentDeadlineForEdit
                          ? `Must be on or before ${parentDeadlineForEdit.format("MMM D, YYYY h:mm A")}.`
                          : originalTargetCompletionDate?.isBefore(now)
                            ? "Existing overdue dates can stay as-is, but any new date must be current or future."
                            : "Choose a future target date."
                      }}
                    />
                  </Box>
                ) : (
                  <Typography>{dueLabel}</Typography>
                )}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Parent goal
                </Typography>
                {editOpen ? (
                  <FormControl size="small" disabled={loadingMeta} fullWidth sx={{ mt: 0.5 }}>
                    <Select
                      value={formValues.parentGoalId}
                      inputProps={{ "aria-label": "Parent goal" }}
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
                ) : (
                  <Typography>{parentGoal ? parentGoal.title : "None"}</Typography>
                )}
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
            {editOpen && (
              <>
                <datalist id="goal-category-options">
                  {categories.map((category) => (
                    <option key={category._id} value={category.title} />
                  ))}
                </datalist>
                <Box sx={{ mt: 3 }}>
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
                  {saveError && (
                    <Typography color="error" role="alert" sx={{ mt: 1 }}>
                      {saveError}
                    </Typography>
                  )}
                  <Divider sx={{ my: 2 }} />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Save changes"}
                    </Button>
                    <Button variant="outlined" onClick={handleCancel} disabled={saving}>
                      Cancel
                    </Button>
                  </Stack>
                </Box>
              </>
            )}
          </Paper>
        </Stack>

        <Stack spacing={3}>
          {loadingMeta ? (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack spacing={1.5} sx={{ alignItems: "center" }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Loading goal context
                </Typography>
              </Stack>
            </Paper>
          ) : (
            <GoalTreeContextPanel currentGoal={currentGoal} goals={parentGoals} tasks={tasks} />
          )}

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Actions
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
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
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setDeleteConfirmOpen((prev) => !prev);
                  setDeleteError("");
                }}
                disabled={deletingGoal}
              >
                {deleteConfirmOpen ? "Cancel delete" : "Delete goal"}
              </Button>
              {deleteConfirmOpen && (
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    This deletes this goal. Existing child goals are detached by the current backend behavior.
                  </Typography>
                  {deleteError && (
                    <Typography color="error" role="alert">
                      {deleteError}
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleDeleteGoal}
                    disabled={deletingGoal}
                  >
                    {deletingGoal ? "Deleting..." : "Confirm delete"}
                  </Button>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Box>
    </Container>
  );
};

export default GoalView;
