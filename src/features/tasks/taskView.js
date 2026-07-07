import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography
} from "@mui/material";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DateTimePicker from "../../components/DateTimePicker";
import TaskCompletionBar from "./taskCompletionBar";
import GoalTreeContextPanel from "../goals/GoalTreeContextPanel";
import { fetchGoals } from "../goals/goalService";
import { fetchLists } from "../lists/listService";
import { fetchCategories } from "../categories/categoryService";
import {
  createTaskTimeEntry,
  deleteTask,
  deleteTaskTimeEntry,
  fetchTasks,
  fetchTaskTimeEntries,
  updateTaskTimeEntry,
  updateTask
} from "./taskService";
import {
  getTaskEstimateHoursError,
  getTaskTargetCompletionDateMinDateTime,
  getTaskTargetCompletionDateError,
  getTimeEntryDurationHours,
  getTimeEntryRangeError
} from "./taskValidation";
import {
  getGoogleCalendarDateRemovedToastText,
  getGoogleCalendarItemSyncState,
  getGoogleCalendarNoDateWarningText,
  wasTargetDateRemoved
} from "../integrations/googleCalendarSync";
import useGoogleCalendarStatus from "../integrations/useGoogleCalendarStatus";

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

const buildFormValues = (taskData) => ({
  title: taskData?.title || "",
  description: taskData?.description || "",
  category: getCategoryValue(taskData?.category),
  listId: taskData?.listId ? String(taskData.listId) : "",
  parentGoalId: taskData?.parentGoalId ? String(taskData.parentGoalId) : "",
  estimatedCompletionTime:
    taskData?.estimatedCompletionTime !== undefined
      ? String(taskData.estimatedCompletionTime)
      : "",
  targetCompletionDate: taskData?.targetCompletionDate
    ? dayjs(taskData.targetCompletionDate)
    : null,
  isComplete: Boolean(taskData?.isComplete)
});

const parseNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const buildDefaultTimeEntryValues = () => {
  const end = dayjs().second(0).millisecond(0);
  const start = end.subtract(1, "hour");

  return {
    startedAt: start,
    endedAt: end
  };
};

const buildEditTimeEntryValues = (entry) => ({
  startedAt: dayjs(entry.startedAt),
  endedAt: dayjs(entry.endedAt)
});

const formatDurationLabel = (durationMinutes) => {
  const totalMinutes = Math.round(durationMinutes || 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
};

const formatTimeEntryRangeLabel = (entry) => {
  const start = dayjs(entry.startedAt);
  const end = dayjs(entry.endedAt);

  return `${start.format("MMM D, YYYY h:mm A")} - ${end.format("h:mm A")}`;
};

const summaryTitleFieldSx = {
  width: "100%",
  "& .MuiOutlinedInput-root": {
    borderRadius: 2
  },
  "& .MuiOutlinedInput-input": {
    fontSize: (theme) => theme.typography.h4.fontSize,
    fontWeight: 700,
    lineHeight: (theme) => theme.typography.h4.lineHeight,
    py: 1
  }
};

const summaryDescriptionFieldSx = {
  width: "100%",
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    alignItems: "flex-start"
  },
  "& .MuiOutlinedInput-input": {
    fontSize: (theme) => theme.typography.body1.fontSize,
    lineHeight: (theme) => theme.typography.body1.lineHeight,
    color: (theme) => theme.palette.text.secondary
  }
};

const TaskView = ({ task }) => {
  const navigate = useNavigate();
  const [currentTask, setCurrentTask] = useState(task);
  const [parentGoals, setParentGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [lists, setLists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [statusUpdateError, setStatusUpdateError] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [formValues, setFormValues] = useState(buildFormValues(task));
  const [timeEntryValues, setTimeEntryValues] = useState(buildDefaultTimeEntryValues);
  const [timeEntrySaving, setTimeEntrySaving] = useState(false);
  const [timeEntryError, setTimeEntryError] = useState("");
  const [timeEntrySuccess, setTimeEntrySuccess] = useState("");
  const [timeEntries, setTimeEntries] = useState([]);
  const [timeEntriesLoading, setTimeEntriesLoading] = useState(false);
  const [timeEntriesError, setTimeEntriesError] = useState("");
  const [deletingTimeEntryId, setDeletingTimeEntryId] = useState("");
  const [editingTimeEntryId, setEditingTimeEntryId] = useState("");
  const [editingTimeEntryValues, setEditingTimeEntryValues] = useState(null);
  const [editingTimeEntryError, setEditingTimeEntryError] = useState("");
  const [editingTimeEntrySaving, setEditingTimeEntrySaving] = useState(false);
  const timeEntryRequestInFlightRef = useRef(false);
  const [dateRemovedToastOpen, setDateRemovedToastOpen] = useState(false);
  const { status: googleCalendarStatus, loading: googleCalendarStatusLoading } =
    useGoogleCalendarStatus();

  useEffect(() => {
    setCurrentTask(task);
    setFormValues(buildFormValues(task));
    setTimeEntryValues(buildDefaultTimeEntryValues());
    setTimeEntryError("");
    setTimeEntrySuccess("");
    setTimeEntries([]);
    setTimeEntriesError("");
    setDeletingTimeEntryId("");
    setEditingTimeEntryId("");
    setEditingTimeEntryValues(null);
    setEditingTimeEntryError("");
    setSaveError("");
    setStatusUpdateError("");
    setDeleteConfirmOpen(false);
    setDeletingTask(false);
    setDeleteError("");
    setEditOpen(false);
    setDateRemovedToastOpen(false);
  }, [task]);

  useEffect(() => {
    let isActive = true;

    if (!currentTask?._id) {
      setTimeEntries([]);
      setTimeEntriesLoading(false);
      setTimeEntriesError("");
      return () => {
        isActive = false;
      };
    }

    const loadTimeEntries = async () => {
      setTimeEntriesLoading(true);
      setTimeEntriesError("");
      try {
        const entries = await fetchTaskTimeEntries(currentTask._id);
        if (isActive) {
          setTimeEntries(entries);
        }
      } catch (err) {
        console.error(err);
        if (isActive) {
          setTimeEntriesError("Unable to load logged time right now.");
        }
      } finally {
        if (isActive) {
          setTimeEntriesLoading(false);
        }
      }
    };

    loadTimeEntries();
    return () => {
      isActive = false;
    };
  }, [currentTask]);

  useEffect(() => {
    let isActive = true;

    const loadMeta = async () => {
      setLoadingMeta(true);
      try {
        const [goalData, taskData, listData, categoryData] = await Promise.all([
          fetchGoals(),
          fetchTasks(),
          fetchLists(),
          fetchCategories()
        ]);
        if (isActive) {
          setParentGoals(goalData);
          setTasks(taskData);
          setLists(listData);
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
    if (!currentTask) return;

    const now = dayjs();
    const selectedParentGoal = formValues.parentGoalId
      ? parentGoals.find((pg) => String(pg._id) === String(formValues.parentGoalId))
      : null;
    const parentDeadline = selectedParentGoal?.targetCompletionDate
      ? dayjs(selectedParentGoal.targetCompletionDate)
      : null;

    const targetDateError = getTaskTargetCompletionDateError({
      targetCompletionDate: formValues.targetCompletionDate,
      now,
      parentDeadline,
      originalTargetCompletionDate: currentTask.targetCompletionDate
        ? dayjs(currentTask.targetCompletionDate)
        : null,
      allowUnchangedPastDate: true
    });

    if (targetDateError) {
      setSaveError(targetDateError);
      return;
    }

    const estimateError = getTaskEstimateHoursError(formValues.estimatedCompletionTime);
    if (estimateError) {
      setSaveError(estimateError);
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const nextTargetCompletionDate = formValues.targetCompletionDate
        ? formValues.targetCompletionDate.toDate()
        : null;
      const removedTargetDate = wasTargetDateRemoved({
        previousTargetCompletionDate: currentTask.targetCompletionDate,
        nextTargetCompletionDate
      });
      const updates = {
        title: formValues.title.trim(),
        description: formValues.description,
        listId: formValues.listId || null,
        parentGoalId: formValues.parentGoalId || null,
        estimatedCompletionTime: parseNumber(formValues.estimatedCompletionTime),
        isComplete: formValues.isComplete,
        targetCompletionDate: nextTargetCompletionDate
      };
      if (!formValues.parentGoalId) {
        updates.category = formValues.category;
      }
      const updatedTask = await updateTask(currentTask._id, updates);
      setCurrentTask(updatedTask);
      setFormValues(buildFormValues(updatedTask));
      setEditOpen(false);
      if (removedTargetDate && googleCalendarStatus?.connected) {
        setDateRemovedToastOpen(true);
      }
    } catch (err) {
      console.error(err);
      setSaveError("Unable to save changes right now.");
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = () => {
    setFormValues(buildFormValues(currentTask));
    setSaveError("");
    setStatusUpdateError("");
    setEditOpen(true);
  };

  const handleCancel = () => {
    setFormValues(buildFormValues(currentTask));
    setEditOpen(false);
    setSaveError("");
    setStatusUpdateError("");
  };

  const handleToggleComplete = async () => {
    if (!currentTask?._id || editOpen) return;

    setStatusUpdating(true);
    setStatusUpdateError("");
    try {
      const updatedTask = await updateTask(currentTask._id, {
        isComplete: !Boolean(currentTask.isComplete)
      });
      setCurrentTask(updatedTask);
      setFormValues(buildFormValues(updatedTask));
    } catch (err) {
      console.error(err);
      setStatusUpdateError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Unable to update completion status right now."
      );
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!currentTask?._id) return;

    setDeletingTask(true);
    setDeleteError("");
    try {
      await deleteTask(currentTask._id);
      navigate("/board");
    } catch (err) {
      console.error(err);
      setDeleteError(
        err.response?.data?.error || err.response?.data?.message || "Unable to delete task right now."
      );
    } finally {
      setDeletingTask(false);
    }
  };

  const loggedDurationHours = getTimeEntryDurationHours(timeEntryValues);

  const handleLogTime = async () => {
    if (!currentTask) return;
    if (timeEntryRequestInFlightRef.current) return;

    const timeEntryRangeError = getTimeEntryRangeError({
      ...timeEntryValues,
      now: dayjs()
    });
    if (timeEntryRangeError) {
      setTimeEntryError(timeEntryRangeError);
      return;
    }

    setTimeEntrySaving(true);
    setTimeEntryError("");
    setTimeEntrySuccess("");
    timeEntryRequestInFlightRef.current = true;
    try {
      const response = await createTaskTimeEntry(currentTask._id, {
        startedAt: timeEntryValues.startedAt.toDate(),
        endedAt: timeEntryValues.endedAt.toDate()
      });

      setCurrentTask(response.task);
      setTimeEntries((prev) => {
        const entryId = String(response.timeEntry._id);
        const existingIndex = prev.findIndex((entry) => String(entry._id) === entryId);
        const nextEntries = existingIndex >= 0
          ? prev.map((entry, index) => (index === existingIndex ? response.timeEntry : entry))
          : [response.timeEntry, ...prev];

        return nextEntries.sort(
          (left, right) => new Date(right.endedAt).getTime() - new Date(left.endedAt).getTime()
        );
      });
      setTimeEntryValues(buildDefaultTimeEntryValues());
      const loggedHours = Math.round((response.timeEntry.durationMinutes / 60) * 100) / 100;
      setTimeEntrySuccess(
        response.duplicate
          ? `That exact time range was already logged. Total time remains ${response.task.timeSpent} hours.`
          : `Logged ${loggedHours} hours. Total time is now ${response.task.timeSpent} hours.`
      );
    } catch (err) {
      console.error(err);
      setTimeEntryError(
        err.response?.data?.error || err.response?.data?.message || "Unable to log time right now."
      );
    } finally {
      timeEntryRequestInFlightRef.current = false;
      setTimeEntrySaving(false);
    }
  };

  const handleDeleteTimeEntry = async (entryId) => {
    if (!currentTask || !entryId) return;

    setDeletingTimeEntryId(entryId);
    setTimeEntryError("");
    setTimeEntrySuccess("");
    try {
      const response = await deleteTaskTimeEntry(currentTask._id, entryId);
      setCurrentTask(response.task);
      setTimeEntries((prev) => prev.filter((entry) => String(entry._id) !== String(entryId)));
      setTimeEntrySuccess(`Deleted time entry. Total time is now ${response.task.timeSpent} hours.`);
    } catch (err) {
      console.error(err);
      setTimeEntryError(
        err.response?.data?.error || err.response?.data?.message || "Unable to delete time entry right now."
      );
    } finally {
      setDeletingTimeEntryId("");
    }
  };

  const handleStartEditingTimeEntry = (entry) => {
    setEditingTimeEntryId(entry._id);
    setEditingTimeEntryValues(buildEditTimeEntryValues(entry));
    setEditingTimeEntryError("");
    setTimeEntryError("");
    setTimeEntrySuccess("");
  };

  const handleCancelEditingTimeEntry = () => {
    setEditingTimeEntryId("");
    setEditingTimeEntryValues(null);
    setEditingTimeEntryError("");
  };

  const handleSaveEditedTimeEntry = async (entryId) => {
    if (!currentTask || !editingTimeEntryValues) return;

    const timeEntryRangeError = getTimeEntryRangeError({
      ...editingTimeEntryValues,
      now: dayjs()
    });
    if (timeEntryRangeError) {
      setEditingTimeEntryError(timeEntryRangeError);
      return;
    }

    setEditingTimeEntrySaving(true);
    setEditingTimeEntryError("");
    setTimeEntryError("");
    setTimeEntrySuccess("");
    try {
      const response = await updateTaskTimeEntry(currentTask._id, entryId, {
        startedAt: editingTimeEntryValues.startedAt.toDate(),
        endedAt: editingTimeEntryValues.endedAt.toDate()
      });

      setCurrentTask(response.task);
      setTimeEntries((prev) =>
        prev
          .map((entry) => (String(entry._id) === String(entryId) ? response.timeEntry : entry))
          .sort((left, right) => new Date(right.endedAt).getTime() - new Date(left.endedAt).getTime())
      );
      const updatedHours = Math.round((response.timeEntry.durationMinutes / 60) * 100) / 100;
      setTimeEntrySuccess(
        `Updated time entry to ${updatedHours} hours. Total time is now ${response.task.timeSpent} hours.`
      );
      setEditingTimeEntryId("");
      setEditingTimeEntryValues(null);
    } catch (err) {
      console.error(err);
      setEditingTimeEntryError(
        err.response?.data?.error || err.response?.data?.message || "Unable to update time entry right now."
      );
    } finally {
      setEditingTimeEntrySaving(false);
    }
  };

  if (!currentTask) {
    return (
      <Container maxWidth="lg" sx={{ py: 6, textAlign: "left" }}>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const dueDate = parseDate(currentTask.targetCompletionDate);
  const dueLabel = dueDate ? dateFormatter.format(dueDate) : "No deadline";
  const categoryLabel = getCategoryLabel(currentTask.category);
  const parentGoal = currentTask.parentGoalId
    ? parentGoals.find((pg) => String(pg._id) === String(currentTask.parentGoalId))
    : null;
  const list = currentTask.listId
    ? lists.find((item) => String(item._id) === String(currentTask.listId))
    : null;
  const isCategoryLocked = Boolean(formValues.parentGoalId);
  const hasEstimate = parseNumber(currentTask.estimatedCompletionTime) > 0;
  const selectedParentGoalForEdit = formValues.parentGoalId
    ? parentGoals.find((pg) => String(pg._id) === String(formValues.parentGoalId))
    : null;
  const selectedListForEdit = formValues.listId
    ? lists.find((item) => String(item._id) === String(formValues.listId))
    : null;
  const parentDeadlineForEdit = selectedParentGoalForEdit?.targetCompletionDate
    ? dayjs(selectedParentGoalForEdit.targetCompletionDate)
    : null;
  const now = dayjs();
  const originalTargetCompletionDate = currentTask.targetCompletionDate
    ? dayjs(currentTask.targetCompletionDate)
    : null;
  const minimumTargetCompletionDate = getTaskTargetCompletionDateMinDateTime({
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
  const displayedIsComplete = editOpen ? formValues.isComplete : currentTask.isComplete;
  const displayedIsOverdue =
    displayedDueDate && displayedDueDate < startOfToday && !displayedIsComplete;
  const targetDateHelperText = parentDeadlineForEdit
    ? `Must be on or before ${parentDeadlineForEdit.format("MMM D, YYYY h:mm A")}.`
    : originalTargetCompletionDate?.isBefore(now)
      ? "Existing overdue dates can stay as-is, but any new date must be current or future."
      : !formValues.targetCompletionDate && googleCalendarStatus?.connected
        ? getGoogleCalendarNoDateWarningText()
        : "Choose a future target date.";
  const displayedListLabel = editOpen
    ? selectedListForEdit?.title || "None"
    : list ? list.title : "None";
  const googleCalendarSyncState = getGoogleCalendarItemSyncState({
    item: {
      ...currentTask,
      isComplete: displayedIsComplete,
      targetCompletionDate: displayedDueDate
    },
    status: googleCalendarStatus,
    loading: googleCalendarStatusLoading
  });

  return (
    <>
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
                <Box sx={{ minWidth: 0, flex: "1 1 360px" }}>
                  {editOpen ? (
                    <TextField
                      value={formValues.title}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Title"
                      variant="outlined"
                      inputProps={{ "aria-label": "Title" }}
                      fullWidth
                      sx={summaryTitleFieldSx}
                    />
                  ) : (
                    <Typography variant="h4" fontWeight={700} gutterBottom>
                      {currentTask.title}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {displayedCategoryLabel} - {displayedDueLabel}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}
                >
                  <Chip
                    label={displayedIsComplete ? "Complete" : "In progress"}
                    color={displayedIsComplete ? "success" : "warning"}
                    size="small"
                  />
                  {displayedIsOverdue && <Chip label="Overdue" color="error" size="small" />}
                  {!editOpen && (
                    <FormControlLabel
                      sx={{ m: 0 }}
                      control={
                        <Switch
                          size="small"
                          checked={displayedIsComplete}
                          onChange={handleToggleComplete}
                          disabled={saving || statusUpdating}
                        />
                      }
                      label={statusUpdating ? "Updating..." : "Complete"}
                    />
                  )}
                  <IconButton
                    onClick={editOpen ? handleCancel : handleStartEdit}
                    aria-label={editOpen ? "Cancel task summary editing" : "Edit task summary"}
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
                  value={formValues.description}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      description: event.target.value
                    }))
                  }
                  placeholder="Description"
                  variant="outlined"
                  inputProps={{ "aria-label": "Description" }}
                  multiline
                  minRows={3}
                  fullWidth
                  sx={summaryDescriptionFieldSx}
                />
              ) : (
                <Typography variant="body1" color="text.secondary">
                  {currentTask.description || "No description yet."}
                </Typography>
              )}
              {!editOpen && statusUpdateError && (
                <Typography color="error" role="alert">
                  {statusUpdateError}
                </Typography>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Log time
            </Typography>
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Record a concrete block of time for this task. This updates both the task progress
                cache and the visualization analytics.
              </Typography>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
              >
                <DateTimePicker
                  label="Start time"
                  value={timeEntryValues.startedAt}
                  onChange={(value) =>
                    setTimeEntryValues((prev) => ({ ...prev, startedAt: value }))
                  }
                  maxDateTime={dayjs()}
                  textFieldProps={{
                    fullWidth: true,
                    size: "small"
                  }}
                />
                <DateTimePicker
                  label="End time"
                  value={timeEntryValues.endedAt}
                  onChange={(value) =>
                    setTimeEntryValues((prev) => ({ ...prev, endedAt: value }))
                  }
                  minDateTime={timeEntryValues.startedAt || undefined}
                  maxDateTime={dayjs()}
                  textFieldProps={{
                    fullWidth: true,
                    size: "small"
                  }}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {loggedDurationHours !== null
                  ? `This entry will add ${loggedDurationHours} hours.`
                  : "Choose a valid time range to preview the logged duration."}
              </Typography>
              {timeEntryError && (
                <Typography color="error" role="alert">
                  {timeEntryError}
                </Typography>
              )}
              {timeEntrySuccess && (
                <Typography color="success.main" role="status" aria-live="polite">
                  {timeEntrySuccess}
                </Typography>
              )}
              <Box>
                <Button
                  variant="contained"
                  onClick={handleLogTime}
                  disabled={timeEntrySaving}
                >
                  {timeEntrySaving ? "Logging..." : "Log time"}
                </Button>
              </Box>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
            >
              <Typography variant="h6" fontWeight={700}>
                Task details
              </Typography>
              <IconButton
                onClick={editOpen ? handleCancel : handleStartEdit}
                aria-label={editOpen ? "Cancel task detail editing" : "Edit task details"}
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
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Time tracking
              </Typography>
              {hasEstimate ? (
                <TaskCompletionBar
                  timeSpent={currentTask.timeSpent}
                  estimatedCompletionTime={currentTask.estimatedCompletionTime}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No estimate set yet.
                </Typography>
              )}
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
                      list: "task-category-options"
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
                        helperText: targetDateHelperText
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
                      {parentGoals.map((option) => (
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
                  List
                </Typography>
                {editOpen ? (
                  <FormControl size="small" disabled={loadingMeta} fullWidth sx={{ mt: 0.5 }}>
                    <Select
                      value={formValues.listId}
                      inputProps={{ "aria-label": "List" }}
                      onChange={(event) =>
                        setFormValues((prev) => ({
                          ...prev,
                          listId: event.target.value
                        }))
                      }
                    >
                      <MenuItem value="">None</MenuItem>
                      {lists.map((option) => (
                        <MenuItem key={option._id} value={option._id}>
                          {option.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Typography>{displayedListLabel}</Typography>
                )}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Estimated hours
                </Typography>
                {editOpen ? (
                  <TextField
                    value={formValues.estimatedCompletionTime}
                    onChange={(event) =>
                      setFormValues((prev) => ({
                        ...prev,
                        estimatedCompletionTime: event.target.value
                      }))
                    }
                    type="number"
                    size="small"
                    inputProps={{
                      "aria-label": "Estimated completion time (hours)",
                      min: 0,
                      step: "0.25"
                    }}
                    helperText="Used to track progress and remaining time for this task."
                    fullWidth
                    sx={{ mt: 0.5 }}
                  />
                ) : (
                  <Typography>{currentTask.estimatedCompletionTime || 0}</Typography>
                )}
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total time spent
                </Typography>
                <Typography>{currentTask.timeSpent || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Google Calendar sync
                </Typography>
                <Typography>{googleCalendarSyncState.label}</Typography>
              </Box>
            </Box>
            {editOpen && (
              <>
                <datalist id="task-category-options">
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

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Recent time entries
            </Typography>
            {timeEntriesLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            ) : timeEntriesError ? (
              <Typography color="error">{timeEntriesError}</Typography>
            ) : timeEntries.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No logged time yet for this task.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {timeEntries.map((entry) => {
                  const timeEntryRangeLabel = formatTimeEntryRangeLabel(entry);
                  const isEditing = editingTimeEntryId === entry._id;

                  return (
                    <Box
                      key={entry._id}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        px: 2,
                        py: 1.5
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={2}
                        sx={{ alignItems: "baseline", justifyContent: "space-between" }}
                      >
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {formatDurationLabel(entry.durationMinutes)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {timeEntryRangeLabel}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <Typography variant="caption" color="text.secondary">
                            {Math.round((entry.durationMinutes / 60) * 100) / 100}h
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => handleStartEditingTimeEntry(entry)}
                            aria-label={`Edit time entry ${timeEntryRangeLabel}`}
                            disabled={deletingTimeEntryId === entry._id || editingTimeEntrySaving}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeleteTimeEntry(entry._id)}
                            aria-label={`Delete time entry ${timeEntryRangeLabel}`}
                            disabled={deletingTimeEntryId === entry._id || editingTimeEntrySaving}
                          >
                            {deletingTimeEntryId === entry._id ? "Deleting..." : "Delete"}
                          </Button>
                        </Stack>
                      </Stack>
                      {isEditing && editingTimeEntryValues && (
                        <Stack spacing={1.5} sx={{ mt: 2 }}>
                          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                            <DateTimePicker
                              label="Edit start time"
                              value={editingTimeEntryValues.startedAt}
                              onChange={(value) =>
                                setEditingTimeEntryValues((prev) => ({
                                  ...prev,
                                  startedAt: value
                                }))
                              }
                              maxDateTime={dayjs()}
                              textFieldProps={{
                                fullWidth: true,
                                size: "small"
                              }}
                            />
                            <DateTimePicker
                              label="Edit end time"
                              value={editingTimeEntryValues.endedAt}
                              onChange={(value) =>
                                setEditingTimeEntryValues((prev) => ({
                                  ...prev,
                                  endedAt: value
                                }))
                              }
                              minDateTime={editingTimeEntryValues.startedAt || undefined}
                              maxDateTime={dayjs()}
                              textFieldProps={{
                                fullWidth: true,
                                size: "small"
                              }}
                            />
                          </Stack>
                          {editingTimeEntryError && (
                            <Typography color="error" role="alert">
                              {editingTimeEntryError}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleSaveEditedTimeEntry(entry._id)}
                              aria-label={`Save time entry ${timeEntryRangeLabel}`}
                              disabled={editingTimeEntrySaving}
                            >
                              {editingTimeEntrySaving ? "Saving..." : "Save"}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={handleCancelEditingTimeEntry}
                              aria-label={`Cancel editing time entry ${timeEntryRangeLabel}`}
                              disabled={editingTimeEntrySaving}
                            >
                              Cancel
                            </Button>
                          </Stack>
                        </Stack>
                      )}
                    </Box>
                  );
                })}
              </Stack>
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
            <GoalTreeContextPanel currentTask={currentTask} goals={parentGoals} tasks={tasks} />
          )}

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Actions
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 2 }}>
              {parentGoal && (
                <Button variant="outlined" component={Link} to={`/goals/${parentGoal._id}`}>
                  Open parent goal
                </Button>
              )}
              <Button
                variant="outlined"
                color="error"
                onClick={() => {
                  setDeleteConfirmOpen((prev) => !prev);
                  setDeleteError("");
                }}
                disabled={deletingTask}
              >
                {deleteConfirmOpen ? "Cancel delete" : "Delete task"}
              </Button>
              {deleteConfirmOpen && (
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    This will delete the task and its logged time entries.
                  </Typography>
                  {deleteError && (
                    <Typography color="error" role="alert">
                      {deleteError}
                    </Typography>
                  )}
                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleDeleteTask}
                    disabled={deletingTask}
                  >
                    {deletingTask ? "Deleting..." : "Confirm delete"}
                  </Button>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Box>
      </Container>
      <Snackbar
        open={dateRemovedToastOpen}
        autoHideDuration={6000}
        onClose={() => setDateRemovedToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="info"
          onClose={() => setDateRemovedToastOpen(false)}
          sx={{ width: "100%" }}
        >
          {getGoogleCalendarDateRemovedToastText("Task")}
        </Alert>
      </Snackbar>
    </>
  );
};

export default TaskView;
