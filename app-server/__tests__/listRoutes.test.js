const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const createApp = require('../app');
const Goal = require('../models/goal');
const List = require('../models/list');
const Task = require('../models/task');
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
  await Task.deleteMany({});
  await List.deleteMany({});
  await Goal.deleteMany({});
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

test('list create endpoint ignores client supplied task membership', async () => {
  const { user, categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  const task = await Task.create({
    title: 'Injected task',
    description: 'Task that should not be attached by list creation',
    userId: user._id,
    category: workCategory._id,
    estimatedCompletionTime: 1,
    timeSpent: 0,
    timeLeft: 1,
    targetCompletionDate: new Date('2026-01-12T18:00:00.000Z')
  });

  await request(app)
    .post('/api/lists')
    .set('Authorization', 'Bearer test:basic')
    .send({
      title: 'Implementation list',
      description: 'List created through API',
      tasks: [String(task._id)]
    })
    .expect(201)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        title: 'Implementation list',
        tasks: []
      });
    });

  const persistedList = await List.findOne({ title: 'Implementation list' }).lean();

  expect(persistedList.tasks).toEqual([]);
});

test('list create endpoint validates goal ownership', async () => {
  const { user, categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  const goal = await Goal.create({
    title: 'Owned goal',
    description: 'Goal owned by basic persona',
    userId: user._id,
    category: workCategory._id,
    estimatedHours: 5,
    timeSpent: 0,
    timeLeft: 5
  });

  await request(app)
    .post('/api/lists')
    .set('Authorization', 'Bearer test:empty')
    .send({
      title: 'Invalid cross-user list',
      goalId: String(goal._id)
    })
    .expect(400)
    .expect({
      message: 'Invalid goal for this user'
    });
});
