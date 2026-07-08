const test = require('node:test');
const assert = require('node:assert/strict');

const {
  UNASSIGNED_ID,
  UNASSIGNED_COLOR,
  CALENDAR_GOAL_COLORS,
  resolveTopLevelGoalIds,
  getTopLevelGoalId,
  buildGoalColorMap,
  buildGoalCalendarItems,
  buildTaskCalendarItems,
  describeCalendarGroup,
  buildGoalsById
} = require('./calendarModel');

const goals = [
  { _id: 'root-1', title: 'Launch Goal', parentGoalId: null, targetCompletionDate: '2026-01-14' },
  { _id: 'child-1', title: 'Launch Subgoal', parentGoalId: 'root-1', targetCompletionDate: '2026-01-16' },
  { _id: 'grand-1', title: 'Launch Deep', parentGoalId: 'child-1', targetCompletionDate: '2026-01-17' },
  { _id: 'root-2', title: 'Health Goal', parentGoalId: null, targetCompletionDate: '2026-01-15' }
];

test('resolveTopLevelGoalIds walks up to the root goal', () => {
  const map = resolveTopLevelGoalIds(goals);
  assert.equal(map.get('root-1'), 'root-1');
  assert.equal(map.get('child-1'), 'root-1');
  assert.equal(map.get('grand-1'), 'root-1');
  assert.equal(map.get('root-2'), 'root-2');
});

test('resolveTopLevelGoalIds tolerates cycles and missing parents', () => {
  const cyclic = [
    { _id: 'a', title: 'A', parentGoalId: 'b' },
    { _id: 'b', title: 'B', parentGoalId: 'a' },
    { _id: 'orphan', title: 'Orphan', parentGoalId: 'missing' }
  ];
  const map = resolveTopLevelGoalIds(cyclic);
  // A goal in a cycle resolves to some stable id within the cycle.
  assert.ok(['a', 'b'].includes(map.get('a')));
  // A goal whose parent no longer exists resolves to that missing parent id
  // (matches the web calendar's resolution), so it groups on its own.
  assert.equal(map.get('orphan'), 'missing');
});

test('getTopLevelGoalId falls back to the id itself when unknown', () => {
  const map = resolveTopLevelGoalIds(goals);
  assert.equal(getTopLevelGoalId('grand-1', map), 'root-1');
  assert.equal(getTopLevelGoalId('unknown', map), 'unknown');
  assert.equal(getTopLevelGoalId(null, map), null);
});

test('buildGoalColorMap assigns deterministic colors ordered by title', () => {
  const colorMap = buildGoalColorMap(goals);
  // Two top-level trees: "Health Goal" sorts before "Launch Goal".
  assert.equal(colorMap.get('root-2'), CALENDAR_GOAL_COLORS[0]);
  assert.equal(colorMap.get('root-1'), CALENDAR_GOAL_COLORS[1]);
  // Children inherit their tree color via the top-level id (not stored per-child).
  assert.equal(colorMap.has('child-1'), false);
  assert.equal(colorMap.get(UNASSIGNED_ID), UNASSIGNED_COLOR);
});

test('buildGoalCalendarItems marks top-level goals and resolves tree', () => {
  const map = resolveTopLevelGoalIds(goals);
  const items = buildGoalCalendarItems(goals, map);
  const child = items.find((i) => i.id === 'child-1');
  assert.equal(child.type, 'goal');
  assert.equal(child.isTopLevel, false);
  assert.equal(child.topLevelId, 'root-1');
  const root = items.find((i) => i.id === 'root-1');
  assert.equal(root.isTopLevel, true);
});

test('buildTaskCalendarItems groups by top-level goal, else unassigned', () => {
  const map = resolveTopLevelGoalIds(goals);
  const tasks = [
    { _id: 't1', title: 'Linked Task', parentGoalId: 'child-1', targetCompletionDate: '2026-01-13' },
    { _id: 't2', title: 'Free Task', parentGoalId: null, targetCompletionDate: '2026-01-18' }
  ];
  const items = buildTaskCalendarItems(tasks, map);
  assert.equal(items.find((i) => i.id === 't1').topLevelId, 'root-1');
  assert.equal(items.find((i) => i.id === 't2').topLevelId, UNASSIGNED_ID);
  assert.equal(items.every((i) => i.type === 'task'), true);
});

test('describeCalendarGroup labels goals and the unassigned pseudo-group', () => {
  const goalsById = buildGoalsById(goals);
  assert.deepEqual(describeCalendarGroup('root-1', goalsById), {
    id: 'root-1',
    title: 'Launch Goal',
    isPseudo: false
  });
  assert.deepEqual(describeCalendarGroup(UNASSIGNED_ID, goalsById), {
    id: UNASSIGNED_ID,
    title: 'Unassigned tasks',
    isPseudo: true
  });
});
