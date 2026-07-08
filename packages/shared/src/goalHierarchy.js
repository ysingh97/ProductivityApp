const toGoalId = (value) => (value ? String(value) : null);

const mergeGoalsById = (...goalCollections) => {
  const byId = new Map();

  goalCollections.flat().forEach((goal) => {
    const goalId = toGoalId(goal?._id);
    if (goalId) {
      byId.set(goalId, goal);
    }
  });

  return Array.from(byId.values());
};

const collectDescendantGoalIds = (goals = [], rootGoalId) => {
  const rootId = toGoalId(rootGoalId);
  if (!rootId) {
    return new Set();
  }

  const goalsByParent = new Map();
  goals.forEach((goal) => {
    const goalId = toGoalId(goal?._id);
    const parentId = toGoalId(goal?.parentGoalId);

    if (!goalId || !parentId) {
      return;
    }

    if (!goalsByParent.has(parentId)) {
      goalsByParent.set(parentId, []);
    }

    goalsByParent.get(parentId).push(goal);
  });

  const descendants = new Set();
  const visited = new Set([rootId]);
  const queue = [rootId];

  while (queue.length) {
    const currentParentId = queue.shift();
    const children = goalsByParent.get(currentParentId) || [];

    children.forEach((child) => {
      const childId = toGoalId(child?._id);
      if (!childId || visited.has(childId)) {
        return;
      }

      visited.add(childId);
      descendants.add(childId);
      queue.push(childId);
    });
  }

  return descendants;
};

const getBlockedParentGoalIds = (goals = [], currentGoalId) => {
  const blockedIds = collectDescendantGoalIds(goals, currentGoalId);
  const goalId = toGoalId(currentGoalId);

  if (goalId) {
    blockedIds.add(goalId);
  }

  return blockedIds;
};

const filterEligibleParentGoals = (goals = [], currentGoalId) => {
  const blockedIds = getBlockedParentGoalIds(goals, currentGoalId);

  return goals.filter((goal) => {
    const goalId = toGoalId(goal?._id);
    return goalId && !blockedIds.has(goalId);
  });
};

module.exports = {
  toGoalId,
  mergeGoalsById,
  collectDescendantGoalIds,
  getBlockedParentGoalIds,
  filterEligibleParentGoals
};
