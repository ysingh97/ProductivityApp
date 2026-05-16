import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import { fetchLists } from "./listService";
import ListView from "./listView";
import { deleteTask, fetchTasksByListId } from "../tasks/taskService";

const formatHours = (value) => {
  const hours = Number(value) || 0;
  return hours.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const ListPage = () => {
  const [tasks, setTasks] = useState([]);
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingTaskId, setDeletingTaskId] = useState("");
  const { listId } = useParams();

  useEffect(() => {
    const loadListDetails = async () => {
      setLoading(true);
      setError("");

      try {
        const [listResponse, taskResponse] = await Promise.all([
          fetchLists(),
          fetchTasksByListId(listId)
        ]);

        setList(listResponse.find((item) => String(item._id) === String(listId)) || null);
        setTasks(taskResponse);
      } catch (err) {
        setError("Failed to load list details.");
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadListDetails();
  }, [listId]);

  const handleTaskDelete = async (taskId) => {
    setDeletingTaskId(taskId);
    setError("");

    try {
      await deleteTask(taskId);
      setTasks((prevTasks) => prevTasks.filter((task) => task._id !== taskId));
    } catch (err) {
      setError("Failed to delete task.");
      console.error(err.message);
    } finally {
      setDeletingTaskId("");
    }
  };

  const totalTimeSpent = useMemo(
    () => tasks.reduce((sum, task) => sum + (Number(task.timeSpent) || 0), 0),
    [tasks]
  );
  const totalEstimatedTime = useMemo(
    () => tasks.reduce((sum, task) => sum + (Number(task.estimatedCompletionTime) || 0), 0),
    [tasks]
  );
  const completedTasks = useMemo(
    () => tasks.filter((task) => Boolean(task.isComplete)).length,
    [tasks]
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4, textAlign: "left" }}>
      <Stack spacing={3}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 4 },
            borderRadius: 4,
            overflow: "hidden",
            position: "relative",
            background: (theme) =>
              `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.14)}, ${alpha(
                theme.palette.background.paper,
                0.98
              )} 52%, ${alpha(theme.palette.primary.main, 0.1)})`
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) auto" },
              gap: 2,
              alignItems: "center"
            }}
          >
            <Stack spacing={1}>
              <Typography variant="overline" color="text.secondary" letterSpacing={1}>
                List
              </Typography>
              <Typography variant="h3">{list?.title || "List details"}</Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680 }}>
                {list?.description || "Review and manage the tasks in this list."}
              </Typography>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                component={Link}
                to="/lists"
                variant="outlined"
                startIcon={<ArrowBackIcon />}
              >
                All lists
              </Button>
              <Button
                component={Link}
                to={`/task/new?listId=${listId}`}
                variant="contained"
                startIcon={<AddIcon />}
              >
                Add task
              </Button>
            </Stack>
          </Box>
        </Paper>

        {error && <Alert severity="error">{error}</Alert>}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "260px minmax(0, 1fr)" },
            gap: 3,
            alignItems: "start"
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 4,
              position: { md: "sticky" },
              top: { md: 96 }
            }}
          >
            <Stack spacing={2.25}>
              <Box>
                <Typography variant="overline" color="text.secondary" letterSpacing={1}>
                  Snapshot
                </Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {tasks.length} tasks
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Complete
                </Typography>
                <Typography variant="h4">
                  {completedTasks}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Time spent
                </Typography>
                <Typography variant="h4">
                  {formatHours(totalTimeSpent)}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Estimated hours
                </Typography>
                <Typography variant="h4">
                  {formatHours(totalEstimatedTime)}
                </Typography>
              </Box>
            </Stack>
          </Paper>

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
                  Loading list tasks
                </Typography>
              </Stack>
            </Paper>
          ) : list ? (
            <ListView
              tasks={tasks}
              handleTaskDelete={handleTaskDelete}
              deletingTaskId={deletingTaskId}
            />
          ) : (
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 4,
                textAlign: "center"
              }}
            >
              <Stack spacing={2} sx={{ alignItems: "center" }}>
                <ViewListOutlinedIcon color="primary" fontSize="large" />
                <Box>
                  <Typography variant="h5">List not found</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                    This list may have been deleted or may not belong to the current account.
                  </Typography>
                </Box>
                <Button component={Link} to="/lists" variant="contained">
                  Back to lists
                </Button>
              </Stack>
            </Paper>
          )}
        </Box>
      </Stack>
    </Container>
  );
};

export default ListPage;
