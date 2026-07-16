import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { generatePlan, savePlan } from "./aiService";

const withId = (item, prefix, index) => ({ id: `${prefix}-${index}`, include: true, ...item });

const toEditableForm = (plan) => {
  const goal = plan?.goal || {};
  return {
    title: goal.title || "",
    description: goal.description || "",
    category: goal.category || "",
    estimatedHours: goal.estimatedHours || 0,
    suggestedTargetDate: goal.suggestedTargetDate || null,
    tasks: (goal.tasks || []).map((task, index) => withId(task, "task", index)),
    subGoals: (goal.subGoals || []).map((subGoal, index) => ({
      ...withId(subGoal, "subgoal", index),
      tasks: (subGoal.tasks || []).map((task, subIndex) =>
        withId(task, `subgoal-${index}-task`, subIndex)
      )
    }))
  };
};

const toPlanPayload = (form) => ({
  goal: {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    estimatedHours: Number(form.estimatedHours) || 0,
    suggestedTargetDate: form.suggestedTargetDate,
    tasks: form.tasks
      .filter((task) => task.include && task.title.trim())
      .map((task) => ({
        title: task.title.trim(),
        description: task.description || "",
        estimatedCompletionTime: Number(task.estimatedCompletionTime) || 0,
        suggestedTargetDate: task.suggestedTargetDate
      })),
    subGoals: form.subGoals
      .filter((subGoal) => subGoal.include && subGoal.title.trim())
      .map((subGoal) => ({
        title: subGoal.title.trim(),
        description: subGoal.description || "",
        estimatedHours: Number(subGoal.estimatedHours) || 0,
        suggestedTargetDate: subGoal.suggestedTargetDate,
        tasks: subGoal.tasks
          .filter((task) => task.include && task.title.trim())
          .map((task) => ({
            title: task.title.trim(),
            description: task.description || "",
            estimatedCompletionTime: Number(task.estimatedCompletionTime) || 0,
            suggestedTargetDate: task.suggestedTargetDate
          }))
      }))
  }
});

const AiPlannerDialog = ({ open, onClose, onSaved }) => {
  const [prompt, setPrompt] = useState("");
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const resetAndClose = () => {
    if (loading || saving) return;
    setPrompt("");
    setForm(null);
    setError("");
    onClose();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setError("");
    setLoading(true);
    try {
      const response = await generatePlan(prompt.trim());
      setForm(toEditableForm(response.plan));
    } catch (err) {
      const message =
        err?.response?.data?.message || "Unable to generate a plan right now. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      await savePlan(toPlanPayload(form));
      resetForms();
      onSaved?.();
    } catch (err) {
      const message =
        err?.response?.data?.message || "Unable to save this plan. Please try again.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const resetForms = () => {
    setPrompt("");
    setForm(null);
    setError("");
  };

  const updateGoalField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const updateTask = (taskId, field, value) =>
    setForm((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) => (task.id === taskId ? { ...task, [field]: value } : task))
    }));

  const updateSubGoal = (subGoalId, field, value) =>
    setForm((prev) => ({
      ...prev,
      subGoals: prev.subGoals.map((subGoal) =>
        subGoal.id === subGoalId ? { ...subGoal, [field]: value } : subGoal
      )
    }));

  const updateSubGoalTask = (subGoalId, taskId, field, value) =>
    setForm((prev) => ({
      ...prev,
      subGoals: prev.subGoals.map((subGoal) =>
        subGoal.id === subGoalId
          ? {
              ...subGoal,
              tasks: subGoal.tasks.map((task) =>
                task.id === taskId ? { ...task, [field]: value } : task
              )
            }
          : subGoal
      )
    }));

  const renderTaskRow = (task, onToggle, onTitleChange) => (
    <Stack key={task.id} direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Checkbox
        size="small"
        checked={task.include}
        onChange={(event) => onToggle(event.target.checked)}
      />
      <TextField
        size="small"
        fullWidth
        value={task.title}
        onChange={(event) => onTitleChange(event.target.value)}
        disabled={!task.include}
      />
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
        {Number(task.estimatedCompletionTime) || 0}h
      </Typography>
    </Stack>
  );

  return (
    <Dialog open={open} onClose={resetAndClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AutoAwesomeOutlinedIcon color="primary" />
        Plan with AI
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Describe your goal"
            placeholder="e.g. I want to run a half marathon in 3 months"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            multiline
            minRows={2}
            fullWidth
            disabled={loading || saving}
          />

          {!form && (
            <Typography variant="body2" color="text.secondary">
              The assistant will suggest a goal broken into sub-goals and tasks. Nothing is saved
              until you review and confirm.
            </Typography>
          )}

          {form && (
            <>
              <Divider>Proposed plan (review &amp; edit)</Divider>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack spacing={2}>
                  <TextField
                    label="Goal"
                    value={form.title}
                    onChange={updateGoalField("title")}
                    fullWidth
                  />
                  <TextField
                    label="Description"
                    value={form.description}
                    onChange={updateGoalField("description")}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Category"
                      value={form.category}
                      onChange={updateGoalField("category")}
                      fullWidth
                    />
                    <TextField
                      label="Estimated hours"
                      type="number"
                      value={form.estimatedHours}
                      onChange={updateGoalField("estimatedHours")}
                      sx={{ maxWidth: { sm: 180 } }}
                    />
                  </Stack>

                  {form.tasks.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Tasks
                      </Typography>
                      <Stack spacing={1}>
                        {form.tasks.map((task) =>
                          renderTaskRow(
                            task,
                            (checked) => updateTask(task.id, "include", checked),
                            (value) => updateTask(task.id, "title", value)
                          )
                        )}
                      </Stack>
                    </Box>
                  )}

                  {form.subGoals.map((subGoal) => (
                    <Paper key={subGoal.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                      <Stack spacing={1}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                size="small"
                                checked={subGoal.include}
                                onChange={(event) =>
                                  updateSubGoal(subGoal.id, "include", event.target.checked)
                                }
                              />
                            }
                            label=""
                            sx={{ mr: 0 }}
                          />
                          <TextField
                            size="small"
                            fullWidth
                            label="Sub-goal"
                            value={subGoal.title}
                            onChange={(event) =>
                              updateSubGoal(subGoal.id, "title", event.target.value)
                            }
                            disabled={!subGoal.include}
                          />
                          <TextField
                            size="small"
                            type="number"
                            label="Hrs"
                            value={subGoal.estimatedHours}
                            onChange={(event) =>
                              updateSubGoal(subGoal.id, "estimatedHours", event.target.value)
                            }
                            disabled={!subGoal.include}
                            sx={{ width: 90 }}
                          />
                        </Stack>
                        {subGoal.tasks.length > 0 && (
                          <Stack spacing={1} sx={{ pl: 4 }}>
                            {subGoal.tasks.map((task) =>
                              renderTaskRow(
                                task,
                                (checked) =>
                                  updateSubGoalTask(subGoal.id, task.id, "include", checked),
                                (value) => updateSubGoalTask(subGoal.id, task.id, "title", value)
                              )
                            )}
                          </Stack>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={resetAndClose} disabled={loading || saving}>
          Cancel
        </Button>
        {!form ? (
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeOutlinedIcon />}
          >
            {loading ? "Generating…" : "Generate plan"}
          </Button>
        ) : (
          <>
            <Button onClick={handleGenerate} disabled={loading || saving}>
              Regenerate
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {saving ? "Saving…" : "Add to my goals"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AiPlannerDialog;
