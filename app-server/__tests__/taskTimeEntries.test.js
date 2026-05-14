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

test('task time-entry endpoint creates a time entry and refreshes cached task totals', async () => {
  const { tasks } = await seedMockTasks('basic');
  const workTask = tasks.find((task) => task.title === 'Project planning');

  await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T09:15:00.000Z',
      endedAt: '2026-01-12T11:00:00.000Z'
    })
    .expect(201)
    .expect(({ body }) => {
      expect(body.timeEntry).toMatchObject({
        taskId: String(workTask._id),
        durationMinutes: 105
      });
      expect(body.task).toMatchObject({
        _id: String(workTask._id),
        timeSpent: 1.75,
        timeLeft: 3.25
      });
    });

  const persistedTask = await Task.findById(workTask._id).lean();
  const persistedEntries = await TimeEntry.find({ taskId: workTask._id }).lean();

  expect(persistedTask.timeSpent).toBe(1.75);
  expect(persistedTask.timeLeft).toBe(3.25);
  expect(persistedEntries).toHaveLength(1);
  expect(String(persistedEntries[0].category)).toBe(String(workTask.category));
});

test('task create endpoint ignores client supplied derived time totals', async () => {
  const { categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  await request(app)
    .post('/api/tasks')
    .set('Authorization', 'Bearer test:basic')
    .send({
      title: 'Write implementation notes',
      description: 'Task created through the API',
      category: workCategory.title,
      estimatedCompletionTime: 3.5,
      timeSpent: 99,
      timeLeft: 1,
      targetCompletionDate: new Date('2026-01-12T18:00:00.000Z')
    })
    .expect(201)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        title: 'Write implementation notes',
        estimatedCompletionTime: 3.5,
        timeSpent: 0,
        timeLeft: 3.5
      });
    });

  const persistedTask = await Task.findOne({ title: 'Write implementation notes' }).lean();

  expect(persistedTask.estimatedCompletionTime).toBe(3.5);
  expect(persistedTask.timeSpent).toBe(0);
  expect(persistedTask.timeLeft).toBe(3.5);
});

test('task update endpoint refreshes cached time left when estimate changes', async () => {
  const { tasks } = await seedMockTasks('basic');
  const workTask = tasks.find((task) => task.title === 'Project planning');

  await request(app)
    .put(`/api/tasks/${workTask._id}`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      estimatedCompletionTime: 6,
      timeSpent: 99,
      timeLeft: 99
    })
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        _id: String(workTask._id),
        estimatedCompletionTime: 6,
        timeSpent: 4,
        timeLeft: 2
      });
    });

  await request(app)
    .put(`/api/tasks/${workTask._id}`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      estimatedCompletionTime: 2,
      timeSpent: 99,
      timeLeft: 99
    })
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        _id: String(workTask._id),
        estimatedCompletionTime: 2,
        timeSpent: 4,
        timeLeft: 0
      });
    });

  const persistedTask = await Task.findById(workTask._id).lean();
  expect(persistedTask.timeSpent).toBe(4);
  expect(persistedTask.timeLeft).toBe(0);
});

test('task update endpoint refreshes old and new goal totals when parent goal changes', async () => {
  const { user, categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');
  const healthCategory = categories.find((category) => category.title === 'Health');

  const sourceRootGoal = await Goal.create({
    title: 'Source root',
    userId: user._id,
    category: workCategory._id,
    estimatedHours: 10,
    timeSpent: 3.25,
    timeLeft: 6.75
  });

  const sourceChildGoal = await Goal.create({
    title: 'Source child',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: sourceRootGoal._id,
    estimatedHours: 5,
    timeSpent: 3.25,
    timeLeft: 1.75
  });

  const targetRootGoal = await Goal.create({
    title: 'Target root',
    userId: user._id,
    category: healthCategory._id,
    estimatedHours: 10,
    timeSpent: 0,
    timeLeft: 10
  });

  const targetChildGoal = await Goal.create({
    title: 'Target child',
    userId: user._id,
    category: healthCategory._id,
    parentGoalId: targetRootGoal._id,
    estimatedHours: 5,
    timeSpent: 0,
    timeLeft: 5
  });

  await Goal.updateOne(
    { _id: sourceRootGoal._id },
    { $addToSet: { subGoals: sourceChildGoal._id } }
  );
  await Goal.updateOne(
    { _id: targetRootGoal._id },
    { $addToSet: { subGoals: targetChildGoal._id } }
  );

  const task = await Task.create({
    title: 'Movable task',
    description: 'Task with cached time',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: sourceChildGoal._id,
    estimatedCompletionTime: 4,
    timeSpent: 3.25,
    timeLeft: 0.75,
    targetCompletionDate: new Date('2026-01-12T18:00:00.000Z')
  });

  await Goal.updateOne(
    { _id: sourceChildGoal._id },
    { $addToSet: { subTasks: task._id } }
  );

  await request(app)
    .put(`/api/tasks/${task._id}`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      parentGoalId: String(targetChildGoal._id)
    })
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        _id: String(task._id),
        parentGoalId: String(targetChildGoal._id),
        timeSpent: 3.25,
        timeLeft: 0.75
      });
      expect(body.category._id).toBe(String(healthCategory._id));
    });

  const refreshedSourceRoot = await Goal.findById(sourceRootGoal._id).lean();
  const refreshedSourceChild = await Goal.findById(sourceChildGoal._id).lean();
  const refreshedTargetRoot = await Goal.findById(targetRootGoal._id).lean();
  const refreshedTargetChild = await Goal.findById(targetChildGoal._id).lean();

  expect(refreshedSourceRoot.timeSpent).toBe(0);
  expect(refreshedSourceRoot.timeLeft).toBe(10);
  expect(refreshedSourceChild.timeSpent).toBe(0);
  expect(refreshedSourceChild.timeLeft).toBe(5);
  expect(refreshedSourceChild.subTasks.map(String)).not.toContain(String(task._id));

  expect(refreshedTargetRoot.timeSpent).toBe(3.25);
  expect(refreshedTargetRoot.timeLeft).toBe(6.75);
  expect(refreshedTargetChild.timeSpent).toBe(3.25);
  expect(refreshedTargetChild.timeLeft).toBe(1.75);
  expect(refreshedTargetChild.subTasks.map(String)).toContain(String(task._id));
});

test('task delete endpoint removes time entries and refreshes parent goal totals', async () => {
  const { user, categories } = await seedMockCategories('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  const rootGoal = await Goal.create({
    title: 'Root goal',
    userId: user._id,
    category: workCategory._id,
    estimatedHours: 10,
    timeSpent: 3.25,
    timeLeft: 6.75
  });

  const childGoal = await Goal.create({
    title: 'Child goal',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: rootGoal._id,
    estimatedHours: 5,
    timeSpent: 3.25,
    timeLeft: 1.75
  });

  const list = await List.create({
    title: 'Implementation list',
    userId: user._id,
    tasks: []
  });

  const task = await Task.create({
    title: 'Delete me',
    description: 'Task with logged time',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: childGoal._id,
    listId: list._id,
    estimatedCompletionTime: 4,
    timeSpent: 3.25,
    timeLeft: 0.75,
    targetCompletionDate: new Date('2026-01-12T18:00:00.000Z')
  });

  await Goal.updateOne(
    { _id: rootGoal._id },
    { $addToSet: { subGoals: childGoal._id } }
  );
  await Goal.updateOne(
    { _id: childGoal._id },
    { $addToSet: { subTasks: task._id } }
  );
  await List.updateOne(
    { _id: list._id },
    { $addToSet: { tasks: task._id } }
  );
  await TimeEntry.create({
    userId: user._id,
    taskId: task._id,
    category: workCategory._id,
    startedAt: new Date('2026-01-12T08:00:00.000Z'),
    endedAt: new Date('2026-01-12T11:15:00.000Z'),
    durationMinutes: 195
  });

  await request(app)
    .delete(`/api/tasks/${task._id}`)
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        message: 'Task deleted successfully',
        deletedTimeEntryCount: 1
      });
      expect(body.deletedTask._id).toBe(String(task._id));
    });

  const persistedTask = await Task.findById(task._id).lean();
  const persistedTimeEntries = await TimeEntry.find({ taskId: task._id }).lean();
  const refreshedRootGoal = await Goal.findById(rootGoal._id).lean();
  const refreshedChildGoal = await Goal.findById(childGoal._id).lean();
  const refreshedList = await List.findById(list._id).lean();

  expect(persistedTask).toBeNull();
  expect(persistedTimeEntries).toHaveLength(0);
  expect(refreshedRootGoal.timeSpent).toBe(0);
  expect(refreshedRootGoal.timeLeft).toBe(10);
  expect(refreshedChildGoal.timeSpent).toBe(0);
  expect(refreshedChildGoal.timeLeft).toBe(5);
  expect(refreshedChildGoal.subTasks.map(String)).not.toContain(String(task._id));
  expect(refreshedList.tasks.map(String)).not.toContain(String(task._id));
});

test('task time-entry endpoint lists time entries newest first for the task owner', async () => {
  const { tasks } = await seedMockTasks('basic');
  const workTask = tasks.find((task) => task.title === 'Project planning');

  await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T07:00:00.000Z',
      endedAt: '2026-01-12T08:00:00.000Z'
    })
    .expect(201);

  await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T09:15:00.000Z',
      endedAt: '2026-01-12T11:00:00.000Z'
    })
    .expect(201);

  await request(app)
    .get(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toHaveLength(2);
      expect(body[0]).toMatchObject({
        taskId: String(workTask._id),
        durationMinutes: 105
      });
      expect(body[1]).toMatchObject({
        taskId: String(workTask._id),
        durationMinutes: 60
      });
      expect(new Date(body[0].endedAt).getTime())
        .toBeGreaterThan(new Date(body[1].endedAt).getTime());
    });
});

test('task time-entry delete endpoint removes the entry and refreshes cached task totals', async () => {
  const { tasks } = await seedMockTasks('basic');
  const workTask = tasks.find((task) => task.title === 'Project planning');

  await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T07:00:00.000Z',
      endedAt: '2026-01-12T08:00:00.000Z'
    })
    .expect(201);

  const createdEntry = await TimeEntry.findOne({ taskId: workTask._id }).lean();

  await request(app)
    .delete(`/api/tasks/${workTask._id}/time-entries/${createdEntry._id}`)
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body.deletedTimeEntry).toMatchObject({
        _id: String(createdEntry._id)
      });
      expect(body.task).toMatchObject({
        _id: String(workTask._id),
        timeSpent: 0,
        timeLeft: 5
      });
    });

  const persistedEntries = await TimeEntry.find({ taskId: workTask._id }).lean();
  const persistedTask = await Task.findById(workTask._id).lean();

  expect(persistedEntries).toHaveLength(0);
  expect(persistedTask.timeSpent).toBe(0);
  expect(persistedTask.timeLeft).toBe(5);
});

test('task time-entry update endpoint edits the range and refreshes cached task totals', async () => {
  const { tasks } = await seedMockTasks('basic');
  const workTask = tasks.find((task) => task.title === 'Project planning');

  await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T07:00:00.000Z',
      endedAt: '2026-01-12T08:00:00.000Z'
    })
    .expect(201);

  const createdEntry = await TimeEntry.findOne({ taskId: workTask._id }).lean();

  await request(app)
    .put(`/api/tasks/${workTask._id}/time-entries/${createdEntry._id}`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T07:15:00.000Z',
      endedAt: '2026-01-12T09:00:00.000Z'
    })
    .expect(200)
    .expect(({ body }) => {
      expect(body.timeEntry).toMatchObject({
        _id: String(createdEntry._id),
        durationMinutes: 105
      });
      expect(body.task).toMatchObject({
        _id: String(workTask._id),
        timeSpent: 1.75,
        timeLeft: 3.25
      });
    });

  const persistedEntry = await TimeEntry.findById(createdEntry._id).lean();
  const persistedTask = await Task.findById(workTask._id).lean();

  expect(persistedEntry.durationMinutes).toBe(105);
  expect(new Date(persistedEntry.startedAt).toISOString()).toBe('2026-01-12T07:15:00.000Z');
  expect(new Date(persistedEntry.endedAt).toISOString()).toBe('2026-01-12T09:00:00.000Z');
  expect(persistedTask.timeSpent).toBe(1.75);
  expect(persistedTask.timeLeft).toBe(3.25);
});

test('task time-entry mutations refresh parent-goal totals through the ancestor chain', async () => {
  const { user, categories } = await seedMockTasks('basic');
  const workCategory = categories.find((category) => category.title === 'Work');

  const rootGoal = await Goal.create({
    title: 'Career growth',
    description: 'Seeded parent goal',
    userId: user._id,
    category: workCategory._id,
    estimatedHours: 12,
    timeLeft: 12
  });

  const childGoal = await Goal.create({
    title: 'Ship major project',
    description: 'Seeded child goal',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: rootGoal._id,
    estimatedHours: 10,
    timeLeft: 10
  });

  const workTask = await Task.create({
    title: 'Goal-linked execution',
    description: 'Seeded goal-linked task',
    userId: user._id,
    category: workCategory._id,
    parentGoalId: childGoal._id,
    estimatedCompletionTime: 5,
    timeLeft: 5,
    timeSpent: 0,
    targetCompletionDate: new Date('2026-01-12T18:00:00.000Z')
  });

  const createResponse = await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T07:00:00.000Z',
      endedAt: '2026-01-12T08:45:00.000Z'
    })
    .expect(201);

  expect(createResponse.body.task.timeSpent).toBe(1.75);

  let refreshedChildGoal = await Goal.findById(childGoal._id).lean();
  let refreshedRootGoal = await Goal.findById(rootGoal._id).lean();

  expect(refreshedChildGoal.timeSpent).toBe(1.75);
  expect(refreshedChildGoal.timeLeft).toBe(8.25);
  expect(refreshedRootGoal.timeSpent).toBe(1.75);
  expect(refreshedRootGoal.timeLeft).toBe(10.25);

  const createdEntry = await TimeEntry.findOne({ taskId: workTask._id }).lean();

  await request(app)
    .put(`/api/tasks/${workTask._id}/time-entries/${createdEntry._id}`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T07:30:00.000Z',
      endedAt: '2026-01-12T09:30:00.000Z'
    })
    .expect(200)
    .expect(({ body }) => {
      expect(body.task.timeSpent).toBe(2);
    });

  refreshedChildGoal = await Goal.findById(childGoal._id).lean();
  refreshedRootGoal = await Goal.findById(rootGoal._id).lean();

  expect(refreshedChildGoal.timeSpent).toBe(2);
  expect(refreshedChildGoal.timeLeft).toBe(8);
  expect(refreshedRootGoal.timeSpent).toBe(2);
  expect(refreshedRootGoal.timeLeft).toBe(10);

  await request(app)
    .delete(`/api/tasks/${workTask._id}/time-entries/${createdEntry._id}`)
    .set('Authorization', 'Bearer test:basic')
    .expect(200)
    .expect(({ body }) => {
      expect(body.task.timeSpent).toBe(0);
    });

  refreshedChildGoal = await Goal.findById(childGoal._id).lean();
  refreshedRootGoal = await Goal.findById(rootGoal._id).lean();

  expect(refreshedChildGoal.timeSpent).toBe(0);
  expect(refreshedChildGoal.timeLeft).toBe(10);
  expect(refreshedRootGoal.timeSpent).toBe(0);
  expect(refreshedRootGoal.timeLeft).toBe(12);
});

test('task time-entry endpoint is idempotent for duplicate task/start/end submissions', async () => {
  const { tasks } = await seedMockTasks('basic');
  const workTask = tasks.find((task) => task.title === 'Project planning');
  const payload = {
    startedAt: '2026-01-12T09:15:00.000Z',
    endedAt: '2026-01-12T10:15:00.000Z'
  };

  await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send(payload)
    .expect(201)
    .expect(({ body }) => {
      expect(body.duplicate).toBe(false);
      expect(body.task.timeSpent).toBe(1);
    });

  await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send(payload)
    .expect(200)
    .expect(({ body }) => {
      expect(body.duplicate).toBe(true);
      expect(body.task.timeSpent).toBe(1);
    });

  const persistedEntries = await TimeEntry.find({ taskId: workTask._id }).lean();
  expect(persistedEntries).toHaveLength(1);
});

test('task time-entry update endpoint rejects exact duplicate collisions', async () => {
  const { tasks } = await seedMockTasks('basic');
  const workTask = tasks.find((task) => task.title === 'Project planning');

  await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T07:00:00.000Z',
      endedAt: '2026-01-12T08:00:00.000Z'
    })
    .expect(201);

  await request(app)
    .post(`/api/tasks/${workTask._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T09:15:00.000Z',
      endedAt: '2026-01-12T10:15:00.000Z'
    })
    .expect(201);

  const entries = await TimeEntry.find({ taskId: workTask._id }).sort({ startedAt: 1 }).lean();

  await request(app)
    .put(`/api/tasks/${workTask._id}/time-entries/${entries[1]._id}`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T07:00:00.000Z',
      endedAt: '2026-01-12T08:00:00.000Z'
    })
    .expect(409)
    .expect({
      error: 'A matching time entry already exists for this task.'
    });
});

test('task time-entry endpoint rejects invalid timestamps', async () => {
  const { tasks } = await seedMockTasks('basic');

  await request(app)
    .post(`/api/tasks/${tasks[0]._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: 'not-a-date',
      endedAt: '2026-01-12T11:00:00.000Z'
    })
    .expect(400)
    .expect({
      error: 'startedAt and endedAt must be valid ISO date-time values.'
    });
});

test('task time-entry endpoint rejects reversed ranges', async () => {
  const { tasks } = await seedMockTasks('basic');

  await request(app)
    .post(`/api/tasks/${tasks[0]._id}/time-entries`)
    .set('Authorization', 'Bearer test:basic')
    .send({
      startedAt: '2026-01-12T11:00:00.000Z',
      endedAt: '2026-01-12T09:15:00.000Z'
    })
    .expect(400)
    .expect({
      error: 'endedAt must be after startedAt.'
    });
});

test('task time-entry endpoint is isolated by user', async () => {
  const { tasks } = await seedMockTasks('basic');

  await request(app)
    .post(`/api/tasks/${tasks[0]._id}/time-entries`)
    .set('Authorization', 'Bearer test:empty')
    .send({
      startedAt: '2026-01-12T09:15:00.000Z',
      endedAt: '2026-01-12T11:00:00.000Z'
    })
    .expect(404)
    .expect({ message: 'Task not found' });

  await request(app)
    .get(`/api/tasks/${tasks[0]._id}/time-entries`)
    .set('Authorization', 'Bearer test:empty')
    .expect(404)
    .expect({ message: 'Task not found' });

  await request(app)
    .delete(`/api/tasks/${tasks[0]._id}/time-entries/${new mongoose.Types.ObjectId()}`)
    .set('Authorization', 'Bearer test:empty')
    .expect(404)
    .expect({ message: 'Task not found' });

  await request(app)
    .put(`/api/tasks/${tasks[0]._id}/time-entries/${new mongoose.Types.ObjectId()}`)
    .set('Authorization', 'Bearer test:empty')
    .send({
      startedAt: '2026-01-12T09:15:00.000Z',
      endedAt: '2026-01-12T10:15:00.000Z'
    })
    .expect(404)
    .expect({ message: 'Task not found' });
});
