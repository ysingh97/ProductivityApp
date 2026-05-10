const Task = require('../models/task'); // Import the Task model
const Goal = require('../models/goal');
const List = require('../models/list');
const Category = require('../models/category');
const TimeEntry = require('../models/timeEntry');
const { enqueueGoogleSync } = require('../services/calendarSyncService');

const normalizeCategoryTitle = (value) => (typeof value === 'string' ? value.trim() : '');
const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;

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

const syncTaskTimeTotals = async (task) => {
  const aggregate = await TimeEntry.aggregate([
    {
      $match: {
        taskId: task._id,
        userId: task.userId
      }
    },
    {
      $group: {
        _id: null,
        totalMinutes: { $sum: '$durationMinutes' }
      }
    }
  ]);

  const totalMinutes = aggregate[0]?.totalMinutes || 0;
  const totalHours = roundToTwoDecimals(totalMinutes / 60);
  const estimatedHours = Number(task.estimatedCompletionTime) || 0;

  task.timeSpent = totalHours;
  task.timeLeft = roundToTwoDecimals(Math.max(estimatedHours - totalHours, 0));
  await task.save();

  return task;
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

      if (parentGoal) {
        parentGoal.subTasks.push(savedTask._id);
        await parentGoal.save();
      }

      await enqueueGoogleSync({
        userId: req.user.id,
        sourceType: 'task',
        sourceId: savedTask._id
      });

      await savedTask.populate('category', 'title');
      res.status(201).json(savedTask);
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
    await enqueueGoogleSync({
      userId: req.user.id,
      sourceType: 'task',
      sourceId: updatedTask._id
    });
    res.status(200).json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createTaskTimeEntry = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const startedAt = new Date(req.body.startedAt);
    const endedAt = new Date(req.body.endedAt);

    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      return res.status(400).json({
        error: 'startedAt and endedAt must be valid ISO date-time values.'
      });
    }

    if (endedAt <= startedAt) {
      return res.status(400).json({
        error: 'endedAt must be after startedAt.'
      });
    }

    const durationMinutes = (endedAt - startedAt) / 60000;
    const timeEntry = await TimeEntry.create({
      userId: req.user.id,
      taskId: task._id,
      category: task.category || null,
      startedAt,
      endedAt,
      durationMinutes
    });

    const updatedTask = await syncTaskTimeTotals(task);
    await updatedTask.populate('category', 'title');

    return res.status(201).json({
      timeEntry,
      task: updatedTask
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: err.message });
  }
};

const deleteTask = async (req, res) => {
    try {
      const deletedTask = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
      if (!deletedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      await enqueueGoogleSync({
        userId: req.user.id,
        sourceType: 'task',
        sourceId: deletedTask._id
      });
  
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
    createTaskTimeEntry,
    deleteTask,
    getTasksByListId,
    getTaskById
};
