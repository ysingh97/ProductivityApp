const express = require('express');
const router = express.Router();
const List = require('../models/list'); // Import the List model

// Get all lists for a goal
router.get('/:goalId', async (req, res) => {
  try {
    console.log("list get");
    const lists = await List.find({ goalId: req.params.goalId });
    res.status(200).json(lists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new list
router.post('/', async (req, res) => {
  try {
    const newList = new List(req.body);
    const savedList = await newList.save();
    res.status(201).json(savedList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;