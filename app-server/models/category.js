const mongoose = require('mongoose');

// Define the Goal schema
const categorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, // The title is mandatory
  },
  description: {
    type: String,
    default: '', // Optional description, defaults to an empty string
  }
});

// Create the Goal model
const Category = mongoose.model('Goal', categorySchema);

// Export the Goal model
module.exports = Category;