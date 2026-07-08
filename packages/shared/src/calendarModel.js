const { toGoalId } = require('./goalHierarchy');

const UNASSIGNED_ID = 'unassigned';
const UNASSIGNED_COLOR = '#64748b';

const CALENDAR_GOAL_COLORS = [
  '#1d4ed8',
  '#059669',
  '#ea580c',
  '#e11d48',
  '#0f766e',
  '#0ea5e9',
  '#84cc16',
  '#16a34a',
  '#f59e0b',
  '#dc2626'
];

const buildGoalsById = (goals = []) => {
  const map = new Map();
  goals.forEach((goal) => {
    const id = toGoalId(goal?._id);
    if (id) {
      map.set(id, goal);
    }
  });
  return map;
};

// Maps every goal id to the id of the top-level goal (root) of its tree.
// Handles missing parents and parent cycles gracefully (a goal in a cycle
// resolves to itself).
const resolveTopLevelGoalIds = (goals = []) => {
  const goalsById = buildGoalsById(goals);
  const topLevelById = new Map();

  const resolve = (goalId, trail) => {
    const id = toGoalId(goalId);
    if (!id) return null;
    if (topLevelById.has(id)) {
      return topLevelById.get(id);
    }
    if (trail.has(id)) {
      topLevelById.set(id, id);
      return id;
    }
    const goal = goalsById.get(id);
    if (!goal || !goal.parentGoalId) {
      topLevelById.set(id, id);
      return id;
    }
    trail.add(id);
    const rootId = resolve(goal.parentGoalId, trail);
    topLevelById.set(id, rootId || id);
    return topLevelById.get(id);
  };

  goalsById.forEach((_goal, id) => {
    resolve(id, new Set());
  });

  return topLevelById;
};

const getTopLevelGoalId = (goalId, topLevelById) => {
  const id = toGoalId(goalId);
  if (!id) return null;
  return topLevelById.get(id) || id;
};

// Assigns a stable color to each top-level goal tree, ordered by title so the
// mapping is deterministic across renders/platforms.
const buildGoalColorMap = (goals = [], topLevelById) => {
  const resolved = topLevelById || resolveTopLevelGoalIds(goals);
  const goalsById = buildGoalsById(goals);

  const topLevelIds = new Set();
  goalsById.forEach((_goal, id) => {
    topLevelIds.add(getTopLevelGoalId(id, resolved) || id);
  });

  const sorted = Array.from(topLevelIds)
    .map((id) => ({ id, title: goalsById.get(id)?.title || 'Unknown goal' }))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));

  const colorMap = new Map();
  sorted.forEach((goal, index) => {
    colorMap.set(goal.id, CALENDAR_GOAL_COLORS[index % CALENDAR_GOAL_COLORS.length]);
  });
  colorMap.set(UNASSIGNED_ID, UNASSIGNED_COLOR);

  return colorMap;
};

const buildGoalCalendarItems = (goals = [], topLevelById) => {
  const resolved = topLevelById || resolveTopLevelGoalIds(goals);
  return goals.map((goal) => ({
    type: 'goal',
    id: toGoalId(goal?._id),
    title: goal?.title,
    topLevelId: getTopLevelGoalId(goal?._id, resolved),
    isTopLevel: !goal?.parentGoalId,
    date: goal?.targetCompletionDate
  }));
};

const buildTaskCalendarItems = (tasks = [], topLevelById) => {
  const resolved = topLevelById || new Map();
  return tasks.map((task) => ({
    type: 'task',
    id: toGoalId(task?._id),
    title: task?.title,
    topLevelId: task?.parentGoalId
      ? getTopLevelGoalId(task.parentGoalId, resolved)
      : UNASSIGNED_ID,
    isTopLevel: false,
    date: task?.targetCompletionDate
  }));
};

// Resolves the label + pseudo flag for a top-level filter entry.
const describeCalendarGroup = (id, goalsById) => {
  if (id === UNASSIGNED_ID) {
    return { id, title: 'Unassigned tasks', isPseudo: true };
  }
  return { id, title: goalsById.get(id)?.title || 'Unknown goal', isPseudo: false };
};

module.exports = {
  UNASSIGNED_ID,
  UNASSIGNED_COLOR,
  CALENDAR_GOAL_COLORS,
  buildGoalsById,
  resolveTopLevelGoalIds,
  getTopLevelGoalId,
  buildGoalColorMap,
  buildGoalCalendarItems,
  buildTaskCalendarItems,
  describeCalendarGroup
};
