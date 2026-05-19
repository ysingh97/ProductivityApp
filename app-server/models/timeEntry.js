const mongoose = require('mongoose');

// Define the TimeEntry schema
const timeEntrySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date,
    required: true,
    validate: {
      validator(value) {
        if (!(this.startedAt instanceof Date) || Number.isNaN(this.startedAt.getTime())) {
          return true;
        }

        if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
          return true;
        }

        return value >= this.startedAt;
      },
      message: 'endedAt must be greater than or equal to startedAt'
    }
  },
  durationMinutes: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator(value) {
        if (!(this.startedAt instanceof Date) || Number.isNaN(this.startedAt.getTime())) {
          return true;
        }

        if (!(this.endedAt instanceof Date) || Number.isNaN(this.endedAt.getTime())) {
          return true;
        }

        if (this.endedAt < this.startedAt) {
          return true;
        }

        const expectedDurationMinutes = (this.endedAt - this.startedAt) / 60000;
        return Math.abs(value - expectedDurationMinutes) <= 0.000001;
      },
      message: 'durationMinutes must match the difference between startedAt and endedAt'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

timeEntrySchema.index({ userId: 1, startedAt: 1 });
timeEntrySchema.index({ userId: 1, category: 1, startedAt: 1 });
timeEntrySchema.index({ userId: 1, taskId: 1, startedAt: 1 });

// Create the TimeEntry model
const TimeEntry = mongoose.model('TimeEntry', timeEntrySchema);

// Export the TimeEntry model
module.exports = TimeEntry;
