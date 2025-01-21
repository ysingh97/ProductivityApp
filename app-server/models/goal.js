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
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to the current date
  },
});

// Create the Goal model
const Goal = mongoose.model('Goal', goalSchema);

// Export the Goal model
module.exports = Goal;