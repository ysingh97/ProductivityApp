const dayjs = require('dayjs');

const getTaskTargetCompletionDateError = ({ targetCompletionDate, now, parentDeadline }) => {
  if (targetCompletionDate && targetCompletionDate.isBefore(now)) {
    return 'Target completion date cannot be earlier than the current time.';
  }
  if (targetCompletionDate && parentDeadline && targetCompletionDate.isAfter(parentDeadline)) {
    return 'Subtasks cannot have a target completion date later than the parent goal.';
  }
  return null;
};

const getTaskEstimateHoursError = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 'Estimated hours must be 0 or greater.';
  }
  return null;
};

const parseTaskEstimateHours = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const getTimeEntryRangeError = ({ startedAt, endedAt, now = dayjs() }) => {
  if (!startedAt || !endedAt) {
    return 'Select both a start and end time.';
  }
  if (!startedAt.isValid() || !endedAt.isValid()) {
    return 'Choose valid start and end times.';
  }
  if (!endedAt.isAfter(startedAt)) {
    return 'End time must be after start time.';
  }
  if (endedAt.isAfter(now)) {
    return 'End time cannot be in the future.';
  }
  return null;
};

const getTimeEntryDurationHours = ({ startedAt, endedAt }) => {
  if (!startedAt || !endedAt) {
    return null;
  }
  if (!startedAt.isValid() || !endedAt.isValid() || !endedAt.isAfter(startedAt)) {
    return null;
  }
  return Math.round((endedAt.diff(startedAt, 'minute', true) / 60) * 100) / 100;
};

const getGoalTargetCompletionDateError = ({ targetCompletionDate, now, parentDeadline }) => {
  if (targetCompletionDate && targetCompletionDate.isBefore(now)) {
    return 'Target completion date cannot be earlier than the current time.';
  }
  if (targetCompletionDate && parentDeadline && targetCompletionDate.isAfter(parentDeadline)) {
    return 'Sub-goals cannot have a target completion date later than the parent goal.';
  }
  return null;
};

const getGoalEstimateHoursError = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 'Estimated hours must be 0 or greater.';
  }
  return null;
};

const parseGoalEstimateHours = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

module.exports = {
  getTaskTargetCompletionDateError,
  getTaskEstimateHoursError,
  parseTaskEstimateHours,
  getTimeEntryRangeError,
  getTimeEntryDurationHours,
  getGoalTargetCompletionDateError,
  getGoalEstimateHoursError,
  parseGoalEstimateHours
};
