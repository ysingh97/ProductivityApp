import { LinearProgress, Typography, Box } from '@mui/material';

const TaskCompletionBar = ({ timeSpent, estimatedCompletionTime }) => {
  const progress = Math.min((timeSpent / estimatedCompletionTime) * 100, 100);

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="body2">
        {`Progress: ${timeSpent} / ${estimatedCompletionTime} hrs`}
      </Typography>
      <LinearProgress variant="determinate" value={progress} />
    </Box>
  );
};

export default TaskCompletionBar;