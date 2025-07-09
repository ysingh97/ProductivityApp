const Task = require('../models/task'); // Import the Task model
const Goal = require('../models/goal');

const getTasks = async(req, res) => {
    try {
        //console.log("get all tasks");
        const tasks = await Task.find();
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const createTask = async (req, res) => {
    try {
      console.log("task post request", req.body);
      const {title, description, listId, parentGoalId} = req.body;
      console.log("task post: ", parentGoalId);
      const newTask = new Task({  
        title,
        description,
        listId,
        parentGoalId
      });
      const savedTask = await newTask.save();
      res.status(201).json(savedTask);
  
      // if parentGoalId exists, add task as subtask of parentGoal
      if (parentGoalId) {
        const goal = await Goal.findById(parentGoalId);
        console.log(`task post add task as subtask to goal: ${parentGoalId}. subtaskId: ${savedTask._id}`);
        if (!goal) {
          return res.status(400).json({ message: "Invalid parentGoal ID" });
        }
        goal.subTasks.push(savedTask._id);
        await goal.save();
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
}

const deleteTask = async (req, res) => {
    try {
      //console.log("delete task request: ", req, ". params: ", req.params);
      const task = await Task.findById(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
  
      await task.deleteOne();
      res.json({ message: "Task deleted successfully" });
    } catch {
  
    }
}

// Get all tasks for a list
const getTasksByListId = async (req, res) => {
    try {
        //console.log("task get");
        const tasks = await Task.find({ listId: req.params.listId });
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


module.exports = {
    getTasks,
    createTask,
    deleteTask,
    getTasksByListId
};