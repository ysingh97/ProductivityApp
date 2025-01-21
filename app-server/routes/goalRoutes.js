const express = require('express');
const router = express.Router();
const Goal = require('../models/goal'); // Import the Goal model

// Get all goals
router.get('/', async (req, res) => {
  try {
    console.log("goal get");
    const goals = await Goal.find();
    res.status(200).json(goals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new goal
router.post('/', async (req, res) => {
  try {
    const newGoal = new Goal(req.body);
    const savedGoal = await newGoal.save();
    res.status(201).json(savedGoal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;