const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const createApp = require('../app');
const Category = require('../models/category');
const Task = require('../models/task');
const User = require('../models/user');
const { seedMockCategories } = require('../test-data/mockCategories');
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

test('time-by-category excludes categories whose summed task time is zero', async () => {
  const { user, categories } = await seedMockCategories('basic');

  await Task.create({
    title: 'Zero hour work task',
    description: 'Regression test fixture',
    estimatedCompletionTime: 3,
    timeLeft: 3,
    timeSpent: 0,
    userId: user._id,
    category: categories[0]._id,
    targetCompletionDate: new Date('2026-01-08T18:00:00.000Z')
  });

  await Task.create({
    title: 'Zero hour uncategorized task',
    description: 'Regression test fixture',
    estimatedCompletionTime: 1,
    timeLeft: 1,
    timeSpent: 0,
    userId: user._id,
    category: null,
    targetCompletionDate: new Date('2026-01-09T18:00:00.000Z')
  });

  await request(app)
    .get('/api/analytics/time-by-category')
    .set('Authorization', 'Bearer test:basic')
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

test('time-by-category supports inclusive date range filtering', async () => {
  await seedMockTasks('basic');

  await request(app)
    .get('/api/analytics/time-by-category?from=2026-01-08&to=2026-01-10')
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual({
        totalHours: 15,
        categories: [
          expect.objectContaining({
            categoryTitle: 'Work',
            hours: 10,
            percentage: 66.67
          }),
          expect.objectContaining({
            categoryTitle: 'Health',
            hours: 5,
            percentage: 33.33
          })
        ]
      });
    });
});

test('time-by-category returns empty totals for a valid date range with no matching tasks', async () => {
  await seedMockTasks('basic');

  await request(app)
    .get('/api/analytics/time-by-category?from=2026-01-12&to=2026-01-13')
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect({
      totalHours: 0,
      categories: []
    });
});

test('time-by-category rejects invalid date formats', async () => {
  await request(app)
    .get('/api/analytics/time-by-category?from=01-08-2026')
    .set('Authorization', 'Bearer test:basic')
    .expect(400)
    .expect({
      error: 'from must use YYYY-MM-DD format.'
    });
});

test('time-by-category rejects reversed date ranges', async () => {
  await request(app)
    .get('/api/analytics/time-by-category?from=2026-01-10&to=2026-01-08')
    .set('Authorization', 'Bearer test:basic')
    .expect(400)
    .expect({
      error: 'from must be on or before to.'
    });
});
