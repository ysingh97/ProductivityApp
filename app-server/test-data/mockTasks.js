const Task = require('../models/task');
const TimeEntry = require('../models/timeEntry');
const { seedMockCategories } = require('./mockCategories');

const fixedDate = (value) => new Date(value);

const mockTaskFixtures = {
  empty: [],
  basic: [
    {
      title: 'Deep work sprint',
      category: 'Work',
      timeSpent: 6,
      estimatedCompletionTime: 8,
      targetCompletionDate: fixedDate('2026-01-08T18:00:00.000Z')
    },
    {
      title: 'Project planning',
      category: 'Work',
      timeSpent: 4,
      estimatedCompletionTime: 5,
      targetCompletionDate: fixedDate('2026-01-10T18:00:00.000Z')
    },
    {
      title: 'Strength training',
      category: 'Health',
      timeSpent: 5,
      estimatedCompletionTime: 5,
      targetCompletionDate: fixedDate('2026-01-09T18:00:00.000Z')
    },
    {
      title: 'Read systems design notes',
      category: 'Learning',
      timeSpent: 5,
      estimatedCompletionTime: 6,
      targetCompletionDate: fixedDate('2026-01-11T18:00:00.000Z')
    }
  ],
  power: [
    {
      title: 'Client delivery',
      category: 'Work',
      timeSpent: 23,
      estimatedCompletionTime: 25,
      targetCompletionDate: fixedDate('2026-02-08T18:00:00.000Z')
    },
    {
      title: 'Running block',
      category: 'Health',
      timeSpent: 9,
      estimatedCompletionTime: 10,
      targetCompletionDate: fixedDate('2026-02-15T18:00:00.000Z')
    },
    {
      title: 'Course modules',
      category: 'Learning',
      timeSpent: 11,
      estimatedCompletionTime: 12,
      targetCompletionDate: fixedDate('2026-02-22T18:00:00.000Z')
    },
    {
      title: 'Inbox cleanup',
      category: 'Admin',
      timeSpent: 4,
      estimatedCompletionTime: 4,
      targetCompletionDate: fixedDate('2026-03-01T18:00:00.000Z')
    },
    {
      title: 'Writing session',
      category: 'Creative',
      timeSpent: 7,
      estimatedCompletionTime: 8,
      targetCompletionDate: fixedDate('2026-03-08T18:00:00.000Z')
    },
    {
      title: 'Family planning',
      category: 'Relationships',
      timeSpent: 3,
      estimatedCompletionTime: 3,
      targetCompletionDate: fixedDate('2026-03-15T18:00:00.000Z')
    }
  ],
  edge: [
    {
      title: 'Uncategorized legacy task',
      category: null,
      timeSpent: 2,
      estimatedCompletionTime: 0,
      targetCompletionDate: fixedDate('2026-03-08T09:30:00.000Z')
    },
    {
      title: 'DST boundary review',
      category: 'Work',
      timeSpent: 1.5,
      estimatedCompletionTime: 2,
      targetCompletionDate: fixedDate('2026-03-08T10:30:00.000Z')
    },
    {
      title: 'Year boundary study',
      category: 'Learning',
      timeSpent: 3.25,
      estimatedCompletionTime: 4,
      targetCompletionDate: fixedDate('2026-12-31T23:30:00.000Z')
    }
  ]
};

const seedMockTasks = async (persona, options = {}) => {
  const { includeTimeEntries = false } = options;
  const { user, categories } = await seedMockCategories(persona);
  const categoryByTitle = new Map(
    categories.map((category) => [category.title, category])
  );
  const taskFixtures = mockTaskFixtures[persona];

  if (!taskFixtures) {
    throw new Error(`Unknown mock persona: ${persona}`);
  }

  await Task.deleteMany({ userId: user._id });
  if (includeTimeEntries) {
    await TimeEntry.deleteMany({ userId: user._id });
  }

  const tasks = [];
  for (const taskFixture of taskFixtures) {
    const category = taskFixture.category
      ? categoryByTitle.get(taskFixture.category)
      : null;

    if (taskFixture.category && !category) {
      throw new Error(
        `Task fixture "${taskFixture.title}" references unknown category "${taskFixture.category}"`
      );
    }

    const task = await Task.create({
      title: taskFixture.title,
      description: 'Seeded mock task data',
      isComplete: false,
      estimatedCompletionTime: taskFixture.estimatedCompletionTime,
      timeLeft: Math.max(taskFixture.estimatedCompletionTime - taskFixture.timeSpent, 0),
      timeSpent: taskFixture.timeSpent,
      userId: user._id,
      category: category ? category._id : null,
      targetCompletionDate: taskFixture.targetCompletionDate,
      createdAt: taskFixture.targetCompletionDate
    });

    if (includeTimeEntries && taskFixture.timeSpent > 0) {
      const durationMinutes = taskFixture.timeSpent * 60;
      const endedAt = taskFixture.targetCompletionDate;
      const startedAt = new Date(endedAt.getTime() - durationMinutes * 60000);

      await TimeEntry.create({
        userId: user._id,
        taskId: task._id,
        category: category ? category._id : null,
        startedAt,
        endedAt,
        durationMinutes
      });
    }

    tasks.push(task);
  }

  return {
    user,
    categories,
    tasks
  };
};

module.exports = {
  mockTaskFixtures,
  seedMockTasks
};
