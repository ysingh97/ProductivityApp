const crypto = require('crypto');
const CalendarSyncJob = require('../models/calendarSyncJob');
const CalendarSyncMapping = require('../models/calendarSyncMapping');
const GoogleCalendarConnection = require('../models/googleCalendarConnection');
const Goal = require('../models/goal');
const Task = require('../models/task');
const {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} = require('./googleCalendarService');

const ACTIVE_SYNC_FILTER = {
  targetCompletionDate: { $ne: null },
  isComplete: false
};

const enqueueGoogleSync = async ({ userId, sourceType, sourceId }) => {
  await CalendarSyncJob.findOneAndUpdate(
    {
      userId,
      provider: 'google',
      sourceType,
      sourceId,
      jobType: 'sync'
    },
    {
      $set: {
        status: 'pending',
        runAfter: new Date(),
        lockedAt: null,
        lastError: ''
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const enqueueGoogleSyncForUser = async ({ userId }) => {
  const [goals, tasks] = await Promise.all([
    Goal.find({ userId }, { _id: 1 }),
    Task.find({ userId }, { _id: 1 })
  ]);

  for (const goal of goals) {
    await enqueueGoogleSync({ userId, sourceType: 'goal', sourceId: goal._id });
  }

  for (const task of tasks) {
    await enqueueGoogleSync({ userId, sourceType: 'task', sourceId: task._id });
  }
};

const buildGoogleEventPayload = ({ item, sourceType, appBaseUrl }) => {
  const end = new Date(item.targetCompletionDate);
  const start = new Date(end.getTime() - 30 * 60 * 1000);

  return {
    summary: sourceType === 'goal' ? `[Goal] ${item.title}` : `[Task] ${item.title}`,
    description: [
      item.description || '',
      '',
      `Open in app: ${appBaseUrl}/${sourceType === 'goal' ? 'goals' : 'tasks'}/${item._id}`
    ].join('\n'),
    start: {
      dateTime: start.toISOString()
    },
    end: {
      dateTime: end.toISOString()
    },
    extendedProperties: {
      private: {
        appSourceType: sourceType,
        appSourceId: String(item._id),
        appUserId: String(item.userId)
      }
    }
  };
};

const hashPayload = (payload) =>
  crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

const loadSourceItem = async (job) => {
  if (job.sourceType === 'goal') {
    return Goal.findOne({ _id: job.sourceId, userId: job.userId }).populate('category', 'title');
  }

  return Task.findOne({ _id: job.sourceId, userId: job.userId }).populate('category', 'title');
};

const shouldSyncItem = (item) =>
  Boolean(item && item.targetCompletionDate && !item.isComplete);

const markConnectionHealthy = async (connectionId) => {
  await GoogleCalendarConnection.updateOne(
    { _id: connectionId },
    { $set: { lastSyncAt: new Date(), lastSyncError: '' } }
  );
};

const processSyncJob = async (job) => {
  const connection = await GoogleCalendarConnection.findOne({ userId: job.userId });
  const mapping = await CalendarSyncMapping.findOne({
    userId: job.userId,
    provider: 'google',
    sourceType: job.sourceType,
    sourceId: job.sourceId
  });

  if (!connection || !connection.syncEnabled || !connection.selectedCalendarId) {
    if (mapping) {
      mapping.syncStatus = 'disabled';
      mapping.lastError = 'Google Calendar is not connected or sync is disabled.';
      await mapping.save();
    }
    return;
  }

  const item = await loadSourceItem(job);

  // If the item is gone, completed, or undated, remove its Google event and mapping.
  if (!shouldSyncItem(item)) {
    if (mapping) {
      try {
        await deleteCalendarEvent({
          connection,
          calendarId: mapping.calendarId,
          eventId: mapping.externalEventId
        });
      } catch (err) {
        if (err.code !== 404) {
          throw err;
        }
      }

      await CalendarSyncMapping.deleteOne({ _id: mapping._id });
    }

    await markConnectionHealthy(connection._id);
    return;
  }

  const payload = buildGoogleEventPayload({
    item,
    sourceType: job.sourceType,
    appBaseUrl: process.env.APP_URL
  });
  const payloadHash = hashPayload(payload);

  // If the user switches calendars, create the event in the new calendar and clean up the old one.
  if (mapping && mapping.calendarId !== connection.selectedCalendarId) {
    const createdEvent = await createCalendarEvent({
      connection,
      calendarId: connection.selectedCalendarId,
      payload
    });

    try {
      await deleteCalendarEvent({
        connection,
        calendarId: mapping.calendarId,
        eventId: mapping.externalEventId
      });
    } catch (err) {
      if (err.code !== 404) {
        throw err;
      }
    }

    mapping.calendarId = connection.selectedCalendarId;
    mapping.externalEventId = createdEvent.id;
    mapping.lastPayloadHash = payloadHash;
    mapping.lastSyncedAt = new Date();
    mapping.lastError = '';
    mapping.syncStatus = 'synced';
    await mapping.save();
    await markConnectionHealthy(connection._id);
    return;
  }

  if (!mapping) {
    const createdEvent = await createCalendarEvent({
      connection,
      calendarId: connection.selectedCalendarId,
      payload
    });

    await CalendarSyncMapping.create({
      userId: job.userId,
      sourceType: job.sourceType,
      sourceId: job.sourceId,
      provider: 'google',
      calendarId: connection.selectedCalendarId,
      externalEventId: createdEvent.id,
      syncStatus: 'synced',
      lastPayloadHash: payloadHash,
      lastSyncedAt: new Date(),
      lastError: ''
    });

    await markConnectionHealthy(connection._id);
    return;
  }

  if (mapping.lastPayloadHash === payloadHash) {
    mapping.syncStatus = 'synced';
    mapping.lastSyncedAt = new Date();
    mapping.lastError = '';
    await mapping.save();
    await markConnectionHealthy(connection._id);
    return;
  }

  await updateCalendarEvent({
    connection,
    calendarId: mapping.calendarId,
    eventId: mapping.externalEventId,
    payload
  });

  mapping.syncStatus = 'synced';
  mapping.lastPayloadHash = payloadHash;
  mapping.lastSyncedAt = new Date();
  mapping.lastError = '';
  await mapping.save();
  await markConnectionHealthy(connection._id);
};

const claimNextGoogleCalendarSyncJob = async () =>
  CalendarSyncJob.findOneAndUpdate(
    {
      provider: 'google',
      status: 'pending',
      runAfter: { $lte: new Date() }
    },
    {
      $set: {
        status: 'processing',
        lockedAt: new Date()
      },
      $inc: {
        attemptCount: 1
      }
    },
    {
      sort: { runAfter: 1, updatedAt: 1 },
      new: true
    }
  );

const markSyncJobSucceeded = async (job) => {
  await CalendarSyncJob.updateOne(
    { _id: job._id },
    {
      $set: {
        status: 'succeeded',
        lockedAt: null,
        lastError: ''
      }
    }
  );
};

const markSyncJobFailed = async (job, err) => {
  const attemptCount = job.attemptCount || 1;
  const delayMinutes = Math.min(60, Math.pow(2, Math.min(attemptCount, 5)));
  const nextRun = new Date(Date.now() + delayMinutes * 60 * 1000);
  const nextStatus = attemptCount >= 5 ? 'failed' : 'pending';

  await CalendarSyncJob.updateOne(
    { _id: job._id },
    {
      $set: {
        status: nextStatus,
        lockedAt: null,
        runAfter: nextStatus === 'pending' ? nextRun : job.runAfter,
        lastError: err.message || 'Unknown sync failure'
      }
    }
  );

  await CalendarSyncMapping.updateOne(
    {
      userId: job.userId,
      provider: 'google',
      sourceType: job.sourceType,
      sourceId: job.sourceId
    },
    {
      $set: {
        syncStatus: 'failed',
        lastError: err.message || 'Unknown sync failure'
      }
    }
  );

  await GoogleCalendarConnection.updateOne(
    { userId: job.userId },
    { $set: { lastSyncError: err.message || 'Unknown sync failure' } }
  );
};

module.exports = {
  enqueueGoogleSync,
  enqueueGoogleSyncForUser,
  buildGoogleEventPayload,
  processSyncJob,
  claimNextGoogleCalendarSyncJob,
  markSyncJobSucceeded,
  markSyncJobFailed
};
