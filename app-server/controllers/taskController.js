const Task = require('../models/task'); // Import the Task model
const Goal = require('../models/goal');
const List = require('../models/list');

const getTasks = async(req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user.id });
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const createTask = async (req, res) => {
    try {
      const {title, description, listId, parentGoalId, estimatedCompletionTime} = req.body;

      if (listId) {
        const list = await List.findOne({ _id: listId, userId: req.user.id });
        if (!list) {
          return res.status(400).json({ message: "Invalid list for this user" });
        }
      }

      let parentGoal = null;
      if (parentGoalId) {
        parentGoal = await Goal.findOne({ _id: parentGoalId, userId: req.user.id });
        if (!parentGoal) {
          return res.status(400).json({ message: "Invalid parentGoal ID" });
        }
      }

      const newTask = new Task({  
        ...req.body,
        userId: req.user.id
      });
      const savedTask = await newTask.save();
      res.status(201).json(savedTask);
  
      // if parentGoalId exists, add task as subtask of parentGoal
      if (parentGoal) {
        parentGoal.subTasks.push(savedTask._id);
        await parentGoal.save();
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
}

const updateTask = async (req, res) => {
  try {
    const { id } = req.params; // task id from URL
    const { userId, ...updates } = req.body;  // fields to update, disallow userId change

    const updatedTask = await Task.findOneAndUpdate({ _id: id, userId: req.user.id }, updates, {
      new: true,        // return the updated document
      runValidators: true // make sure updates respect schema validation
    });

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteTask = async (req, res) => {
    try {
      const deletedTask = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
      if (!deletedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
  
      res.json({
        message: "Task deleted successfully",
        deletedTask
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
}

const getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.status(200).json(task);
  }
  catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Get all tasks for a list
const getTasksByListId = async (req, res) => {
  try {
    const listId = req.params.listId;
    const tasks = await Task.find({ listId, userId: req.user.id });

    res.status(200).json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}


module.exports = {
    getTasks,
    createTask,
    updateTask,
    deleteTask,
    getTasksByListId,
    getTaskById
};
