import React from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";

const formatDate = (value) => {
  if (!value) {
    return "No target date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No target date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
};

const formatHours = (value) => {
  const hours = Number(value) || 0;
  return `${hours.toLocaleString(undefined, { maximumFractionDigits: 2 })} hrs`;
};

const ListView = ({ tasks = [], handleTaskDelete, deletingTaskId = "" }) => {
  if (tasks.length === 0) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          textAlign: "center"
        }}
      >
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <TaskAltOutlinedIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h5">No tasks in this list yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              Add a task to turn this list into a working collection.
            </Typography>
          </Box>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {tasks.map((task) => (
        <Paper
          key={task._id}
          variant="outlined"
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            transition: "transform 160ms ease, border-color 160ms ease",
            "&:hover": {
              transform: "translateY(-2px)",
              borderColor: "primary.main"
            }
          }}
        >
          <Stack spacing={2}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) auto" },
                gap: 2,
                alignItems: "start"
              }}
            >
              <Stack spacing={1}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                  <Typography variant="h5">{task.title}</Typography>
                  <Chip
                    label={task.isComplete ? "Complete" : "In progress"}
                    color={task.isComplete ? "success" : "primary"}
                    size="small"
                    variant={task.isComplete ? "filled" : "outlined"}
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {task.description || "No description yet."}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ justifyContent: { sm: "flex-end" } }}>
                <Button
                  component={Link}
                  to={`/tasks/${task._id}`}
                  variant="outlined"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                >
                  Open
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  startIcon={<DeleteOutlineIcon />}
                  disabled={deletingTaskId === task._id}
                  onClick={() => handleTaskDelete(task._id)}
                >
                  {deletingTaskId === task._id ? "Deleting" : "Delete"}
                </Button>
              </Stack>
            </Box>

            <Divider />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(3, minmax(0, 1fr))"
                },
                gap: 2
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Time spent
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {formatHours(task.timeSpent)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Estimate
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {formatHours(task.estimatedCompletionTime)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Target
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {formatDate(task.targetCompletionDate)}
                </Typography>
              </Box>
            </Box>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
};

export default ListView;
