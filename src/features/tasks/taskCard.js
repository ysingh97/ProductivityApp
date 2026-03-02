import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';
import TaskCompletionBar from './taskCompletionBar';
import { Link } from "react-router-dom";

const TaskCard = ({ task }) => {
  const categoryTitle = task?.category && typeof task.category === 'object'
    ? task.category.title
    : task?.category;

  return (
    <Card sx={{ minWidth: 275, marginBottom: 2 }}>
      <CardContent>
        <Typography variant="h5" component="div">
          {task.title}
        </Typography>
        {categoryTitle && (
          <Typography sx={{ mb: 1.5 }} color="text.secondary">
            {categoryTitle}
          </Typography>
        )}
        <Typography variant="body2">
          {task.description}
        </Typography>
        <TaskCompletionBar timeSpent={task.timeSpent} estimatedCompletionTime={task.estimatedCompletionTime}/>
      </CardContent>
      <Link
          to={`/task/${task._id}/edit`}
      >Edit Task</Link>
    </Card>
  );
};

export default TaskCard;
