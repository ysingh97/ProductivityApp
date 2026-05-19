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

test('seedMockTasks creates deterministic task totals for a mock account', async () => {
  const { tasks } = await seedMockTasks('basic');

  const totalHours = tasks.reduce((sum, task) => sum + task.timeSpent, 0);
  expect(totalHours).toBe(20);
  expect(tasks.map((task) => task.title)).toEqual([
    'Deep work sprint',
    'Project planning',
    'Strength training',
    'Read systems design notes'
  ]);
});

test('mock task data is visible through protected routes for the matching persona', async () => {
  await seedMockTasks('basic', { includeTimeEntries: true });

  await request(app)
    .get('/api/tasks')
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      const totalsByCategory = body.reduce((totals, task) => {
        const categoryTitle = task.category?.title || 'Uncategorized';
        totals[categoryTitle] = (totals[categoryTitle] || 0) + task.timeSpent;
        return totals;
      }, {});

      expect(totalsByCategory).toEqual({
        Health: 5,
        Learning: 5,
        Work: 10
      });
    });
});

test('mock task data remains isolated between personas', async () => {
  await seedMockTasks('basic');
  await seedMockTasks('empty');

  await request(app)
    .get('/api/tasks')
    .set('Authorization', 'Bearer test:empty')
    .expect(200)
    .expect([]);
});
