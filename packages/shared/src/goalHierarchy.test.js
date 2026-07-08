const test = require('node:test');
const assert = require('node:assert/strict');

const {
  mergeGoalsById,
  collectDescendantGoalIds,
  getBlockedParentGoalIds,
  filterEligibleParentGoals
} = require('./goalHierarchy');

// a -> b -> c  and  a -> d  (d and c are leaves)
const goals = [
  { _id: 'a', title: 'A', parentGoalId: null },
  { _id: 'b', title: 'B', parentGoalId: 'a' },
  { _id: 'c', title: 'C', parentGoalId: 'b' },
  { _id: 'd', title: 'D', parentGoalId: 'a' }
];

test('mergeGoalsById', async (t) => {
  await t.test('dedupes by id, later collection wins', () => {
    const merged = mergeGoalsById(
      [{ _id: '1', title: 'old' }],
      { _id: '1', title: 'new' }
    );
    assert.equal(merged.length, 1);
    assert.equal(merged[0].title, 'new');
  });

  await t.test('ignores entries without an id', () => {
    assert.deepEqual(mergeGoalsById([{ title: 'no id' }, null]), []);
  });
});

test('collectDescendantGoalIds', async (t) => {
  await t.test('walks the full subtree', () => {
    const descendants = collectDescendantGoalIds(goals, 'a');
    assert.deepEqual([...descendants].sort(), ['b', 'c', 'd']);
  });

  await t.test('returns empty for a leaf', () => {
    assert.equal(collectDescendantGoalIds(goals, 'c').size, 0);
  });

  await t.test('returns empty when no root given', () => {
    assert.equal(collectDescendantGoalIds(goals, null).size, 0);
  });
});

test('getBlockedParentGoalIds includes the goal itself and its descendants', () => {
  const blocked = getBlockedParentGoalIds(goals, 'a');
  assert.deepEqual([...blocked].sort(), ['a', 'b', 'c', 'd']);
});

test('filterEligibleParentGoals', async (t) => {
  await t.test('excludes the goal and its descendants (no cycles)', () => {
    const eligible = filterEligibleParentGoals(goals, 'b').map((g) => g._id);
    // b, and its descendant c, are excluded; a and d remain
    assert.deepEqual(eligible.sort(), ['a', 'd']);
  });

  await t.test('returns all goals when there is no current goal', () => {
    assert.equal(filterEligibleParentGoals(goals, null).length, goals.length);
  });
});
