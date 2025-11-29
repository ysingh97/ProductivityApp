import React, { useState, useEffect } from "react";
import { fetchTasks } from "../features/tasks/taskService";
import { fetchLists } from "../features/lists/listService";
import { fetchGoals } from "../features/goals/goalService";
import { Link } from "react-router-dom";

import {
  Container,
  Box,
  Typography,
  Card,
  CardActionArea
} from "@mui/material";

const scrollRowSx = {
  display: "flex",
  gap: 2,
  overflowX: "auto",
  pb: 2,
  borderBottom: "1px solid #ccc",
  minHeight: 160
};

const cardSx = {
  minWidth: 200,
  minHeight: 120,
  p: 2,
  flexShrink: 0,
  textAlign: "center",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 3
};

const TaskBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [goals, setGoals] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={4}>
        Task Board
      </Typography>

      {/* Tasks */}
      <Box mb={6}>
        <Typography variant="h5" mb={2}>
          Tasks
        </Typography>

        <Box sx={scrollRowSx}>
          {tasks.map((task) => (
            <Card key={task._id} sx={{ ...cardSx, background: "#f9f9f9" }}>
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

      {/* Goals */}
      <Box mb={6}>
        <Typography variant="h5" mb={2}>
          Goals
        </Typography>

        <Box sx={scrollRowSx}>
          {goals.map((goal) => (
            <Card key={goal._id} sx={{ ...cardSx, background: "#eef5ff" }}>
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

      {/* Actions */}
      <Box sx={{ display: "flex", gap: 2 }}>
        <Link to="/task/new">Create Task</Link>
        <Link to="/createListPage">Create List</Link>
        <Link to="/createGoalPage">Create Goal</Link>
      </Box>
    </Container>
  );
};

export default TaskBoard;
