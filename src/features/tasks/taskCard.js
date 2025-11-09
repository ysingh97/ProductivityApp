import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';
import TaskCompletionBar from './taskCompletionBar';
import { Link } from "react-router-dom";

const TaskCard = ({ task }) => (
  <Card sx={{ minWidth: 275, marginBottom: 2 }}>
    <CardContent>
      <Typography variant="h5" component="div">
        {task.title}
      </Typography>
      {/* <Typography sx={{ mb: 1.5 }} color="text.secondary">
        {task.category}
      </Typography> */}
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

export default TaskCard;