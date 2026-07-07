const test = require('node:test');
const assert = require('node:assert/strict');
const dayjs = require('dayjs');

const {
  getTaskTargetCompletionDateError,
  getTaskTargetCompletionDateMinDateTime,
  getGoalTargetCompletionDateError,
  getGoalTargetCompletionDateMinDateTime,
  getTaskEstimateHoursError,
  parseTaskEstimateHours,
  getTimeEntryRangeError,
  getTimeEntryDurationHours
} = require('./validation');

const now = dayjs('2026-01-01T12:00:00Z');

test('getTaskTargetCompletionDateError', async (t) => {
  await t.test('rejects a past target date', () => {
    assert.match(
      getTaskTargetCompletionDateError({ targetCompletionDate: now.subtract(1, 'hour'), now }),
      /cannot be earlier/
    );
  });

  await t.test('rejects a date later than the parent deadline', () => {
    assert.match(
      getTaskTargetCompletionDateError({
        targetCompletionDate: now.add(2, 'day'),
        now,
        parentDeadline: now.add(1, 'day')
      }),
      /later than the parent goal/
    );
  });

  await t.test('allows keeping an unchanged past date when permitted', () => {
    const original = now.subtract(3, 'day');
    assert.equal(
      getTaskTargetCompletionDateError({
        targetCompletionDate: original,
        now,
        originalTargetCompletionDate: original,
        allowUnchangedPastDate: true
      }),
      null
    );
  });

  await t.test('still rejects a changed past date even when unchanged is allowed', () => {
    const original = now.subtract(3, 'day');
    assert.match(
      getTaskTargetCompletionDateError({
        targetCompletionDate: now.subtract(1, 'hour'),
        now,
        originalTargetCompletionDate: original,
        allowUnchangedPastDate: true
      }),
      /cannot be earlier/
    );
  });
});

test('getTaskTargetCompletionDateMinDateTime', async (t) => {
  await t.test('returns now by default', () => {
    assert.equal(getTaskTargetCompletionDateMinDateTime({ now }), now);
  });

  await t.test('returns the original past date when unchanged edits are allowed', () => {
    const original = now.subtract(5, 'day');
    assert.equal(
      getTaskTargetCompletionDateMinDateTime({
        now,
        originalTargetCompletionDate: original,
        allowUnchangedPastDate: true
      }),
      original
    );
  });
});

test('goal validators mirror task validators', async (t) => {
  await t.test('rejects sub-goal later than parent', () => {
    assert.match(
      getGoalTargetCompletionDateError({
        targetCompletionDate: now.add(2, 'day'),
        now,
        parentDeadline: now.add(1, 'day')
      }),
      /Sub-goals cannot/
    );
  });

  await t.test('min datetime honors allowed unchanged past date', () => {
    const original = now.subtract(2, 'day');
    assert.equal(
      getGoalTargetCompletionDateMinDateTime({
        now,
        originalTargetCompletionDate: original,
        allowUnchangedPastDate: true
      }),
      original
    );
  });
});

test('estimate hours validation', async (t) => {
  await t.test('rejects negative / non-numeric', () => {
    assert.match(getTaskEstimateHoursError(-1), /0 or greater/);
    assert.match(getTaskEstimateHoursError('abc'), /0 or greater/);
  });

  await t.test('accepts valid values', () => {
    assert.equal(getTaskEstimateHoursError(0), null);
    assert.equal(getTaskEstimateHoursError('2.5'), null);
  });

  await t.test('parseTaskEstimateHours parses numbers', () => {
    assert.equal(parseTaskEstimateHours('3'), 3);
    assert.ok(Number.isNaN(parseTaskEstimateHours('nope')));
  });
});

test('time entry validation', async (t) => {
  const start = dayjs('2026-01-01T09:00:00Z');
  const end = dayjs('2026-01-01T10:30:00Z');

  await t.test('requires both start and end', () => {
    assert.match(getTimeEntryRangeError({ startedAt: null, endedAt: end, now }), /both a start and end/);
  });

  await t.test('requires end after start', () => {
    assert.match(getTimeEntryRangeError({ startedAt: end, endedAt: start, now }), /after start time/);
  });

  await t.test('rejects an end time in the future', () => {
    assert.match(
      getTimeEntryRangeError({ startedAt: start, endedAt: now.add(1, 'hour'), now }),
      /cannot be in the future/
    );
  });

  await t.test('accepts a valid range and computes duration hours', () => {
    assert.equal(getTimeEntryRangeError({ startedAt: start, endedAt: end, now }), null);
    assert.equal(getTimeEntryDurationHours({ startedAt: start, endedAt: end }), 1.5);
  });
});
