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

const createTimeEntryForTask = ({ user, task, category, startedAt, hours }) => {
  const startDate = new Date(startedAt);
  const durationMinutes = hours * 60;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  return TimeEntry.create({
    userId: user._id,
    taskId: task._id,
    category: category._id,
    startedAt: startDate,
    endedAt: endDate,
    durationMinutes
  });
};

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

  await createTimeEntryForTask({
    user,
    task: directTask,
    category: workCategory,
    startedAt: '2026-05-12T08:00:00.000Z',
    hours: 2.5
  });
  await createTimeEntryForTask({
    user,
    task: nestedTask,
    category: workCategory,
    startedAt: '2026-05-16T08:00:00.000Z',
    hours: 20.07
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

test('goal read endpoint derives totals from time entries instead of stale task cache', async () => {
  const { user, categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  const goal = await Goal.create({
    title: 'Time-entry backed goal',
    description: 'Goal with stale task cache',
    userId: user._id,
    category: workCategory._id,
    estimatedHours: 5,
    timeSpent: 99,
    timeLeft: 0
  });

  const task = await Task.create({
    title: 'Task with stale cache',
    description: 'Task cache should not drive goal totals',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: goal._id,
    estimatedCompletionTime: 5,
    timeSpent: 99,
    timeLeft: 0,
    targetCompletionDate: new Date('2026-05-16T18:00:00.000Z')
  });

  await createTimeEntryForTask({
    user,
    task,
    category: workCategory,
    startedAt: '2026-05-16T08:00:00.000Z',
    hours: 1.25
  });
  await Goal.updateOne({ _id: goal._id }, { $addToSet: { subTasks: task._id } });

  await request(app)
    .get(`/api/goals/${goal._id}`)
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        _id: String(goal._id),
        timeSpent: 1.25,
        timeLeft: 3.75,
        estimatedHours: 5
      });
    });

  const persistedGoal = await Goal.findById(goal._id).lean();

  expect(persistedGoal.timeSpent).toBe(1.25);
  expect(persistedGoal.timeLeft).toBe(3.75);
});

test('goal create endpoint ignores client supplied derived time totals', async () => {
  const { categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  await request(app)
    .post('/api/goals')
    .set('Authorization', 'Bearer test:basic')
    .send({
      title: 'Finish Website',
      description: 'Top-level goal',
      category: workCategory.title,
      estimatedHours: 8,
      timeSpent: 99,
      timeLeft: 1
    })
    .expect(201)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        title: 'Finish Website',
        estimatedHours: 8,
        timeSpent: 0,
        timeLeft: 8
      });
    });

  const persistedGoal = await Goal.findOne({ title: 'Finish Website' }).lean();

  expect(persistedGoal.estimatedHours).toBe(8);
  expect(persistedGoal.timeSpent).toBe(0);
  expect(persistedGoal.timeLeft).toBe(8);
});

test('goal update endpoint returns refreshed time totals when estimate changes', async () => {
  const { user, categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  const goal = await Goal.create({
    title: 'Finish Website',
    description: 'Top-level goal',
    userId: user._id,
    category: workCategory._id,
    estimatedHours: 5,
    timeSpent: 0,
    timeLeft: 5
  });

  const task = await Task.create({
    title: 'Add CI/CD pipeline',
    description: 'Task with logged time',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: goal._id,
    estimatedCompletionTime: 5,
    timeSpent: 3.25,
    timeLeft: 1.75,
    targetCompletionDate: new Date('2026-05-16T18:00:00.000Z')
  });

  await createTimeEntryForTask({
    user,
    task,
    category: workCategory,
    startedAt: '2026-05-16T08:00:00.000Z',
    hours: 3.25
  });

  await Goal.updateOne({ _id: goal._id }, { $addToSet: { subTasks: task._id } });

  await request(app)
    .put(`/api/goals/${goal._id}`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      estimatedHours: 10,
      timeSpent: 99,
      timeLeft: 99
    })
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        _id: String(goal._id),
        estimatedHours: 10,
        timeSpent: 3.25,
        timeLeft: 6.75
      });
    });

  const persistedGoal = await Goal.findById(goal._id).lean();

  expect(persistedGoal.estimatedHours).toBe(10);
  expect(persistedGoal.timeSpent).toBe(3.25);
  expect(persistedGoal.timeLeft).toBe(6.75);
});

test('goal update endpoint syncs descendant time-entry categories when category changes', async () => {
  const { user, categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');
  const healthCategory = categories.find((category) => category.title === 'Health');

  const rootGoal = await Goal.create({
    title: 'Root category goal',
    description: 'Top-level goal',
    userId: user._id,
    category: workCategory._id,
    estimatedHours: 10,
    timeSpent: 1.5,
    timeLeft: 8.5
  });

  const childGoal = await Goal.create({
    title: 'Child category goal',
    description: 'Nested goal',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: rootGoal._id,
    estimatedHours: 5,
    timeSpent: 1.5,
    timeLeft: 3.5
  });

  const task = await Task.create({
    title: 'Descendant task',
    description: 'Task under child goal',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: childGoal._id,
    estimatedCompletionTime: 3,
    timeSpent: 1.5,
    timeLeft: 1.5,
    targetCompletionDate: new Date('2026-05-16T18:00:00.000Z')
  });

  const timeEntry = await createTimeEntryForTask({
    user,
    task,
    category: workCategory,
    startedAt: '2026-05-16T08:00:00.000Z',
    hours: 1.5
  });

  await Goal.updateOne({ _id: rootGoal._id }, { $addToSet: { subGoals: childGoal._id } });
  await Goal.updateOne({ _id: childGoal._id }, { $addToSet: { subTasks: task._id } });

  await request(app)
    .put(`/api/goals/${rootGoal._id}`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      category: healthCategory.title
    })
    .expect(200)
    .expect(({ body }) => {
      expect(body.category._id).toBe(String(healthCategory._id));
      expect(body.timeSpent).toBe(1.5);
      expect(body.timeLeft).toBe(8.5);
    });

  const refreshedChildGoal = await Goal.findById(childGoal._id).lean();
  const refreshedTask = await Task.findById(task._id).lean();
  const refreshedTimeEntry = await TimeEntry.findById(timeEntry._id).lean();

  expect(String(refreshedChildGoal.category)).toBe(String(healthCategory._id));
  expect(String(refreshedTask.category)).toBe(String(healthCategory._id));
  expect(String(refreshedTimeEntry.category)).toBe(String(healthCategory._id));
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

  await createTimeEntryForTask({
    user,
    task: movedTask,
    category: workCategory,
    startedAt: '2026-05-18T08:00:00.000Z',
    hours: 4.5
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
  const refreshedMovedTimeEntry = await TimeEntry.findOne({ taskId: movedTask._id }).lean();

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
  expect(String(refreshedMovedTimeEntry.category)).toBe(String(healthCategory._id));
});

test('goal delete endpoint detaches direct child tasks and refreshes old parent totals', async () => {
  const { user, categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  const rootGoal = await Goal.create({
    title: 'Root goal',
    description: 'Top-level parent',
    userId: user._id,
    category: workCategory._id,
    estimatedHours: 10,
    timeSpent: 3.5,
    timeLeft: 6.5
  });

  const goalToDelete = await Goal.create({
    title: 'Delete this goal',
    description: 'Child being deleted',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: rootGoal._id,
    estimatedHours: 5,
    timeSpent: 3.5,
    timeLeft: 1.5
  });

  const detachedChildGoal = await Goal.create({
    title: 'Detach this child',
    description: 'Nested child should survive',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: goalToDelete._id,
    estimatedHours: 2,
    timeSpent: 2,
    timeLeft: 0
  });

  const directTask = await Task.create({
    title: 'Direct task',
    description: 'Task directly under deleted goal',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: goalToDelete._id,
    estimatedCompletionTime: 3,
    timeSpent: 1.5,
    timeLeft: 1.5,
    targetCompletionDate: new Date('2026-05-18T18:00:00.000Z')
  });

  const nestedTask = await Task.create({
    title: 'Nested surviving task',
    description: 'Task under surviving child goal',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: detachedChildGoal._id,
    estimatedCompletionTime: 2,
    timeSpent: 2,
    timeLeft: 0,
    targetCompletionDate: new Date('2026-05-18T18:00:00.000Z')
  });

  await createTimeEntryForTask({
    user,
    task: directTask,
    category: workCategory,
    startedAt: '2026-05-18T08:00:00.000Z',
    hours: 1.5
  });
  await createTimeEntryForTask({
    user,
    task: nestedTask,
    category: workCategory,
    startedAt: '2026-05-18T10:00:00.000Z',
    hours: 2
  });

  await Goal.updateOne({ _id: rootGoal._id }, { $addToSet: { subGoals: goalToDelete._id } });
  await Goal.updateOne(
    { _id: goalToDelete._id },
    {
      $addToSet: {
        subGoals: detachedChildGoal._id,
        subTasks: directTask._id
      }
    }
  );
  await Goal.updateOne(
    { _id: detachedChildGoal._id },
    { $addToSet: { subTasks: nestedTask._id } }
  );

  await request(app)
    .delete(`/api/goals/${goalToDelete._id}`)
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body.message).toBe('Goal deleted');
      expect(body.deletedTask._id).toBe(String(goalToDelete._id));
    });

  const deletedGoal = await Goal.findById(goalToDelete._id).lean();
  const refreshedRootGoal = await Goal.findById(rootGoal._id).lean();
  const refreshedDetachedChildGoal = await Goal.findById(detachedChildGoal._id).lean();
  const refreshedDirectTask = await Task.findById(directTask._id).lean();
  const refreshedNestedTask = await Task.findById(nestedTask._id).lean();

  expect(deletedGoal).toBeNull();
  expect(refreshedRootGoal.subGoals.map(String)).not.toContain(String(goalToDelete._id));
  expect(refreshedRootGoal.timeSpent).toBe(0);
  expect(refreshedRootGoal.timeLeft).toBe(10);
  expect(refreshedDetachedChildGoal.parentGoalId).toBeNull();
  expect(refreshedDirectTask.parentGoalId).toBeNull();
  expect(String(refreshedNestedTask.parentGoalId)).toBe(String(detachedChildGoal._id));
});
