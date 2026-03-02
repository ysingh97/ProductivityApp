const Task = require('../models/task'); // Import the Task model
const Goal = require('../models/goal');
const List = require('../models/list');
const Category = require('../models/category');

const normalizeCategoryTitle = (value) => (typeof value === 'string' ? value.trim() : '');

const resolveCategory = async (input, userId) => {
  const title = normalizeCategoryTitle(
    input && typeof input === 'object' ? input.title : input
  );

  if (!title) {
    return null;
  }

  const category = await Category.findOneAndUpdate(
    { userId, title },
    { $setOnInsert: { userId, title } },
    { new: true, upsert: true }
  );

  return category;
};

const getTopLevelGoal = async (goalId, userId) => {
  let currentGoal = await Goal.findOne({ _id: goalId, userId });
  if (!currentGoal) {
    return null;
  }

  const seen = new Set([String(currentGoal._id)]);
  while (currentGoal.parentGoalId) {
    const parentId = String(currentGoal.parentGoalId);
    if (seen.has(parentId)) {
      break;
    }
    const parentGoal = await Goal.findOne({ _id: currentGoal.parentGoalId, userId });
    if (!parentGoal) {
      break;
    }
    currentGoal = parentGoal;
    seen.add(String(currentGoal._id));
  }

  return currentGoal;
};

const getTasks = async(req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user.id }).populate('category', 'title');
        res.status(200).json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const createTask = async (req, res) => {
    try {
      const { listId } = req.body;
      const parentGoalId = req.body.parentGoalId || null;

      if (listId) {
        const list = await List.findOne({ _id: listId, userId: req.user.id });
        if (!list) {
          return res.status(400).json({ message: "Invalid list for this user" });
        }
      }

      let parentGoal = null;
      let categoryId = null;
      if (parentGoalId) {
        parentGoal = await Goal.findOne({ _id: parentGoalId, userId: req.user.id });
        if (!parentGoal) {
          return res.status(400).json({ message: "Invalid parentGoal ID" });
        }
        const topLevelGoal = await getTopLevelGoal(parentGoalId, req.user.id);
        categoryId = topLevelGoal ? topLevelGoal.category || null : null;
      } else {
        const category = await resolveCategory(req.body.category, req.user.id);
        categoryId = category ? category._id : null;
      }

      const newTask = new Task({  
        ...req.body,
        category: categoryId,
        userId: req.user.id
      });
      const savedTask = await newTask.save();
      await savedTask.populate('category', 'title');
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

    const existingTask = await Task.findOne({ _id: id, userId: req.user.id });
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    const hasParentUpdate = Object.prototype.hasOwnProperty.call(updates, 'parentGoalId');
    if (hasParentUpdate && updates.parentGoalId === '') {
      updates.parentGoalId = null;
    }

    const nextParentGoalId = hasParentUpdate ? updates.parentGoalId : existingTask.parentGoalId;

    if (hasParentUpdate && nextParentGoalId) {
      const parentGoal = await Goal.findOne({ _id: nextParentGoalId, userId: req.user.id });
      if (!parentGoal) {
        return res.status(400).json({ message: "Invalid parentGoal ID" });
      }
    }

    let nextCategoryId = existingTask.category || null;
    if (nextParentGoalId) {
      const topLevelGoal = await getTopLevelGoal(nextParentGoalId, req.user.id);
      if (!topLevelGoal) {
        return res.status(400).json({ message: "Invalid parentGoal ID" });
      }
      nextCategoryId = topLevelGoal.category || null;
      updates.category = nextCategoryId;
    } else if (Object.prototype.hasOwnProperty.call(updates, 'category')) {
      const category = await resolveCategory(updates.category, req.user.id);
      nextCategoryId = category ? category._id : null;
      updates.category = nextCategoryId;
    }

    const updatedTask = await Task.findOneAndUpdate({ _id: id, userId: req.user.id }, updates, {
      new: true,        // return the updated document
      runValidators: true // make sure updates respect schema validation
    });

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    await updatedTask.populate('category', 'title');
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
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('category', 'title');
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
    const tasks = await Task.find({ listId, userId: req.user.id })
      .populate('category', 'title');

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
