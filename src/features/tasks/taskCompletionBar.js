import { LinearProgress, Typography, Box } from "@mui/material";

const formatHours = (value) => {
  const rounded = Math.round((Number(value) || 0) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

const TaskCompletionBar = ({ timeSpent, estimatedCompletionTime }) => {
  const numericTimeSpent = Number(timeSpent) || 0;
  const numericEstimate = Number(estimatedCompletionTime) || 0;
  const progress = numericEstimate
    ? Math.min((numericTimeSpent / numericEstimate) * 100, 100)
    : 0;
  const hasMetEstimate = numericEstimate > 0 && numericTimeSpent >= numericEstimate;

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {`Progress: ${formatHours(timeSpent)} / ${formatHours(estimatedCompletionTime)} hrs`}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 10,
          borderRadius: 999,
          bgcolor: hasMetEstimate ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.28)",
          "& .MuiLinearProgress-bar": {
            borderRadius: 999,
            bgcolor: hasMetEstimate ? "#22c55e" : "#f59e0b"
          }
        }}
      />
    </Box>
  );
};

export default TaskCompletionBar;
