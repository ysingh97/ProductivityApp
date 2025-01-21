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
  completed: {
    type: Boolean,
    default: false, // Tracks whether the task is completed
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
});

// Create the Task model
const Task = mongoose.model('Task', taskSchema);

// Export the Task model
module.exports = Task;