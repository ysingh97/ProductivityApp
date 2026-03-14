import React, { useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Container, Paper, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useParams, useSearchParams } from "react-router-dom";
import TaskForm from "./taskForm";
import { createTask, fetchTaskById, updateTask } from "./taskService";

const CreateTaskPage = () => {
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState(null);
    const { taskId } = useParams(); // task id if editing
    const [searchParams] = useSearchParams();
    const goalId = searchParams.get("goalId"); // optional parent goal for new task

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(false);

    const isEditing = Boolean(taskId);

    useEffect(() => {
        if (isEditing) {
          setLoading(true);
          const loadTask = async () => {
            try {
              const fetchedTask = await fetchTaskById(taskId);
              setTask(fetchedTask);
            } catch (err) {
              setError('Failed to load task');
              console.error(err.message);
            } finally { setLoading(false); }
          };
          loadTask();
        } else if (goalId) {
          // Creating new task with parent goal
          setTask({ parentGoalId: goalId });
        } else {
          // Creating new task without parent goal
          setTask(null);
        }
    }, [taskId, goalId, isEditing]);
    // const location = useLocation();
    // const task = location.state?.task || null;
    // console.log("CreateTaskPage - task: ", task);
    const handleTaskSubmit = async (taskData) => {
      setError(null);
      try {
        if (isEditing && task?._id) {
          const updatedTask = await updateTask(task._id, taskData);
          setTasks((prevTasks) =>
            prevTasks.map((t) => (t._id === updatedTask._id ? updatedTask : t))
          );
        } else {
          const newTask = await createTask(taskData);
          setTasks((prevTasks) => [...prevTasks, newTask]);
        }
      } catch (err) {
        setError(err.message);
      }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4, textAlign: "left" }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "320px minmax(0, 1fr)" },
              gap: 3,
              alignItems: "start"
            }}
          >
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 4,
                position: { lg: "sticky" },
                top: { lg: 96 },
                background: (theme) =>
                  `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(
                    theme.palette.background.paper,
                    0.98
                  )})`
              }}
            >
              <Stack spacing={2}>
                <Box>
                  <Typography variant="overline" color="text.secondary" letterSpacing={1}>
                    Task workspace
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                    {isEditing ? "Update task" : "Create task"}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Build the task in a focused form, then refine progress and details from the task view.
                </Typography>
              </Stack>
            </Paper>

            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              {loading ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 4,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Stack spacing={1.5} sx={{ alignItems: "center" }}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary">
                      Loading task details
                    </Typography>
                  </Stack>
                </Paper>
              ) : (
                <TaskForm task={task} onSubmit={handleTaskSubmit} isEditing={isEditing} />
              )}
            </Stack>
          </Box>
        </Container>
    );
};

export default CreateTaskPage;
