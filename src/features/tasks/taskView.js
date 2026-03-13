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
import TaskCompletionBar from "./taskCompletionBar";
import { fetchGoals } from "../goals/goalService";
import { fetchLists } from "../lists/listService";
import { fetchCategories } from "../categories/categoryService";
import { updateTask } from "./taskService";

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

const TaskView = ({ task }) => {
  const [currentTask, setCurrentTask] = useState(task);
  const [parentGoals, setParentGoals] = useState([]);
  const [lists, setLists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [formValues, setFormValues] = useState(buildFormValues(task));

  useEffect(() => {
    setCurrentTask(task);
    setFormValues(buildFormValues(task));
    setSaveError("");
    setEditOpen(false);
  }, [task]);

  useEffect(() => {
    let isActive = true;

    const loadMeta = async () => {
      setLoadingMeta(true);
      try {
        const [goalData, listData, categoryData] = await Promise.all([
          fetchGoals(),
          fetchLists(),
          fetchCategories()
        ]);
        if (isActive) {
          setParentGoals(goalData);
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
    setSaving(true);
    setSaveError("");
    try {
      const updates = {
        title: formValues.title.trim(),
        description: formValues.description,
        listId: formValues.listId || null,
        parentGoalId: formValues.parentGoalId || null,
        estimatedCompletionTime: parseNumber(formValues.estimatedCompletionTime),
        isComplete: formValues.isComplete
      };
      if (formValues.targetCompletionDate) {
        updates.targetCompletionDate = formValues.targetCompletionDate.toDate();
      }
      if (!formValues.parentGoalId) {
        updates.category = formValues.category;
      }
      const updatedTask = await updateTask(currentTask._id, updates);
      setCurrentTask(updatedTask);
      setFormValues(buildFormValues(updatedTask));
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      setSaveError("Unable to save changes right now.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormValues(buildFormValues(currentTask));
    setEditOpen(false);
    setSaveError("");
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
  const isOverdue = dueDate && dueDate < startOfToday && !currentTask.isComplete;
  const categoryLabel = getCategoryLabel(currentTask.category);
  const parentGoal = currentTask.parentGoalId
    ? parentGoals.find((pg) => String(pg._id) === String(currentTask.parentGoalId))
    : null;
  const list = currentTask.listId
    ? lists.find((item) => String(item._id) === String(currentTask.listId))
    : null;
  const isCategoryLocked = Boolean(formValues.parentGoalId);
  const hasEstimate = parseNumber(currentTask.estimatedCompletionTime) > 0;

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
                    {currentTask.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {categoryLabel} - {dueLabel}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  <Chip
                    label={currentTask.isComplete ? "Complete" : "In progress"}
                    color={currentTask.isComplete ? "success" : "warning"}
                    size="small"
                  />
                  {isOverdue && <Chip label="Overdue" color="error" size="small" />}
                </Stack>
              </Box>
              <Typography variant="body1" color="text.secondary">
                {currentTask.description || "No description yet."}
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Progress
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
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Task details
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
                  List
                </Typography>
                <Typography>{list ? list.title : "None"}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Estimated hours
                </Typography>
                <Typography>{currentTask.estimatedCompletionTime || 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Time spent
                </Typography>
                <Typography>{currentTask.timeSpent || 0}</Typography>
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
              {parentGoal && (
                <Button variant="outlined" component={Link} to={`/goals/${parentGoal._id}`}>
                  Open parent goal
                </Button>
              )}
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Edit task
            </Typography>
            {!editOpen ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Turn on edit mode to update this task.
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
                  inputProps={{ list: "task-category-options" }}
                  helperText={
                    isCategoryLocked
                      ? "Category is inherited from the parent goal."
                      : "Select or type a category."
                  }
                  fullWidth
                />
                <datalist id="task-category-options">
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
                    {parentGoals.map((option) => (
                      <MenuItem key={option._id} value={option._id}>
                        {option.title}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" disabled={loadingMeta} fullWidth>
                  <InputLabel id="list-label">List</InputLabel>
                  <Select
                    labelId="list-label"
                    label="List"
                    value={formValues.listId}
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
                <TextField
                  label="Estimated completion time (hours)"
                  type="number"
                  value={formValues.estimatedCompletionTime}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      estimatedCompletionTime: event.target.value
                    }))
                  }
                  size="small"
                  inputProps={{ min: 0, step: 0.25 }}
                  fullWidth
                />
                <DateTimePicker
                  value={formValues.targetCompletionDate}
                  onChange={(value) =>
                    setFormValues((prev) => ({ ...prev, targetCompletionDate: value }))
                  }
                  textFieldProps={{ fullWidth: true, size: "small" }}
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

export default TaskView;
