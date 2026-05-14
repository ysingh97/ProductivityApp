const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const createApp = require('../app');
const Category = require('../models/category');
const Goal = require('../models/goal');
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

test('goal read endpoints refresh stale cached time totals from descendant tasks', async () => {
  const { user, categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  const rootGoal = await Goal.create({
    title: 'Finish Website',
    description: 'Top-level goal',
    userId: user._id,
    category: workCategory._id,
    estimatedHours: 30,
    timeSpent: 0,
    timeLeft: 30
  });

  const childGoal = await Goal.create({
    title: 'Ship infrastructure',
    description: 'Nested goal',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: rootGoal._id,
    estimatedHours: 10,
    timeSpent: 0,
    timeLeft: 10
  });

  await Goal.updateOne({ _id: rootGoal._id }, { $addToSet: { subGoals: childGoal._id } });

  const directTask = await Task.create({
    title: 'Landing page polish',
    description: 'Direct root task',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: rootGoal._id,
    estimatedCompletionTime: 4,
    timeSpent: 2.5,
    timeLeft: 1.5,
    targetCompletionDate: new Date('2026-05-12T18:00:00.000Z')
  });

  const nestedTask = await Task.create({
    title: 'Add CI/CD pipeline',
    description: 'Child goal task',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: childGoal._id,
    estimatedCompletionTime: 2,
    timeSpent: 20.07,
    timeLeft: 0,
    targetCompletionDate: new Date('2026-05-16T18:00:00.000Z')
  });

  await Goal.updateOne({ _id: rootGoal._id }, { $addToSet: { subTasks: directTask._id } });
  await Goal.updateOne({ _id: childGoal._id }, { $addToSet: { subTasks: nestedTask._id } });

  await request(app)
    .get(`/api/goals/${rootGoal._id}`)
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        _id: String(rootGoal._id),
        title: 'Finish Website',
        timeSpent: 22.57,
        timeLeft: 7.43,
        estimatedHours: 30
      });
    });

  await request(app)
    .get('/api/goals')
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      const root = body.find((goal) => String(goal._id) === String(rootGoal._id));
      const child = body.find((goal) => String(goal._id) === String(childGoal._id));

      expect(root).toMatchObject({
        _id: String(rootGoal._id),
        timeSpent: 22.57,
        timeLeft: 7.43,
        estimatedHours: 30
      });
      expect(child).toMatchObject({
        _id: String(childGoal._id),
        timeSpent: 20.07,
        timeLeft: 0,
        estimatedHours: 10
      });
    });

  const persistedRootGoal = await Goal.findById(rootGoal._id).lean();
  const persistedChildGoal = await Goal.findById(childGoal._id).lean();

  expect(persistedRootGoal.timeSpent).toBe(22.57);
  expect(persistedRootGoal.timeLeft).toBe(7.43);
  expect(persistedChildGoal.timeSpent).toBe(20.07);
  expect(persistedChildGoal.timeLeft).toBe(0);
});

test('goal update endpoint refreshes old and new ancestor totals when parent changes', async () => {
  const { user, categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');
  const healthCategory = categories.find((category) => category.title === 'Health');

  const sourceRootGoal = await Goal.create({
    title: 'Source root',
    description: 'Old parent tree',
    userId: user._id,
    category: workCategory._id,
    estimatedHours: 20,
    timeSpent: 4.5,
    timeLeft: 15.5
  });

  const targetRootGoal = await Goal.create({
    title: 'Target root',
    description: 'New parent tree',
    userId: user._id,
    category: healthCategory._id,
    estimatedHours: 20,
    timeSpent: 0,
    timeLeft: 20
  });

  const movedGoal = await Goal.create({
    title: 'Moved child goal',
    description: 'Goal with timed task',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: sourceRootGoal._id,
    estimatedHours: 10,
    timeSpent: 4.5,
    timeLeft: 5.5
  });

  await Goal.updateOne(
    { _id: sourceRootGoal._id },
    { $addToSet: { subGoals: movedGoal._id } }
  );

  const movedTask = await Task.create({
    title: 'Timed child task',
    description: 'Task under moved goal',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: movedGoal._id,
    estimatedCompletionTime: 5,
    timeSpent: 4.5,
    timeLeft: 0.5,
    targetCompletionDate: new Date('2026-05-18T18:00:00.000Z')
  });

  await Goal.updateOne(
    { _id: movedGoal._id },
    { $addToSet: { subTasks: movedTask._id } }
  );

  await request(app)
    .put(`/api/goals/${movedGoal._id}`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      parentGoalId: String(targetRootGoal._id)
    })
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        _id: String(movedGoal._id),
        parentGoalId: String(targetRootGoal._id)
      });
      expect(body.category._id).toBe(String(healthCategory._id));
    });

  const refreshedSourceRoot = await Goal.findById(sourceRootGoal._id).lean();
  const refreshedTargetRoot = await Goal.findById(targetRootGoal._id).lean();
  const refreshedMovedGoal = await Goal.findById(movedGoal._id).lean();
  const refreshedMovedTask = await Task.findById(movedTask._id).lean();

  expect(refreshedSourceRoot.subGoals.map(String)).not.toContain(String(movedGoal._id));
  expect(refreshedSourceRoot.timeSpent).toBe(0);
  expect(refreshedSourceRoot.timeLeft).toBe(20);

  expect(refreshedTargetRoot.subGoals.map(String)).toContain(String(movedGoal._id));
  expect(refreshedTargetRoot.timeSpent).toBe(4.5);
  expect(refreshedTargetRoot.timeLeft).toBe(15.5);

  expect(refreshedMovedGoal.timeSpent).toBe(4.5);
  expect(refreshedMovedGoal.timeLeft).toBe(5.5);
  expect(String(refreshedMovedGoal.category)).toBe(String(healthCategory._id));
  expect(String(refreshedMovedTask.category)).toBe(String(healthCategory._id));
});
