const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Category = require('../models/category');
const Task = require('../models/task');
const TimeEntry = require('../models/timeEntry');
const User = require('../models/user');
const { seedMockTimeEntries } = require('../test-data/mockTimeEntries');

jest.setTimeout(60000);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await TimeEntry.deleteMany({});
  await Task.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('seedMockTimeEntries creates deterministic overlapping time-entry history', async () => {
  const { timeEntries } = await seedMockTimeEntries('basic');

  const totalDurationMinutes = timeEntries.reduce(
    (sum, entry) => sum + entry.durationMinutes,
    0
  );
  expect(totalDurationMinutes).toBe(1200);

  const totalsByCategory = timeEntries.reduce((totals, entry) => {
    const categoryKey = String(entry.category || 'uncategorized');
    totals[categoryKey] = (totals[categoryKey] || 0) + entry.durationMinutes;
    return totals;
  }, {});

  const categoriesByDay = timeEntries.reduce((days, entry) => {
    const dayKey = entry.startedAt.toISOString().slice(0, 10);
    const categoryKey = String(entry.category || 'uncategorized');

    if (!days[dayKey]) {
      days[dayKey] = new Set();
    }

    days[dayKey].add(categoryKey);
    return days;
  }, {});

  const sortedDurations = timeEntries
    .map((entry) => entry.durationMinutes)
    .sort((a, b) => a - b);

  expect(timeEntries.every((entry) => entry.taskId)).toBe(true);
  expect(Object.values(totalsByCategory).sort((a, b) => a - b)).toEqual([300, 300, 600]);
  expect(sortedDurations).toEqual([105, 110, 155, 165, 190, 195, 280]);
  expect(categoriesByDay['2026-01-08'].size).toBe(2);
  expect(categoriesByDay['2026-01-09'].size).toBe(2);
  expect(categoriesByDay['2026-01-10'].size).toBe(2);
});
