const mongoose = require('mongoose');

// Define the Task schema
const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, // The task's title is mandatory
  },
  description: {
    type: String,
    default: '', // Optional description for the task
  },
  isComplete: {
    type: Boolean,
    default: false, // Tracks whether the task is completed
  },
  estimatedHours: {
    type: Number,
    default: 0
  },
  timeLeft: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number,
    default: 0
  },
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'List', // References the List model
    required: false, // Each task must belong to a specific list
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to the current date
  },
  scheduledTime: {
    type: Date
  },
  parentGoal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }
});

// Create the Task model
const Task = mongoose.model('Task', taskSchema);

// Export the Task model
module.exports = Task;