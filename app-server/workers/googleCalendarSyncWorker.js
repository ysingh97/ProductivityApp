const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const {
  claimNextGoogleCalendarSyncJob,
  processSyncJob,
  markSyncJobSucceeded,
  markSyncJobFailed
} = require('../services/calendarSyncService');

const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.development';

dotenv.config({
  path: path.resolve(__dirname, '..', envFile)
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runWorkerLoop = async () => {
  await connectDB();

  while (true) {
    const job = await claimNextGoogleCalendarSyncJob();

    if (!job) {
      await sleep(3000);
      continue;
    }

    try {
      // Each job is processed independently so one bad item does not stop the queue.
      await processSyncJob(job);
      await markSyncJobSucceeded(job);
    } catch (err) {
      console.error('Google Calendar sync job failed', err);
      await markSyncJobFailed(job, err);
    }
  }
};

runWorkerLoop().catch((err) => {
  console.error('Google Calendar worker failed to start', err);
  process.exit(1);
});
