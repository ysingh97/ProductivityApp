const express = require('express');
const router = express.Router();
const Task = require('../models/task'); // Import the Task model

// Get all tasks for a list
router.get('/:listId', async (req, res) => {
  try {
    console.log("task get");
    const tasks = await Task.find({ listId: req.params.listId });
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all tasks
router.get('/', async(req, res) => {
  try {
    console.log("get all tasks");
    const tasks = await Task.find();
    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    console.log("task post request", req);
    const {title, description, listId} = req.body;
    const newTask = new Task({
      title,
      description,
      listId,
    });
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;