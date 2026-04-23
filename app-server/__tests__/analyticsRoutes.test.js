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
