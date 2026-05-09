const TimeEntry = require('../models/timeEntry');
const { seedMockTasks } = require('./mockTasks');

const fixedDate = (value) => new Date(value);

const mockTimeEntryFixtures = {
  empty: [],
  basic: [
    {
      taskTitle: 'Deep work sprint',
      category: 'Work',
      startedAt: fixedDate('2026-01-08T09:10:00.000Z'),
      endedAt: fixedDate('2026-01-08T11:45:00.000Z')
    },
    {
      taskTitle: 'Read systems design notes',
      category: 'Learning',
      startedAt: fixedDate('2026-01-08T13:05:00.000Z'),
      endedAt: fixedDate('2026-01-08T14:55:00.000Z')
    },
    {
      taskTitle: 'Strength training',
      category: 'Health',
      startedAt: fixedDate('2026-01-09T07:20:00.000Z'),
      endedAt: fixedDate('2026-01-09T09:05:00.000Z')
    },
    {
      taskTitle: 'Project planning',
      category: 'Work',
      startedAt: fixedDate('2026-01-09T10:15:00.000Z'),
      endedAt: fixedDate('2026-01-09T13:00:00.000Z')
    },
    {
      taskTitle: 'Deep work sprint',
      category: 'Work',
      startedAt: fixedDate('2026-01-10T09:30:00.000Z'),
      endedAt: fixedDate('2026-01-10T14:10:00.000Z')
    },
    {
      taskTitle: 'Strength training',
      category: 'Health',
      startedAt: fixedDate('2026-01-10T16:10:00.000Z'),
      endedAt: fixedDate('2026-01-10T19:25:00.000Z')
    },
    {
      taskTitle: 'Read systems design notes',
      category: 'Learning',
      startedAt: fixedDate('2026-01-11T11:15:00.000Z'),
      endedAt: fixedDate('2026-01-11T14:25:00.000Z')
    }
  ],
  power: [
    {
      taskTitle: 'Client delivery',
      category: 'Work',
      startedAt: fixedDate('2026-02-08T09:00:00.000Z'),
      endedAt: fixedDate('2026-02-08T15:00:00.000Z')
    },
    {
      taskTitle: 'Client delivery',
      category: 'Work',
      startedAt: fixedDate('2026-02-10T09:00:00.000Z'),
      endedAt: fixedDate('2026-02-10T17:00:00.000Z')
    },
    {
      taskTitle: 'Client delivery',
      category: 'Work',
      startedAt: fixedDate('2026-02-12T10:00:00.000Z'),
      endedAt: fixedDate('2026-02-12T19:00:00.000Z')
    },
    {
      taskTitle: 'Running block',
      category: 'Health',
      startedAt: fixedDate('2026-02-15T07:00:00.000Z'),
      endedAt: fixedDate('2026-02-15T10:00:00.000Z')
    },
    {
      taskTitle: 'Running block',
      category: 'Health',
      startedAt: fixedDate('2026-02-17T07:30:00.000Z'),
      endedAt: fixedDate('2026-02-17T10:30:00.000Z')
    },
    {
      taskTitle: 'Running block',
      category: 'Health',
      startedAt: fixedDate('2026-02-19T08:00:00.000Z'),
      endedAt: fixedDate('2026-02-19T11:00:00.000Z')
    },
    {
      taskTitle: 'Course modules',
      category: 'Learning',
      startedAt: fixedDate('2026-02-22T13:00:00.000Z'),
      endedAt: fixedDate('2026-02-22T17:00:00.000Z')
    },
    {
      taskTitle: 'Course modules',
      category: 'Learning',
      startedAt: fixedDate('2026-02-24T13:00:00.000Z'),
      endedAt: fixedDate('2026-02-24T16:00:00.000Z')
    },
    {
      taskTitle: 'Course modules',
      category: 'Learning',
      startedAt: fixedDate('2026-02-26T12:00:00.000Z'),
      endedAt: fixedDate('2026-02-26T16:00:00.000Z')
    },
    {
      taskTitle: 'Inbox cleanup',
      category: 'Admin',
      startedAt: fixedDate('2026-03-01T15:00:00.000Z'),
      endedAt: fixedDate('2026-03-01T19:00:00.000Z')
    },
    {
      taskTitle: 'Writing session',
      category: 'Creative',
      startedAt: fixedDate('2026-03-08T18:00:00.000Z'),
      endedAt: fixedDate('2026-03-09T01:00:00.000Z')
    },
    {
      taskTitle: 'Family planning',
      category: 'Relationships',
      startedAt: fixedDate('2026-03-15T16:00:00.000Z'),
      endedAt: fixedDate('2026-03-15T19:00:00.000Z')
    }
  ],
  edge: [
    {
      taskTitle: 'Uncategorized legacy task',
      category: null,
      startedAt: fixedDate('2026-03-08T09:30:00.000Z'),
      endedAt: fixedDate('2026-03-08T11:30:00.000Z')
    },
    {
      taskTitle: 'DST boundary review',
      category: 'Work',
      startedAt: fixedDate('2026-03-08T10:30:00.000Z'),
      endedAt: fixedDate('2026-03-08T12:00:00.000Z')
    },
    {
      taskTitle: 'Year boundary study',
      category: 'Learning',
      startedAt: fixedDate('2026-12-31T23:30:00.000Z'),
      endedAt: fixedDate('2027-01-01T02:45:00.000Z')
    }
  ]
};

const seedMockTimeEntries = async (persona) => {
  const { user, categories, tasks } = await seedMockTasks(persona);
  const categoryByTitle = new Map(categories.map((category) => [category.title, category]));
  const taskByTitle = new Map(tasks.map((task) => [task.title, task]));
  const entryFixtures = mockTimeEntryFixtures[persona];

  if (!entryFixtures) {
    throw new Error(`Unknown mock persona: ${persona}`);
  }

  await TimeEntry.deleteMany({ userId: user._id });

  const timeEntries = [];
  for (const entryFixture of entryFixtures) {
    const task = taskByTitle.get(entryFixture.taskTitle);
    const category = entryFixture.category
      ? categoryByTitle.get(entryFixture.category)
      : null;

    if (!task) {
      throw new Error(
        `Time entry fixture references unknown task "${entryFixture.taskTitle}"`
      );
    }

    if (entryFixture.category && !category) {
      throw new Error(
        `Time entry fixture for "${entryFixture.taskTitle}" references unknown category "${entryFixture.category}"`
      );
    }

    timeEntries.push(await TimeEntry.create({
      userId: user._id,
      taskId: task._id,
      category: category ? category._id : null,
      startedAt: entryFixture.startedAt,
      endedAt: entryFixture.endedAt,
      durationMinutes: (entryFixture.endedAt - entryFixture.startedAt) / 60000,
      createdAt: entryFixture.startedAt
    }));
  }

  return {
    user,
    categories,
    tasks,
    timeEntries
  };
};

module.exports = {
  mockTimeEntryFixtures,
  seedMockTimeEntries
};
