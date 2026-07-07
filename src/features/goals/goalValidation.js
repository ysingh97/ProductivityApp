export const getGoalTargetCompletionDateError = ({
  targetCompletionDate,
  now,
  parentDeadline,
  originalTargetCompletionDate = null,
  allowUnchangedPastDate = false
}) => {
  const isKeepingExistingPastDate =
    Boolean(allowUnchangedPastDate) &&
    Boolean(targetCompletionDate) &&
    Boolean(originalTargetCompletionDate) &&
    targetCompletionDate.isBefore(now) &&
    targetCompletionDate.isSame(originalTargetCompletionDate);

  if (targetCompletionDate && targetCompletionDate.isBefore(now) && !isKeepingExistingPastDate) {
    return "Target completion date cannot be earlier than the current time.";
  }

  if (targetCompletionDate && parentDeadline && targetCompletionDate.isAfter(parentDeadline)) {
    return "Sub-goals cannot have a target completion date later than the parent goal.";
  }

  return null;
};

export const getGoalTargetCompletionDateMinDateTime = ({
  now,
  originalTargetCompletionDate = null,
  allowUnchangedPastDate = false
}) => {
  if (
    allowUnchangedPastDate &&
    originalTargetCompletionDate &&
    originalTargetCompletionDate.isBefore(now)
  ) {
    return originalTargetCompletionDate;
  }

  return now;
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
