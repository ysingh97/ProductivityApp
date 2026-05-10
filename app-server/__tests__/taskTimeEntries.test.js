const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const createApp = require('../app');
const Category = require('../models/category');
const Task = require('../models/task');
const TimeEntry = require('../models/timeEntry');
const User = require('../models/user');
const { seedMockTasks } = require('../test-data/mockTasks');

jest.setTimeout(60000);

const originalAllowTestAuth = process.env.ALLOW_TEST_AUTH;

let app;
let mongoServer;

beforeAll(async () => {
  process.env.ALLOW_TEST_AUTH = 'true';
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = createApp();
});

afterEach(async () => {
  await TimeEntry.deleteMany({});
  await Task.deleteMany({});
  await Category.deleteMany({});
  await User.deleteMany({});
});

afterAll(async () => {
  if (originalAllowTestAuth === undefined) {
    delete process.env.ALLOW_TEST_AUTH;
  } else {
    process.env.ALLOW_TEST_AUTH = originalAllowTestAuth;
  }

  await mongoose.disconnect();
  await mongoServer.stop();
});

test('task time-entry endpoint creates a time entry and refreshes cached task totals', async () => {
  const { tasks } = await seedMockTasks('basic');
  const workTask = tasks.find((task) => task.title === 'Project planning');

  await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T09:15:00.000Z',
      endedAt: '2026-01-12T11:00:00.000Z'
    })
    .expect(201)
    .expect(({ body }) => {
      expect(body.timeEntry).toMatchObject({
        taskId: String(workTask._id),
        durationMinutes: 105
      });
      expect(body.task).toMatchObject({
        _id: String(workTask._id),
        timeSpent: 1.75,
        timeLeft: 3.25
      });
    });

  const persistedTask = await Task.findById(workTask._id).lean();
  const persistedEntries = await TimeEntry.find({ taskId: workTask._id }).lean();

  expect(persistedTask.timeSpent).toBe(1.75);
  expect(persistedTask.timeLeft).toBe(3.25);
  expect(persistedEntries).toHaveLength(1);
  expect(String(persistedEntries[0].category)).toBe(String(workTask.category));
});

test('task time-entry endpoint is idempotent for duplicate task/start/end submissions', async () => {
  const { tasks } = await seedMockTasks('basic');
  const workTask = tasks.find((task) => task.title === 'Project planning');
  const payload = {
    startedAt: '2026-01-12T09:15:00.000Z',
    endedAt: '2026-01-12T10:15:00.000Z'
  };

  await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send(payload)
    .expect(201)
    .expect(({ body }) => {
      expect(body.duplicate).toBe(false);
      expect(body.task.timeSpent).toBe(1);
    });

  await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send(payload)
    .expect(200)
    .expect(({ body }) => {
      expect(body.duplicate).toBe(true);
      expect(body.task.timeSpent).toBe(1);
    });

  const persistedEntries = await TimeEntry.find({ taskId: workTask._id }).lean();
  expect(persistedEntries).toHaveLength(1);
});

test('task time-entry endpoint rejects invalid timestamps', async () => {
  const { tasks } = await seedMockTasks('basic');

  await request(app)
    .post(`/api/tasks/${tasks[0]._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: 'not-a-date',
      endedAt: '2026-01-12T11:00:00.000Z'
    })
    .expect(400)
    .expect({
      error: 'startedAt and endedAt must be valid ISO date-time values.'
    });
});

test('task time-entry endpoint rejects reversed ranges', async () => {
  const { tasks } = await seedMockTasks('basic');

  await request(app)
    .post(`/api/tasks/${tasks[0]._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T11:00:00.000Z',
      endedAt: '2026-01-12T09:15:00.000Z'
    })
    .expect(400)
    .expect({
      error: 'endedAt must be after startedAt.'
    });
});

test('task time-entry endpoint is isolated by user', async () => {
  const { tasks } = await seedMockTasks('basic');

  await request(app)
    .post(`/api/tasks/${tasks[0]._id}/time-entries`)
    .set('Authorization', 'Bearer test:empty')
    .send({
      startedAt: '2026-01-12T09:15:00.000Z',
      endedAt: '2026-01-12T11:00:00.000Z'
    })
    .expect(404)
    .expect({ message: 'Task not found' });
});
