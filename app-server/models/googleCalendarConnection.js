const mongoose = require('mongoose');

const googleCalendarConnectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    googleEmail: {
      type: String,
      required: true,
      lowercase: true
    },
    googleSub: {
      type: String,
      required: true
    },
    // The refresh token is what allows background sync even when the user is offline.
    refreshTokenEncrypted: {
      type: String,
      required: true
    },
    selectedCalendarId: {
      type: String,
      default: null
    },
    selectedCalendarSummary: {
      type: String,
      default: null
    },
    syncEnabled: {
      type: Boolean,
      default: true
    },
    lastSyncAt: {
      type: Date,
      default: null
    },
    lastSyncError: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('GoogleCalendarConnection', googleCalendarConnectionSchema);
