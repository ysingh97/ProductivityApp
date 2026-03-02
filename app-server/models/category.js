const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true, // The title is mandatory
    trim: true
  },
  description: {
    type: String,
    default: '', // Optional description, defaults to an empty string
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  goals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal'
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

categorySchema.index({ userId: 1, title: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
