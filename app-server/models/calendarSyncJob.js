const mongoose = require('mongoose');

const calendarSyncJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    sourceType: {
      type: String,
      enum: ['goal', 'task'],
      required: true
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    provider: {
      type: String,
      enum: ['google'],
      default: 'google',
      required: true
    },
    jobType: {
      type: String,
      enum: ['sync'],
      default: 'sync',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'succeeded', 'failed'],
      default: 'pending',
      index: true
    },
    attemptCount: {
      type: Number,
      default: 0
    },
    runAfter: {
      type: Date,
      default: Date.now,
      index: true
    },
    lockedAt: {
      type: Date,
      default: null
    },
    lastError: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

calendarSyncJobSchema.index(
  { userId: 1, provider: 1, sourceType: 1, sourceId: 1, jobType: 1 },
  { unique: true }
);

module.exports = mongoose.model('CalendarSyncJob', calendarSyncJobSchema);
