const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const Goal = require('../models/goal');
const Task = require('../models/task');
const { getGoogleCalendarSyncSummary } = require('../services/calendarSyncService');

jest.setTimeout(60000);

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  await Goal.deleteMany({});
  await Task.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test('summarizes Google Calendar sync coverage and blocked configuration counts', async () => {
  const userId = new mongoose.Types.ObjectId();

  await Goal.create([
    {
      title: 'Eligible goal',
      userId,
      targetCompletionDate: new Date('2026-08-01T10:00:00.000Z'),
      isComplete: false
    },
    {
      title: 'Undated goal',
      userId,
      isComplete: false
    },
    {
      title: 'Completed goal',
      userId,
      targetCompletionDate: new Date('2026-08-02T10:00:00.000Z'),
      isComplete: true
    }
  ]);

  await Task.create([
    {
      title: 'Eligible task',
      userId,
      targetCompletionDate: new Date('2026-08-03T10:00:00.000Z'),
      isComplete: false
    },
    {
      title: 'Undated task',
      userId,
      isComplete: false
    },
    {
      title: 'Completed task',
      userId,
      isComplete: true
    }
  ]);

  const summary = await getGoogleCalendarSyncSummary({
    userId,
    connection: {
      selectedCalendarId: 'primary',
      syncEnabled: false
    }
  });

  expect(summary).toEqual({
    eligibleToSyncCount: 2,
    blockedByConfigurationCount: 2,
    activelySyncingCount: 0,
    missingTargetDateCount: 2,
    completedCount: 2,
    configurationIssue: 'syncPaused'
  });
});
