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
      const {title, description, listId, parentGoalId, estimatedCompletionTime} = req.body;
      console.log("task post: ", parentGoalId);
      const newTask = new Task({  
        title,
        description,
        listId,
        parentGoalId,
        estimatedCompletionTime
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

const updateTask = async (req, res) => {
  console.log("task controller, update task, req.body: ", req.body);
  try {
    const { id } = req.params; // task id from URL
    const updates = req.body;  // fields to update

    const updatedTask = await Task.findByIdAndUpdate(id, updates, {
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
      //console.log("delete task request: ", req, ". params: ", req.params);
      const deletedTask = await Task.findByIdAndDelete(req.params.id);
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
    // console.log("getTaskById before findBYid");
    const task = await Task.findById(req.params.id);
    console.log("getTaskById from controller - fetched task: ", {task});
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
    const tasks = await Task.find({ listId });

    if (!tasks || tasks.length === 0) {
      return res.status(404).json({ message: "No tasks found for this list" });
    }

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