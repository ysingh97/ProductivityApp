const mongoose = require('mongoose');

// Define the Goal schema
const goalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, // The title is mandatory
  },
  description: {
    type: String,
    default: '', // Optional description, defaults to an empty string
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to the current date
  },
  targetCompletionDate: {
    type: Date
  },
  isComplete: {
    type: Boolean,
    default: false
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
  parentGoalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal'
  },
  subGoals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal'
    }
  ],
  subTasks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    }
  ]
  

});

// Create the Goal model
const Goal = mongoose.model('Goal', goalSchema);

// Export the Goal model
module.exports = Goal;
