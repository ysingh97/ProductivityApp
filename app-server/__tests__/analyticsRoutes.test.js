const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const createApp = require('../app');
const Category = require('../models/category');
const Task = require('../models/task');
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

test('analytics routes require authentication', async () => {
  await request(app)
    .get('/api/analytics/health')
    .expect(401)
    .expect({ message: 'Missing auth token' });
});

test('analytics routes are reachable with test authentication', async () => {
  await request(app)
    .get('/api/analytics/health')
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect({ status: 'ok' });
});

test('time-by-category returns category totals and percentages for the authenticated user', async () => {
  await seedMockTasks('basic');

  await request(app)
    .get('/api/analytics/time-by-category')
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual({
        totalHours: 20,
        categories: [
          expect.objectContaining({
            categoryTitle: 'Work',
            hours: 10,
            percentage: 50
          }),
          expect.objectContaining({
            categoryTitle: 'Health',
            hours: 5,
            percentage: 25
          }),
          expect.objectContaining({
            categoryTitle: 'Learning',
            hours: 5,
            percentage: 25
          })
        ]
      });
    });
});

test('time-by-category returns empty totals when the authenticated user has no tasks', async () => {
  await seedMockTasks('basic');
  await seedMockTasks('empty');

  await request(app)
    .get('/api/analytics/time-by-category')
    .set('Authorization', 'Bearer test:empty')
    .expect(200)
    .expect({
      totalHours: 0,
      categories: []
    });
});

test('time-by-category includes uncategorized task time', async () => {
  await seedMockTasks('edge');

  await request(app)
    .get('/api/analytics/time-by-category')
    .set('Authorization', 'Bearer test:edge')
    .expect(200)
    .expect(({ body }) => {
      expect(body.categories).toEqual([
        expect.objectContaining({
          categoryTitle: 'Learning',
          hours: 3.25,
          percentage: 48.15
        }),
        expect.objectContaining({
          categoryTitle: 'Uncategorized',
          hours: 2,
          percentage: 29.63
        }),
        expect.objectContaining({
          categoryTitle: 'Work',
          hours: 1.5,
          percentage: 22.22
        })
      ]);
    });
});
