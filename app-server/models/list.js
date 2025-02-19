const mongoose = require('mongoose');

// Define the List schema
const listSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, // The list's name is mandatory
  },
  description: {
    type: String
  },
  goalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Goal', // References the Goal model
    required: false, // Each list must belong to a specific goal
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to the current date
  },
  tasks: {
    type: [{type: mongoose.Schema.Types.ObjectId, ref: 'Task'}]
  }
});

// Create the List model
const List = mongoose.model('List', listSchema);

// Export the List model
module.exports = List;