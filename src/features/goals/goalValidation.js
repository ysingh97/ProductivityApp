export const getGoalTargetCompletionDateError = ({
  targetCompletionDate,
  now,
  parentDeadline
}) => {
  if (targetCompletionDate && targetCompletionDate.isBefore(now)) {
    return "Target completion date cannot be earlier than the current time.";
  }

  if (targetCompletionDate && parentDeadline && targetCompletionDate.isAfter(parentDeadline)) {
    return "Sub-goals cannot have a target completion date later than the parent goal.";
  }

  return null;
};

export const getGoalEstimateHoursError = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return "Estimated hours must be 0 or greater.";
  }

  return null;
};

export const parseGoalEstimateHours = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};
