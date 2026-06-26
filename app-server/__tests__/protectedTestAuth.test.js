const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const createApp = require('../app');
const User = require('../models/user');

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

test('protected routes accept enabled test auth tokens', async () => {
  await request(app)
    .get('/api/categories')
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect([]);

  const user = await User.findOne({ googleId: 'test-basic' });
  expect(user).toMatchObject({
    email: 'viz-basic@example.test',
    name: 'Viz Basic'
  });
});

test('protected routes reuse the same test auth user under concurrent requests', async () => {
  const [firstResponse, secondResponse] = await Promise.all([
    request(app)
      .get('/api/categories')
      .set('Authorization', 'Bearer test:basic'),
    request(app)
      .get('/api/categories')
      .set('Authorization', 'Bearer test:basic')
  ]);

  expect(firstResponse.status).toBe(200);
  expect(secondResponse.status).toBe(200);
  expect(await User.countDocuments({ googleId: 'test-basic' })).toBe(1);
});

test('protected routes still reject requests without auth tokens', async () => {
  await request(app)
    .get('/api/categories')
    .expect(401)
    .expect({ message: 'Missing auth token' });
});
