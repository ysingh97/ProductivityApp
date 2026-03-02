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
  estimatedCompletionTime: {
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
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to the current date
  },
  scheduledTime: {
    type: Date
  },
  parentGoalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal',
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  targetCompletionDate: {
    type: Date,
    required: true
  }
});

// Create the Task model
const Task = mongoose.model('Task', taskSchema);

// Export the Task model
module.exports = Task;
