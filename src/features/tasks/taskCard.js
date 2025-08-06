import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';

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
    </CardContent>
    <Button size="small">Edit Task</Button>
  </Card>
);

export default TaskCard;