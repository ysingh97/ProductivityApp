import services from '../../api/services';
import { createGoal } from '../goals/goalService';
import { createTask } from '../tasks/taskService';

export const { generatePlan } = services;

const buildGoalPayload = ({ title, description, estimatedHours, suggestedTargetDate, category, parentGoalId }) => {
  const payload = { title, description, estimatedHours };
  if (category) payload.category = category;
  if (suggestedTargetDate) payload.targetCompletionDate = suggestedTargetDate;
  if (parentGoalId) payload.parentGoalId = parentGoalId;
  return payload;
};

const buildTaskPayload = ({ title, description, estimatedCompletionTime, suggestedTargetDate, parentGoalId }) => {
  const payload = { title, description, estimatedCompletionTime, parentGoalId };
  if (suggestedTargetDate) payload.targetCompletionDate = suggestedTargetDate;
  return payload;
};

// Persists an (already reviewed) plan by reusing the standard goal/task
// endpoints: the top goal first, then its direct tasks, then each sub-goal and
// the sub-goal's tasks. Categories are inherited server-side for children.
export const savePlan = async (plan) => {
  const goal = plan?.goal;
  if (!goal || !goal.title) {
    throw new Error('There is no goal to save.');
  }

  const savedGoal = await createGoal(buildGoalPayload({ ...goal, category: goal.category }));

  for (const task of goal.tasks || []) {
    await createTask(buildTaskPayload({ ...task, parentGoalId: savedGoal._id }));
  }

  for (const subGoal of goal.subGoals || []) {
    const savedSubGoal = await createGoal(
      buildGoalPayload({ ...subGoal, parentGoalId: savedGoal._id })
    );
    for (const task of subGoal.tasks || []) {
      await createTask(buildTaskPayload({ ...task, parentGoalId: savedSubGoal._id }));
    }
  }

  return savedGoal;
};
