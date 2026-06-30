const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/user');
const Category = require('../models/category');
const Goal = require('../models/goal');
const List = require('../models/list');
const Task = require('../models/task');
const TimeEntry = require('../models/timeEntry');
const GoogleCalendarConnection = require('../models/googleCalendarConnection');
const CalendarSyncJob = require('../models/calendarSyncJob');
const CalendarSyncMapping = require('../models/calendarSyncMapping');

const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

dotenv.config({
  path: path.resolve(__dirname, '..', envFile)
});

const parseArgs = () => {
  const args = process.argv.slice(2);
  const emailIndex = args.indexOf('--email');

  return {
    email: emailIndex >= 0 ? args[emailIndex + 1] : ''
  };
};

const getCollectionCounts = async (userId) => {
  const [categories, goals, lists, tasks, timeEntries, calendarConnections, calendarSyncJobs, calendarSyncMappings] =
    await Promise.all([
      Category.countDocuments({ userId }),
      Goal.countDocuments({ userId }),
      List.countDocuments({ userId }),
      Task.countDocuments({ userId }),
      TimeEntry.countDocuments({ userId }),
      GoogleCalendarConnection.countDocuments({ userId }),
      CalendarSyncJob.countDocuments({ userId }),
      CalendarSyncMapping.countDocuments({ userId })
    ]);

  return {
    categories,
    goals,
    lists,
    tasks,
    timeEntries,
    calendarConnections,
    calendarSyncJobs,
    calendarSyncMappings
  };
};

const logCounts = (label, counts) => {
  console.log(label);
  Object.entries(counts).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });
};

const resetUserData = async (email) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error('Provide an email with --email user@example.com.');
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new Error(
      `No user found for ${normalizedEmail}. Use the staging list-users workflow action to inspect available accounts.`
    );
  }

  const beforeCounts = await getCollectionCounts(user._id);
  logCounts(`Preparing to clear staging data for ${normalizedEmail}:`, beforeCounts);

  await CalendarSyncMapping.deleteMany({ userId: user._id });
  await CalendarSyncJob.deleteMany({ userId: user._id });
  await GoogleCalendarConnection.deleteMany({ userId: user._id });
  await TimeEntry.deleteMany({ userId: user._id });
  await Task.deleteMany({ userId: user._id });
  await List.deleteMany({ userId: user._id });
  await Goal.deleteMany({ userId: user._id });
  await Category.deleteMany({ userId: user._id });

  const afterCounts = await getCollectionCounts(user._id);
  logCounts(`Finished clearing staging data for ${normalizedEmail}:`, afterCounts);

  console.log('The user record was preserved so the account can sign back in without recreation friction.');
  console.log(
    'Note: this reset removes app-side Google Calendar connection state and sync metadata, but it does not delete any events that were already written to Google Calendar.'
  );
};

const main = async () => {
  const { email } = parseArgs();

  if (process.env.NODE_ENV === 'production') {
    throw new Error('This reset script is blocked in production.');
  }

  await connectDB();
  await resetUserData(email);
};

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
