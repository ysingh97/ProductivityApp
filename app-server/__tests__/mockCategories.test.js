const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const createApp = require('../app');
const Category = require('../models/category');
const User = require('../models/user');
const { seedMockCategories } = require('../test-data/mockCategories');

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

test('seedMockCategories creates deterministic categories for a mock account', async () => {
  const { user, categories } = await seedMockCategories('basic');

  expect(user).toMatchObject({
    googleId: 'test-basic',
    email: 'viz-basic@example.test'
  });
  expect(categories.map((category) => category.title)).toEqual([
    'Work',
    'Health',
    'Learning'
  ]);
});

test('mock category data is visible through protected routes for the matching persona', async () => {
  await seedMockCategories('basic');

  await request(app)
    .get('/api/categories')
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body.map((category) => category.title)).toEqual([
        'Health',
        'Learning',
        'Work'
      ]);
    });
});

test('mock category data remains isolated between personas', async () => {
  await seedMockCategories('basic');
  await seedMockCategories('empty');

  await request(app)
    .get('/api/categories')
    .set('Authorization', 'Bearer test:empty')
    .expect(200)
    .expect([]);
});
