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

const collectDescendantGoalIds = async (rootId, userId) => {
  const descendantIds = [];
  const queue = [rootId];
  const seen = new Set([String(rootId)]);

  while (queue.length) {
    const batch = queue.splice(0, queue.length);
    const children = await Goal.find(
      { parentGoalId: { $in: batch }, userId },
      { _id: 1 }
    );

    for (const child of children) {
      const childId = String(child._id);
      if (seen.has(childId)) {
        continue;
      }

      seen.add(childId);
      descendantIds.push(child._id);
      queue.push(child._id);
    }
  }

  return descendantIds;
};

const collectAncestorGoalIds = async (goalId, userId) => {
  const ancestorGoalIds = [];
  let currentGoal = await Goal.findOne({ _id: goalId, userId }, { _id: 1, parentGoalId: 1 });
  const seen = new Set();

  while (currentGoal) {
    const currentId = String(currentGoal._id);
    if (seen.has(currentId)) {
      break;
    }

    seen.add(currentId);
    ancestorGoalIds.push(currentGoal._id);

    if (!currentGoal.parentGoalId) {
      break;
    }

    currentGoal = await Goal.findOne(
      { _id: currentGoal.parentGoalId, userId },
      { _id: 1, parentGoalId: 1 }
    );
  }

  return ancestorGoalIds;
};

const syncGoalTimeTotals = async (goalId, userId) => {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) {
    return null;
  }

  const descendantGoalIds = await collectDescendantGoalIds(goal._id, userId);
  const aggregate = await Task.aggregate([
    {
      $match: {
        userId: goal.userId,
        parentGoalId: { $in: [goal._id, ...descendantGoalIds] }
      }
    },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$timeSpent' }
      }
    }
  ]);

  const totalHours = roundToTwoDecimals(aggregate[0]?.totalHours || 0);
  const estimatedHours = Number(goal.estimatedHours) || 0;

  goal.timeSpent = totalHours;
  goal.timeLeft = roundToTwoDecimals(Math.max(estimatedHours - totalHours, 0));
  await goal.save();

  return goal;
};

const syncParentGoalTimeTotalsForIds = async ({ userId, parentGoalIds }) => {
  const goalIdsToSync = new Map();

  for (const parentGoalId of parentGoalIds) {
    if (!parentGoalId) {
      continue;
    }

    const ancestorGoalIds = await collectAncestorGoalIds(parentGoalId, userId);
    for (const goalId of ancestorGoalIds) {
      goalIdsToSync.set(String(goalId), goalId);
    }
  }

  for (const goalId of goalIdsToSync.values()) {
    await syncGoalTimeTotals(goalId, userId);
  }
};

const syncParentGoalTimeTotals = async (task) => (
  syncParentGoalTimeTotalsForIds({
    userId: task.userId,
    parentGoalIds: [task.parentGoalId]
  })
);

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
  await syncParentGoalTimeTotals(task);

  return task;
};

const parseTimeEntryRange = (body) => {
  const startedAt = new Date(body.startedAt);
  const endedAt = new Date(body.endedAt);

  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
    return {
      error: 'startedAt and endedAt must be valid ISO date-time values.'
    };
  }

  if (endedAt <= startedAt) {
    return {
      error: 'endedAt must be after startedAt.'
    };
  }

  return {
    startedAt,
    endedAt,
    durationMinutes: (endedAt - startedAt) / 60000
  };
};

const findExactDuplicateTimeEntry = async ({
  userId,
  taskId,
  startedAt,
  endedAt,
  excludeEntryId
}) => {
  const query = {
    userId,
    taskId,
    startedAt,
    endedAt
  };

  if (excludeEntryId) {
    query._id = { $ne: excludeEntryId };
  }

  return TimeEntry.findOne(query);
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

    const previousParentGoalId = existingTask.parentGoalId || null;
    const nextParentGoalId = hasParentUpdate ? updates.parentGoalId : existingTask.parentGoalId;
    const previousParentGoalIdString = previousParentGoalId ? String(previousParentGoalId) : null;
    const nextParentGoalIdString = nextParentGoalId ? String(nextParentGoalId) : null;

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

    const estimatedHours = Number(updatedTask.estimatedCompletionTime) || 0;
    const spentHours = Number(updatedTask.timeSpent) || 0;
    updatedTask.timeLeft = roundToTwoDecimals(Math.max(estimatedHours - spentHours, 0));
    await updatedTask.save();

    const parentChanged = hasParentUpdate && previousParentGoalIdString !== nextParentGoalIdString;
    if (parentChanged) {
      if (previousParentGoalIdString) {
        await Goal.updateOne(
          { _id: previousParentGoalIdString, userId: req.user.id },
          { $pull: { subTasks: updatedTask._id } }
        );
      }

      if (nextParentGoalIdString) {
        await Goal.updateOne(
          { _id: nextParentGoalIdString, userId: req.user.id },
          { $addToSet: { subTasks: updatedTask._id } }
        );
      }

      await syncParentGoalTimeTotalsForIds({
        userId: req.user.id,
        parentGoalIds: [previousParentGoalId, nextParentGoalId]
      });
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

    const parsedRange = parseTimeEntryRange(req.body);
    if (parsedRange.error) {
      return res.status(400).json({ error: parsedRange.error });
    }

    const { startedAt, endedAt, durationMinutes } = parsedRange;

    const existingTimeEntry = await findExactDuplicateTimeEntry({
      userId: req.user.id,
      taskId: task._id,
      startedAt,
      endedAt
    });

    if (existingTimeEntry) {
      const updatedTask = await syncTaskTimeTotals(task);
      await updatedTask.populate('category', 'title');

      return res.status(200).json({
        timeEntry: existingTimeEntry,
        task: updatedTask,
        duplicate: true
      });
    }

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
      task: updatedTask,
      duplicate: false
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: err.message });
  }
};

const updateTaskTimeEntry = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const timeEntry = await TimeEntry.findOne({
      _id: req.params.entryId,
      taskId: task._id,
      userId: req.user.id
    });

    if (!timeEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    const parsedRange = parseTimeEntryRange(req.body);
    if (parsedRange.error) {
      return res.status(400).json({ error: parsedRange.error });
    }

    const { startedAt, endedAt, durationMinutes } = parsedRange;

    const exactDuplicate = await findExactDuplicateTimeEntry({
      userId: req.user.id,
      taskId: task._id,
      startedAt,
      endedAt,
      excludeEntryId: timeEntry._id
    });

    if (exactDuplicate) {
      return res.status(409).json({
        error: 'A matching time entry already exists for this task.'
      });
    }

    timeEntry.startedAt = startedAt;
    timeEntry.endedAt = endedAt;
    timeEntry.durationMinutes = durationMinutes;
    timeEntry.category = task.category || null;
    await timeEntry.save();

    const updatedTask = await syncTaskTimeTotals(task);
    await updatedTask.populate('category', 'title');

    return res.status(200).json({
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

const deleteTaskTimeEntry = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const deletedTimeEntry = await TimeEntry.findOneAndDelete({
      _id: req.params.entryId,
      taskId: task._id,
      userId: req.user.id
    });

    if (!deletedTimeEntry) {
      return res.status(404).json({ message: 'Time entry not found' });
    }

    const updatedTask = await syncTaskTimeTotals(task);
    await updatedTask.populate('category', 'title');

    return res.status(200).json({
      deletedTimeEntry,
      task: updatedTask
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

const deleteTask = async (req, res) => {
    try {
      const deletedTask = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
      if (!deletedTask) {
        return res.status(404).json({ message: "Task not found" });
      }

      const deletedTimeEntries = await TimeEntry.deleteMany({
        taskId: deletedTask._id,
        userId: req.user.id
      });

      if (deletedTask.parentGoalId) {
        await Goal.updateOne(
          { _id: deletedTask.parentGoalId, userId: req.user.id },
          { $pull: { subTasks: deletedTask._id } }
        );

        await syncParentGoalTimeTotalsForIds({
          userId: req.user.id,
          parentGoalIds: [deletedTask.parentGoalId]
        });
      }

      if (deletedTask.listId) {
        await List.updateOne(
          { _id: deletedTask.listId, userId: req.user.id },
          { $pull: { tasks: deletedTask._id } }
        );
      }

      await enqueueGoogleSync({
        userId: req.user.id,
        sourceType: 'task',
        sourceId: deletedTask._id
      });
  
      res.json({
        message: "Task deleted successfully",
        deletedTask,
        deletedTimeEntryCount: deletedTimeEntries.deletedCount || 0
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

const getTaskTimeEntries = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const timeEntries = await TimeEntry.find({
      taskId: task._id,
      userId: req.user.id
    })
      .sort({ endedAt: -1, startedAt: -1 })
      .populate('category', 'title')
      .lean();

    return res.status(200).json(timeEntries);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

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
    updateTaskTimeEntry,
    deleteTaskTimeEntry,
    deleteTask,
    getTasksByListId,
    getTaskById,
    getTaskTimeEntries
};
