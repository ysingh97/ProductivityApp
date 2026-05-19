const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/user');
const Task = require('../models/task');
const Category = require('../models/category');
const TimeEntry = require('../models/timeEntry');

const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

dotenv.config({
  path: path.resolve(__dirname, '..', envFile)
});

const seedMarker = '[viz-seed] Historical visualization seed data';

const roundQuarterHour = (value) => Math.round(value * 4) / 4;

const startOfUtcDay = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const addUtcDays = (date, days) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const startOfUtcWeek = (date) => {
  const start = startOfUtcDay(date);
  return addUtcDays(start, -start.getUTCDay());
};

const withSeedTime = (date, hour) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, 0, 0));

const parseArgs = () => {
  const args = process.argv.slice(2);
  const emailIndex = args.indexOf('--email');

  return {
    email: emailIndex >= 0 ? args[emailIndex + 1] : '',
    listUsers: args.includes('--list-users')
  };
};

const upsertCategory = async (userId, title) => {
  const category = await Category.findOneAndUpdate(
    { userId, title },
    { $setOnInsert: { userId, title } },
    { new: true, upsert: true }
  );

  return category;
};

const buildSeedTasks = () => {
  const now = new Date();
  const currentWeekStart = startOfUtcWeek(now);
  const workPattern = [6, 7.5, 5.5, 8, 4.5, 6.5];
  const healthPattern = [2, 2.5, 1.5, 3];
  const learningPattern = [3.5, 4.5, 2.5, 5];
  const adminPattern = [1, 1.5];
  const creativePattern = [2, 2.5, 3];
  const relationshipPattern = [1.5, 2];
  const tasks = [];

  for (let weekIndex = 0; weekIndex < 14; weekIndex += 1) {
    const weekStart = addUtcDays(currentWeekStart, -7 * weekIndex);
    const focusDay = addUtcDays(weekStart, 1);
    const adminHealthDay = addUtcDays(weekStart, 3);
    const creativeRelationshipDay = addUtcDays(weekStart, 5);

    tasks.push({
      title: `[viz-seed] Deep work block W${weekIndex + 1}`,
      categoryTitle: 'Work',
      timeSpent: workPattern[weekIndex % workPattern.length],
      targetCompletionDate: withSeedTime(focusDay, 17)
    });

    tasks.push({
      title: `[viz-seed] Learning session W${weekIndex + 1}`,
      categoryTitle: 'Learning',
      timeSpent: learningPattern[weekIndex % learningPattern.length],
      targetCompletionDate: withSeedTime(focusDay, 20)
    });

    if (weekIndex % 2 === 0) {
      tasks.push({
        title: `[viz-seed] Health session W${weekIndex + 1}`,
        categoryTitle: 'Health',
        timeSpent: healthPattern[weekIndex % healthPattern.length],
        targetCompletionDate: withSeedTime(adminHealthDay, 17)
      });
    }

    if (weekIndex % 3 === 0) {
      tasks.push({
        title: `[viz-seed] Admin catch-up W${weekIndex + 1}`,
        categoryTitle: 'Admin',
        timeSpent: adminPattern[weekIndex % adminPattern.length],
        targetCompletionDate: withSeedTime(adminHealthDay, 20)
      });
    }

    if (weekIndex % 4 === 1) {
      tasks.push({
        title: `[viz-seed] Creative sprint W${weekIndex + 1}`,
        categoryTitle: 'Creative',
        timeSpent: creativePattern[weekIndex % creativePattern.length],
        targetCompletionDate: withSeedTime(creativeRelationshipDay, 16)
      });
    }

    if (weekIndex % 5 === 2) {
      tasks.push({
        title: `[viz-seed] Relationship check-in W${weekIndex + 1}`,
        categoryTitle: 'Relationships',
        timeSpent: relationshipPattern[weekIndex % relationshipPattern.length],
        targetCompletionDate: withSeedTime(creativeRelationshipDay, 19)
      });
    }

    if (weekIndex % 6 === 3) {
      tasks.push({
        title: `[viz-seed] Legacy uncategorized task W${weekIndex + 1}`,
        categoryTitle: null,
        timeSpent: 1.25,
        targetCompletionDate: withSeedTime(focusDay, 13)
      });
    }
  }

  return tasks.map((task) => ({
    ...task,
    timeSpent: roundQuarterHour(task.timeSpent),
    estimatedCompletionTime: roundQuarterHour(task.timeSpent + 1)
  }));
};

const listUsers = async () => {
  const users = await User.find({}, { email: 1, name: 1 }).sort({ email: 1 }).lean();

  if (users.length === 0) {
    console.log('No users found in the development database.');
    return;
  }

  console.log('Available users:');
  users.forEach((user) => {
    console.log(`- ${user.email} (${user.name})`);
  });
};

const seedUser = async (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Provide an email with --email user@example.com.');
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new Error(
      `No user found for ${normalizedEmail}. Run with --list-users to see available accounts.`
    );
  }

  const categoriesByTitle = new Map();
  for (const title of ['Work', 'Health', 'Learning', 'Admin', 'Creative', 'Relationships']) {
    const category = await upsertCategory(user._id, title);
    categoriesByTitle.set(title, category);
  }

  const existingSeedTasks = await Task.find({
    userId: user._id,
    description: seedMarker
  }, { _id: 1 }).lean();

  if (existingSeedTasks.length > 0) {
    await TimeEntry.deleteMany({
      taskId: { $in: existingSeedTasks.map((task) => task._id) }
    });
  }

  await Task.deleteMany({
    userId: user._id,
    description: seedMarker
  });

  const seedTasks = buildSeedTasks();
  const insertedTasks = await Task.insertMany(
    seedTasks.map((task) => ({
      title: task.title,
      description: seedMarker,
      isComplete: true,
      estimatedCompletionTime: task.estimatedCompletionTime,
      timeLeft: 0,
      timeSpent: task.timeSpent,
      userId: user._id,
      category: task.categoryTitle ? categoriesByTitle.get(task.categoryTitle)._id : null,
      targetCompletionDate: task.targetCompletionDate,
      createdAt: task.targetCompletionDate
    }))
  );

  await TimeEntry.insertMany(
    insertedTasks.map((task) => {
      const durationMinutes = Math.round(task.timeSpent * 60);
      const endedAt = new Date(task.targetCompletionDate);
      const startedAt = new Date(endedAt.getTime() - durationMinutes * 60000);

      return {
        userId: user._id,
        taskId: task._id,
        category: task.category || null,
        startedAt,
        endedAt,
        durationMinutes,
        createdAt: startedAt
      };
    })
  );

  console.log(`Seeded ${insertedTasks.length} historical visualization tasks for ${normalizedEmail}.`);
  console.log(`Seeded ${insertedTasks.length} matching time entries for ${normalizedEmail}.`);
  console.log('Categories used: Work, Health, Learning, Admin, Creative, Relationships, Uncategorized');
  console.log('Range covered: roughly the last 14 weeks, including the current week.');
};

const main = async () => {
  const { email, listUsers: shouldListUsers } = parseArgs();

  if (process.env.NODE_ENV === 'production') {
    throw new Error('This seed script is blocked in production.');
  }

  await connectDB();

  if (shouldListUsers) {
    await listUsers();
    return;
  }

  await seedUser(email);
};

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
