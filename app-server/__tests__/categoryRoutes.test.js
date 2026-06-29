const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const createApp = require('../app');
const Category = require('../models/category');
const User = require('../models/user');
const { testAuthUsers } = require('../utils/testAuth');

jest.setTimeout(60000);

const originalAllowTestAuth = process.env.ALLOW_TEST_AUTH;

let app;
let mongoServer;

const createTestUser = async (persona) => {
  const payload = testAuthUsers[persona];
  return User.create({
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture
  });
};

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

test('category routes require authentication', async () => {
  await request(app)
    .get('/api/categories')
    .expect(401)
    .expect({ message: 'Missing auth token' });
});

test('category routes return categories in alphabetical order for the authenticated user', async () => {
  const user = await createTestUser('basic');

  await Category.create([
    {
      title: 'Wellness',
      description: 'Health work',
      userId: user._id
    },
    {
      title: 'Admin',
      description: 'Operations',
      userId: user._id
    },
    {
      title: 'Deep Work',
      description: 'Focus projects',
      userId: user._id
    }
  ]);

  await request(app)
    .get('/api/categories')
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body.map((category) => category.title)).toEqual([
        'Admin',
        'Deep Work',
        'Wellness'
      ]);
    });
});

test('category routes exclude categories owned by other users', async () => {
  const basicUser = await createTestUser('basic');
  const powerUser = await createTestUser('power');

  await Category.create([
    {
      title: 'Visible category',
      userId: basicUser._id
    },
    {
      title: 'Hidden category',
      userId: powerUser._id
    }
  ]);

  await request(app)
    .get('/api/categories')
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(1);
      expect(body[0].title).toBe('Visible category');
    });
});
