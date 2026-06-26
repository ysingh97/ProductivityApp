const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const createApp = require('../app');
const Category = require('../models/category');
const Goal = require('../models/goal');
const List = require('../models/list');
const Task = require('../models/task');
const TimeEntry = require('../models/timeEntry');
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
  await TimeEntry.deleteMany({});
  await Task.deleteMany({});
  await List.deleteMany({});
  await Goal.deleteMany({});
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

test('goal routes reject malformed goal ids and malformed parent ids', async () => {
  const { categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  await request(app)
    .post('/api/goals')
    .set('Authorization', 'Bearer test:basic')
    .send({
      title: 'Malformed parent goal',
      category: workCategory.title,
      estimatedHours: 3,
      parentGoalId: 'not-an-id'
    })
    .expect(400)
    .expect({ message: 'Invalid parentGoal ID' });

  await request(app)
    .get('/api/goals/not-an-id')
    .set('Authorization', 'Bearer test:basic')
    .expect(400)
    .expect({ message: 'Invalid goal ID' });

  await request(app)
    .put('/api/goals/not-an-id')
    .set('Authorization', 'Bearer test:basic')
    .send({ title: 'Still invalid' })
    .expect(400)
    .expect({ message: 'Invalid goal ID' });

  await request(app)
    .delete('/api/goals/not-an-id')
    .set('Authorization', 'Bearer test:basic')
    .expect(400)
    .expect({ message: 'Invalid goal ID' });
});

test('goal update rejects self-parenting', async () => {
  const { user, categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  const goal = await Goal.create({
    title: 'Self-parent test',
    userId: user._id,
    category: workCategory._id,
    estimatedHours: 4,
    timeSpent: 0,
    timeLeft: 4
  });

  await request(app)
    .put(`/api/goals/${goal._id}`)
    .set('Authorization', 'Bearer test:basic')
    .send({ parentGoalId: String(goal._id) })
    .expect(400)
    .expect({ message: 'Goal cannot be its own parent' });
});

test('task routes reject malformed task ids and malformed relationship ids', async () => {
  const { categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer test:basic')
    .send({
      title: 'Malformed list task',
      category: workCategory.title,
      estimatedCompletionTime: 2,
      targetCompletionDate: '2026-01-12T18:00:00.000Z',
      listId: 'not-an-id'
    })
    .expect(400)
    .expect({ message: 'Invalid list for this user' });

  await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer test:basic')
    .send({
      title: 'Malformed parent task',
      category: workCategory.title,
      estimatedCompletionTime: 2,
      targetCompletionDate: '2026-01-12T18:00:00.000Z',
      parentGoalId: 'not-an-id'
    })
    .expect(400)
    .expect({ message: 'Invalid parentGoal ID' });

  await request(app)
    .get('/api/tasks/not-an-id')
    .set('Authorization', 'Bearer test:basic')
    .expect(400)
    .expect({ message: 'Invalid task ID' });

  await request(app)
    .put('/api/tasks/not-an-id')
    .set('Authorization', 'Bearer test:basic')
    .send({ title: 'Still invalid' })
    .expect(400)
    .expect({ message: 'Invalid task ID' });

  await request(app)
    .delete('/api/tasks/not-an-id')
    .set('Authorization', 'Bearer test:basic')
    .expect(400)
    .expect({ message: 'Invalid task ID' });

  await request(app)
    .get('/api/tasks/list/not-an-id')
    .set('Authorization', 'Bearer test:basic')
    .expect(400)
    .expect({ message: 'Invalid list ID' });
});

test('task time-entry routes reject malformed task and entry ids', async () => {
  const { user, categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  const task = await Task.create({
    title: 'Time entry validation task',
    userId: user._id,
    category: workCategory._id,
    estimatedCompletionTime: 2,
    timeSpent: 0,
    timeLeft: 2,
    targetCompletionDate: new Date('2026-01-12T18:00:00.000Z')
  });

  await request(app)
    .post('/api/tasks/not-an-id/time-entries')
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T09:00:00.000Z',
      endedAt: '2026-01-12T10:00:00.000Z'
    })
    .expect(400)
    .expect({ message: 'Invalid task ID' });

  await request(app)
    .put(`/api/tasks/${task._id}/time-entries/not-an-id`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T09:00:00.000Z',
      endedAt: '2026-01-12T10:00:00.000Z'
    })
    .expect(400)
    .expect({ message: 'Invalid time entry ID' });

  await request(app)
    .delete(`/api/tasks/${task._id}/time-entries/not-an-id`)
    .set('Authorization', 'Bearer test:basic')
    .expect(400)
    .expect({ message: 'Invalid time entry ID' });
});

test('list routes reject malformed goal ids', async () => {
  await seedMockCategories('basic');

  await request(app)
    .post('/api/lists')
    .set('Authorization', 'Bearer test:basic')
    .send({
      title: 'Malformed goal list',
      goalId: 'not-an-id'
    })
    .expect(400)
    .expect({ message: 'Invalid goal for this user' });

  await request(app)
    .get('/api/lists/not-an-id')
    .set('Authorization', 'Bearer test:basic')
    .expect(400)
    .expect({ message: 'Invalid goal ID' });
});
