const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const createApp = require('../app');
const Category = require('../models/category');
const Task = require('../models/task');
const TimeEntry = require('../models/timeEntry');
const User = require('../models/user');
const { seedMockCategories } = require('../test-data/mockCategories');
const { seedMockTimeEntries } = require('../test-data/mockTimeEntries');
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

test('time-series returns zero-filled daily buckets for the selected range', async () => {
  await seedMockTimeEntries('basic');

  await request(app)
    .get('/api/analytics/time-series?from=2026-01-08&to=2026-01-12&bucket=day')
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual({
        bucket: 'day',
        from: '2026-01-08',
        to: '2026-01-12',
        buckets: [
          {
            periodStart: '2026-01-08',
            totalHours: 4.42,
            categories: [
              {
                categoryId: expect.any(String),
                categoryTitle: 'Work',
                hours: 2.58
              },
              {
                categoryId: expect.any(String),
                categoryTitle: 'Learning',
                hours: 1.83
              }
            ]
          },
          {
            periodStart: '2026-01-09',
            totalHours: 4.5,
            categories: [
              {
                categoryId: expect.any(String),
                categoryTitle: 'Work',
                hours: 2.75
              },
              {
                categoryId: expect.any(String),
                categoryTitle: 'Health',
                hours: 1.75
              }
            ]
          },
          {
            periodStart: '2026-01-10',
            totalHours: 7.92,
            categories: [
              {
                categoryId: expect.any(String),
                categoryTitle: 'Work',
                hours: 4.67
              },
              {
                categoryId: expect.any(String),
                categoryTitle: 'Health',
                hours: 3.25
              }
            ]
          },
          {
            periodStart: '2026-01-11',
            totalHours: 3.17,
            categories: [
              {
                categoryId: expect.any(String),
                categoryTitle: 'Learning',
                hours: 3.17
              }
            ]
          },
          {
            periodStart: '2026-01-12',
            totalHours: 0,
            categories: []
          }
        ]
      });
    });
});

test('time-series supports weekly bucketing', async () => {
  await seedMockTimeEntries('power');

  await request(app)
    .get('/api/analytics/time-series?from=2026-02-08&to=2026-03-15&bucket=week')
    .set('Authorization', 'Bearer test:power')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual({
        bucket: 'week',
        from: '2026-02-08',
        to: '2026-03-15',
        buckets: [
          { periodStart: '2026-02-08', totalHours: 23, categories: [expect.objectContaining({ categoryTitle: 'Work', hours: 23 })] },
          { periodStart: '2026-02-15', totalHours: 9, categories: [expect.objectContaining({ categoryTitle: 'Health', hours: 9 })] },
          { periodStart: '2026-02-22', totalHours: 11, categories: [expect.objectContaining({ categoryTitle: 'Learning', hours: 11 })] },
          { periodStart: '2026-03-01', totalHours: 4, categories: [expect.objectContaining({ categoryTitle: 'Admin', hours: 4 })] },
          { periodStart: '2026-03-08', totalHours: 7, categories: [expect.objectContaining({ categoryTitle: 'Creative', hours: 7 })] },
          { periodStart: '2026-03-15', totalHours: 3, categories: [expect.objectContaining({ categoryTitle: 'Relationships', hours: 3 })] }
        ]
      });
    });
});

test('time-series supports monthly bucketing', async () => {
  await seedMockTimeEntries('power');

  await request(app)
    .get('/api/analytics/time-series?from=2026-02-01&to=2026-03-31&bucket=month')
    .set('Authorization', 'Bearer test:power')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual({
        bucket: 'month',
        from: '2026-02-01',
        to: '2026-03-31',
        buckets: [
          {
            periodStart: '2026-02-01',
            totalHours: 43,
            categories: [
              expect.objectContaining({ categoryTitle: 'Work', hours: 23 }),
              expect.objectContaining({ categoryTitle: 'Learning', hours: 11 }),
              expect.objectContaining({ categoryTitle: 'Health', hours: 9 })
            ]
          },
          {
            periodStart: '2026-03-01',
            totalHours: 14,
            categories: [
              expect.objectContaining({ categoryTitle: 'Creative', hours: 7 }),
              expect.objectContaining({ categoryTitle: 'Admin', hours: 4 }),
              expect.objectContaining({ categoryTitle: 'Relationships', hours: 3 })
            ]
          }
        ]
      });
    });
});

test('time-series can filter returned category series while preserving bucket totals', async () => {
  const { categories } = await seedMockTimeEntries('basic');
  const workCategoryId = categories.find(
    (category) => category.title === 'Work'
  )._id.toString();

  await request(app)
    .get(`/api/analytics/time-series?from=2026-01-08&to=2026-01-12&bucket=day&categoryIds=${workCategoryId}`)
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual({
        bucket: 'day',
        from: '2026-01-08',
        to: '2026-01-12',
        buckets: [
          {
            periodStart: '2026-01-08',
            totalHours: 4.42,
            categories: [
              {
                categoryId: workCategoryId,
                categoryTitle: 'Work',
                hours: 2.58
              }
            ]
          },
          {
            periodStart: '2026-01-09',
            totalHours: 4.5,
            categories: [
              {
                categoryId: workCategoryId,
                categoryTitle: 'Work',
                hours: 2.75
              }
            ]
          },
          {
            periodStart: '2026-01-10',
            totalHours: 7.92,
            categories: [
              {
                categoryId: workCategoryId,
                categoryTitle: 'Work',
                hours: 4.67
              }
            ]
          },
          {
            periodStart: '2026-01-11',
            totalHours: 3.17,
            categories: []
          },
          {
            periodStart: '2026-01-12',
            totalHours: 0,
            categories: []
          }
        ]
      });
    });
});

test('time-series supports uncategorized category filtering', async () => {
  await seedMockTimeEntries('edge');

  await request(app)
    .get('/api/analytics/time-series?from=2026-03-08&to=2026-03-08&bucket=day&categoryIds=uncategorized')
    .set('Authorization', 'Bearer test:edge')
    .expect(200)
    .expect({
      bucket: 'day',
      from: '2026-03-08',
      to: '2026-03-08',
      buckets: [
        {
          periodStart: '2026-03-08',
          totalHours: 3.5,
          categories: [
            {
              categoryId: null,
              categoryTitle: 'Uncategorized',
              hours: 2
            }
          ]
        }
      ]
    });
});

test('time-series splits overnight time entries across daily buckets', async () => {
  await seedMockTimeEntries('edge');

  await request(app)
    .get('/api/analytics/time-series?from=2026-12-31&to=2027-01-01&bucket=day')
    .set('Authorization', 'Bearer test:edge')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual({
        bucket: 'day',
        from: '2026-12-31',
        to: '2027-01-01',
        buckets: [
          {
            periodStart: '2026-12-31',
            totalHours: 0.5,
            categories: [
              {
                categoryId: expect.any(String),
                categoryTitle: 'Learning',
                hours: 0.5
              }
            ]
          },
          {
            periodStart: '2027-01-01',
            totalHours: 2.75,
            categories: [
              {
                categoryId: expect.any(String),
                categoryTitle: 'Learning',
                hours: 2.75
              }
            ]
          }
        ]
      });
    });
});

test('time-series returns no data when no time entries exist in the selected range', async () => {
  await seedMockTasks('basic');

  await request(app)
    .get('/api/analytics/time-series?from=2026-01-08&to=2026-01-12&bucket=day')
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual({
        bucket: 'day',
        from: '2026-01-08',
        to: '2026-01-12',
        buckets: [
          {
            periodStart: '2026-01-08',
            totalHours: 0,
            categories: []
          },
          {
            periodStart: '2026-01-09',
            totalHours: 0,
            categories: []
          },
          {
            periodStart: '2026-01-10',
            totalHours: 0,
            categories: []
          },
          {
            periodStart: '2026-01-11',
            totalHours: 0,
            categories: []
          },
          {
            periodStart: '2026-01-12',
            totalHours: 0,
            categories: []
          }
        ]
      });
    });
});

test('time-series requires from and to parameters', async () => {
  await request(app)
    .get('/api/analytics/time-series')
    .set('Authorization', 'Bearer test:basic')
    .expect(400)
    .expect({
      error: 'from and to are required for time series analytics.'
    });
});

test('time-series rejects invalid bucket values', async () => {
  await request(app)
    .get('/api/analytics/time-series?from=2026-01-08&to=2026-01-12&bucket=hour')
    .set('Authorization', 'Bearer test:basic')
    .expect(400)
    .expect({
      error: 'bucket must be one of day, week, or month.'
    });
});

test('time-series rejects invalid category filters', async () => {
  await request(app)
    .get('/api/analytics/time-series?from=2026-01-08&to=2026-01-12&categoryIds=not-a-category-id')
    .set('Authorization', 'Bearer test:basic')
    .expect(400)
    .expect({
      error: 'categoryIds must contain comma-separated category ids or "uncategorized".'
    });
});
