const mongoose = require('mongoose');

const calendarSyncMappingSchema = new mongoose.Schema(
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
    // The calendar/event IDs are the durable link back to Google Calendar.
    calendarId: {
      type: String,
      required: true
    },
    externalEventId: {
      type: String,
      required: true
    },
    syncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed', 'disabled'],
      default: 'pending'
    },
    lastPayloadHash: {
      type: String,
      default: ''
    },
    lastSyncedAt: {
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

calendarSyncMappingSchema.index(
  { userId: 1, provider: 1, sourceType: 1, sourceId: 1 },
  { unique: true }
);

module.exports = mongoose.model('CalendarSyncMapping', calendarSyncMappingSchema);
