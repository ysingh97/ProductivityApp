const mongoose = require('mongoose');

const TimeEntry = require('../models/timeEntry');

describe('TimeEntry model validation', () => {
  const baseEntry = () => ({
    userId: new mongoose.Types.ObjectId(),
    startedAt: new Date('2026-05-09T09:00:00.000Z'),
    endedAt: new Date('2026-05-09T10:30:00.000Z'),
    durationMinutes: 90
  });

  test('accepts a valid time entry', () => {
    const entry = new TimeEntry(baseEntry());

    expect(entry.validateSync()).toBeUndefined();
  });

  test('rejects entries that end before they start', () => {
    const entry = new TimeEntry({
      ...baseEntry(),
      endedAt: new Date('2026-05-09T08:59:00.000Z')
    });

    const error = entry.validateSync();

    expect(error.errors.endedAt.message).toBe('endedAt must be greater than or equal to startedAt');
  });

  test('rejects entries whose duration does not match their timestamps', () => {
    const entry = new TimeEntry({
      ...baseEntry(),
      durationMinutes: 75
    });

    const error = entry.validateSync();

    expect(error.errors.durationMinutes.message)
      .toBe('durationMinutes must match the difference between startedAt and endedAt');
  });
});
