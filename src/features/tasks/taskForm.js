import React, { useEffect, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import dayjs from "dayjs";
import { fetchCategories } from "../categories/categoryService";
import { fetchGoals } from "../goals/goalService";
import { fetchLists } from "../lists/listService";
import DateTimePicker from "../../components/DateTimePicker";

const getCategoryTitle = (value) => {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return value.title || "";
};

const TaskForm = ({ task, onSubmit, isEditing = false }) => {
  const [lists, setLists] = useState([]);
  const [parentGoals, setParentGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const now = dayjs();

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [category, setCategory] = useState(getCategoryTitle(task?.category));
  const [estimatedCompletionTime, setEstimatedCompletionTime] = useState(
    task?.estimatedCompletionTime || 0
  );
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    task?.targetCompletionDate ? dayjs(task.targetCompletionDate) : null
  );


  const [selectedList, setSelectedList] = useState(null);
  const [selectedParentGoal, setSelectedParentGoal] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadListsAndGoals = async () => {
      setLoading(true);
      setError(null);
      try {
        const [listResponse, goalResponse, categoryResponse] = await Promise.all([
          fetchLists(),
          fetchGoals(),
          fetchCategories()
        ]);
        setLists(listResponse);
        setParentGoals(goalResponse);
        setCategories(categoryResponse);
      } catch (err) {
        setError("Failed to load task form options.");
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadListsAndGoals();
  }, []);

  useEffect(() => {
    setTitle(task?.title || "");
    setDescription(task?.description || "");
    setCategory(getCategoryTitle(task?.category));
    setEstimatedCompletionTime(task?.estimatedCompletionTime || 0);
    setSelectedList(null);
    setSelectedParentGoal(null);
    setTargetCompletionDate(task?.targetCompletionDate ? dayjs(task.targetCompletionDate) : null);
  }, [task]);

  useEffect(() => {
    if (!loading) {
      const listOptions = lists.map((list) => ({
        value: list._id,
        label: list.title,
      }));
      const parentGoalOptions = parentGoals.map((pg) => ({
        value: pg._id,
        label: pg.title,
        categoryTitle: getCategoryTitle(pg.category),
        targetCompletionDate: pg.targetCompletionDate || null
      }));

      if (task?.listId) {
        const match = listOptions.find((option) => String(option.value) === String(task.listId));
        setSelectedList(match || null);
      }

      if (task?.parentGoalId) {
        const match = parentGoalOptions.find(
          (option) => String(option.value) === String(task.parentGoalId)
        );
        setSelectedParentGoal(match || null);
        setCategory(match?.categoryTitle || getCategoryTitle(task?.category));
      } else {
        setCategory(getCategoryTitle(task?.category));
      }
    }
  }, [loading, lists, parentGoals, task]);

  useEffect(() => {
    if (selectedParentGoal) {
      setCategory(selectedParentGoal.categoryTitle || "");
    }
  }, [selectedParentGoal]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    const parentDeadline = selectedParentGoal?.targetCompletionDate
      ? dayjs(selectedParentGoal.targetCompletionDate)
      : null;

    if (targetCompletionDate && targetCompletionDate.isBefore(now)) {
      setError("Target completion date cannot be earlier than the current time.");
      return;
    }

    if (targetCompletionDate && parentDeadline && targetCompletionDate.isAfter(parentDeadline)) {
      setError("Subtasks cannot have a target completion date later than the parent goal.");
      return;
    }

    const taskData = {
      title,
      description,
      listId: selectedList?.value,
      parentGoalId: selectedParentGoal?.value,
      estimatedCompletionTime,
      targetCompletionDate: targetCompletionDate ? targetCompletionDate.toDate() : null
    };
    if (!selectedParentGoal?.value) {
      taskData.category = category;
    }
    onSubmit(taskData);

    if (!isEditing) {
      setTitle("");
      setDescription("");
      setCategory("");
      setEstimatedCompletionTime(0);
      setSelectedList(null);
      setSelectedParentGoal(null);
      setTargetCompletionDate(null);
    }
  };

  const listOptions = lists.map((list) => ({
    value: list._id,
    label: list.title,
  }));
  const parentGoalOptions = parentGoals.map((pg) => ({
    value: pg._id,
    label: pg.title,
    categoryTitle: getCategoryTitle(pg.category),
    targetCompletionDate: pg.targetCompletionDate || null
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
            Task details
          </Typography>
          <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
            {isEditing ? "Refine task details" : "Capture a new task"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Keep the first pass concise. You can edit the task again from its dedicated view.
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
                        : "Type a category or reuse an existing one."
                    }
                  />
                )}
              />

              <Autocomplete
                options={listOptions}
                value={selectedList}
                onChange={(_event, nextValue) => setSelectedList(nextValue)}
                isOptionEqualToValue={(option, value) => option.value === value?.value}
                loading={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="List"
                    size="small"
                    helperText="Optional. Add this task to a list."
                  />
                )}
              />

              <Autocomplete
                options={parentGoalOptions}
                value={selectedParentGoal}
                onChange={(_event, nextValue) => setSelectedParentGoal(nextValue)}
                isOptionEqualToValue={(option, value) => option.value === value?.value}
                loading={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Parent goal"
                    size="small"
                    helperText={
                      selectedParentGoal
                        ? "This task inherits its category from the goal."
                        : "Optional. Link the task into a goal tree."
                    }
                  />
                )}
              />

              <TextField
                label="Estimated hours"
                type="number"
                value={estimatedCompletionTime}
                onChange={(event) => setEstimatedCompletionTime(event.target.value)}
                size="small"
                fullWidth
                inputProps={{ min: 0, step: 0.25 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">hrs</InputAdornment>
                }}
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
                    Loading form options
                  </Box>
                ) : selectedParentGoal ? (
                  parentDeadline
                    ? `This task follows the goal category and must finish by ${parentDeadline.format("MMM D, YYYY h:mm A")}.`
                    : "This task will follow the selected goal's category."
                ) : (
                  "Standalone tasks can keep their own category."
                )}
              </Typography>
              <Button type="submit" variant="contained" size="large" disabled={loading}>
                {isEditing ? "Update task" : "Create task"}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
};

export default TaskForm;
