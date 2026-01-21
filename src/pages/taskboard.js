import React, { useState, useEffect } from "react";
import { fetchTasks } from "../features/tasks/taskService";
import { fetchLists } from "../features/lists/listService";
import { fetchGoals } from "../features/goals/goalService";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import {
  Container,
  Box,
  Typography,
  Card,
  CardActionArea,
  Button,
  Divider
} from "@mui/material";

const scrollRowSx = {
  display: "flex",
  gap: 2,
  overflowX: "auto",
  overflowY: "hidden",
  pb: 2,
  borderBottom: "1px solid #e0e0e0",
  minHeight: 150
};

const cardBaseSx = {
  minWidth: 220,
  minHeight: 130,
  p: 2,
  flexShrink: 0,
  borderRadius: 3,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "0.2s",
  boxShadow: 1,
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: 4
  }
};

const TaskBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [taskRes, listRes, goalRes] = await Promise.all([
          fetchTasks(),
          fetchLists(),
          fetchGoals()
        ]);

        setTasks(taskRes);
        setLists(listRes);
        setGoals(goalRes);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <p>Loading...</p>;

  const handleSignOut = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Dashboard Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3
        }}
      >
        <Typography variant="h4" fontWeight={700}>
          Task Board
        </Typography>

        {/* Header Action Buttons */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {user && (
            <Box sx={{ textAlign: "right" }}>
              <Typography variant="body2" fontWeight={600}>
                {user.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          )}
          <Button variant="contained" component={Link} to="/task/new">
            New Task
          </Button>
          <Button variant="contained" component={Link} to="/createGoalPage">
            New Goal
          </Button>
          <Button variant="outlined" component={Link} to="/createListPage">
            New List
          </Button>
          <Button variant="text" color="inherit" onClick={handleSignOut}>
            Sign out
          </Button>
        </Box>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* TASKS SECTION */}
      <Box mb={5}>
        <Typography variant="h6" mb={1} fontWeight={600}>
          Tasks ({tasks.length})
        </Typography>

        <Box sx={scrollRowSx}>
          {tasks.map((task) => (
            <Card
              key={task._id}
              sx={{
                ...cardBaseSx,
                background: "#fafafa"
              }}
            >
              <CardActionArea
                component={Link}
                to={`/tasks/${task._id}`}
                sx={{ height: "100%" }}
              >
                <Typography color="text.primary" fontWeight={500}>
                  {task.title}
                </Typography>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>

      {/* GOALS SECTION */}
      <Box mb={5}>
        <Typography variant="h6" mb={1} fontWeight={600}>
          Goals ({goals.length})
        </Typography>

        <Box sx={scrollRowSx}>
          {goals.map((goal) => (
            <Card
              key={goal._id}
              sx={{
                ...cardBaseSx,
                background: "#eef5ff"
              }}
            >
              <CardActionArea
                component={Link}
                to={`/goals/${goal._id}`}
                sx={{ height: "100%" }}
              >
                <Typography color="text.primary" fontWeight={500}>
                  {goal.title}
                </Typography>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </Box>
    </Container>
  );
};

export default TaskBoard;
