const Goal = require('../models/goal'); // Import the Goal model
const Task = require('../models/task');
const Category = require('../models/category');
const TimeEntry = require('../models/timeEntry');
const { enqueueGoogleSync } = require('../services/calendarSyncService');
const { isValidObjectId } = require('../utils/objectId');

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

const toIdString = (value) => (value ? String(value) : null);

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

    const descendantIds = await collectDescendantGoalIds(goal._id, userId);
    const taskIds = await Task.distinct('_id', {
        userId: goal.userId,
        parentGoalId: { $in: [goal._id, ...descendantIds] }
    });

    const aggregate = await TimeEntry.aggregate([
        {
            $match: {
                userId: goal.userId,
                taskId: { $in: taskIds }
            }
        },
        {
            $group: {
                _id: null,
                totalMinutes: { $sum: '$durationMinutes' }
            }
        }
    ]);

    const totalHours = roundToTwoDecimals((aggregate[0]?.totalMinutes || 0) / 60);
    const estimatedHours = Number(goal.estimatedHours) || 0;

    goal.timeSpent = totalHours;
    goal.timeLeft = roundToTwoDecimals(Math.max(estimatedHours - totalHours, 0));
    await goal.save();

    return goal;
};

const syncAllGoalTimeTotals = async (userId) => {
    const goals = await Goal.find({ userId }, { _id: 1 });
    for (const goal of goals) {
        await syncGoalTimeTotals(goal._id, userId);
    }
};

const syncGoalTimeTotalsForIds = async ({ userId, goalIds }) => {
    const goalIdsToSync = new Map();

    for (const goalId of goalIds) {
        if (!goalId) {
            continue;
        }

        const ancestorGoalIds = await collectAncestorGoalIds(goalId, userId);
        for (const ancestorGoalId of ancestorGoalIds) {
            goalIdsToSync.set(String(ancestorGoalId), ancestorGoalId);
        }
    }

    for (const goalId of goalIdsToSync.values()) {
        await syncGoalTimeTotals(goalId, userId);
    }
};

const applyCategoryToGoalTree = async (rootId, userId, nextCategoryId, previousCategoryId) => {
    const descendantIds = await collectDescendantGoalIds(rootId, userId);
    const goalIds = [rootId, ...descendantIds];
    const taskIds = await Task.distinct('_id', {
        parentGoalId: { $in: goalIds },
        userId
    });

    await Goal.updateMany(
        { _id: { $in: goalIds }, userId },
        { $set: { category: nextCategoryId } }
    );
    await Task.updateMany(
        { parentGoalId: { $in: goalIds }, userId },
        { $set: { category: nextCategoryId } }
    );
    await TimeEntry.updateMany(
        { taskId: { $in: taskIds }, userId },
        { $set: { category: nextCategoryId } }
    );

    const nextCategoryIdString = toIdString(nextCategoryId);
    const previousCategoryIdString = toIdString(previousCategoryId);

    if (previousCategoryIdString && previousCategoryIdString !== nextCategoryIdString) {
        await Category.updateOne(
            { _id: previousCategoryIdString, userId },
            { $pull: { goals: { $in: goalIds } } }
        );
    }

    if (nextCategoryIdString) {
        await Category.updateOne(
            { _id: nextCategoryIdString, userId },
            { $addToSet: { goals: { $each: goalIds } } }
        );
    }
};

// Get all goals
const getGoals = async (req, res) => {
    try {
        await syncAllGoalTimeTotals(req.user.id);
        const goals = await Goal.find({ userId: req.user.id }).populate('category', 'title');
        res.status(200).json(goals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getGoalById = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid goal ID" });
        }

        await syncGoalTimeTotals(req.params.id, req.user.id);
        const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id })
            .populate('category', 'title');
        if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
        }
      res.status(200).json(goal);
    } catch (err) {
        res.status(500).json({ message: err.message })
    }
  }

const createGoal = async (req, res) => {
    try {
        const { userId, timeSpent, timeLeft, ...goalBody } = req.body;
        let parentGoal = null;
        const parentGoalId = goalBody.parentGoalId || null;
        if (parentGoalId) {
            if (!isValidObjectId(parentGoalId)) {
                return res.status(400).json({ message: "Invalid parentGoal ID" });
            }
            parentGoal = await Goal.findOne({ _id: parentGoalId, userId: req.user.id });
            if (!parentGoal) {
                return res.status(400).json({ message: "Invalid parentGoal ID" });
            }
        }

        let categoryId = null;
        if (parentGoal) {
            const topLevelGoal = await getTopLevelGoal(parentGoal._id, req.user.id);
            categoryId = topLevelGoal ? topLevelGoal.category || null : null;
        } else {
            const category = await resolveCategory(goalBody.category, req.user.id);
            categoryId = category ? category._id : null;
        }

        const newGoal = new Goal({
            ...goalBody,
            category: categoryId,
            userId: req.user.id
        });
        const savedGoal = await newGoal.save();
        if (categoryId) {
            await Category.updateOne(
                { _id: categoryId, userId: req.user.id },
                { $addToSet: { goals: savedGoal._id } }
            );
        }

        if (parentGoal) {
            parentGoal.subGoals.push(savedGoal._id);
            await parentGoal.save();
        }

        const responseGoal = await syncGoalTimeTotals(savedGoal._id, req.user.id) || savedGoal;

        await enqueueGoogleSync({
            userId: req.user.id,
            sourceType: 'goal',
            sourceId: savedGoal._id
        });

        await responseGoal.populate('category', 'title');
        res.status(201).json(responseGoal);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const updateGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, timeSpent, timeLeft, ...updates } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ message: "Invalid goal ID" });
        }

        const existingGoal = await Goal.findOne({ _id: id, userId: req.user.id });
        if (!existingGoal) {
            return res.status(404).json({ message: "Goal not found" });
        }

        const hasParentUpdate = Object.prototype.hasOwnProperty.call(updates, 'parentGoalId');
        if (hasParentUpdate && updates.parentGoalId === '') {
            updates.parentGoalId = null;
        }

        const previousParentId = existingGoal.parentGoalId ? String(existingGoal.parentGoalId) : null;
        const nextParentId = hasParentUpdate ? updates.parentGoalId : existingGoal.parentGoalId;
        const nextParentIdString = nextParentId ? String(nextParentId) : null;

        if (hasParentUpdate && nextParentIdString) {
            if (!isValidObjectId(nextParentIdString)) {
                return res.status(400).json({ message: "Invalid parentGoal ID" });
            }
            if (nextParentIdString === String(id)) {
                return res.status(400).json({ message: "Goal cannot be its own parent" });
            }
            const parentGoal = await Goal.findOne({ _id: nextParentId, userId: req.user.id });
            if (!parentGoal) {
                return res.status(400).json({ message: "Invalid parentGoal ID" });
            }
        }

        const previousCategoryId = existingGoal.category || null;
        let nextCategoryId = previousCategoryId;
        if (nextParentIdString) {
            const topLevelGoal = await getTopLevelGoal(nextParentId, req.user.id);
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

        const updatedGoal = await Goal.findOneAndUpdate(
            { _id: id, userId: req.user.id },
            updates,
            { new: true, runValidators: true }
        );

        if (!updatedGoal) {
            return res.status(404).json({ message: "Goal not found" });
        }

        if (hasParentUpdate) {
            if (previousParentId && previousParentId !== nextParentIdString) {
                await Goal.updateOne(
                    { _id: previousParentId, userId: req.user.id },
                    { $pull: { subGoals: existingGoal._id } }
                );
            }

            if (nextParentIdString && previousParentId !== nextParentIdString) {
                await Goal.updateOne(
                    { _id: nextParentIdString, userId: req.user.id },
                    { $addToSet: { subGoals: existingGoal._id } }
                );
            }
        }

        const parentChanged = hasParentUpdate && previousParentId !== nextParentIdString;
        const categoryChanged = toIdString(previousCategoryId) !== toIdString(nextCategoryId);
        if (parentChanged || categoryChanged) {
            await applyCategoryToGoalTree(
                updatedGoal._id,
                req.user.id,
                nextCategoryId,
                previousCategoryId
            );
        }

        if (parentChanged) {
            await syncGoalTimeTotalsForIds({
                userId: req.user.id,
                goalIds: [previousParentId, nextParentId]
            });
        }

        const refreshedUpdatedGoal = await syncGoalTimeTotals(updatedGoal._id, req.user.id);
        const responseGoal = refreshedUpdatedGoal || updatedGoal;

        await responseGoal.populate('category', 'title');
        await enqueueGoogleSync({
            userId: req.user.id,
            sourceType: 'goal',
            sourceId: responseGoal._id
        });
        res.status(200).json(responseGoal);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const deleteGoal = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ message: "Invalid goal ID" });
        }

        const goalToDelete = await Goal.findOne({ _id: req.params.id, userId: req.user.id });

        if (!goalToDelete) {
            return res.status(404).json({ message: "Goal not found" });
        }

        if (goalToDelete.parentGoalId) {
            await Goal.updateOne(
                { _id: goalToDelete.parentGoalId, userId: req.user.id },
                { $pull: { subGoals: goalToDelete._id } }
            );
        }

        if (goalToDelete.category) {
            await Category.updateOne(
                { _id: goalToDelete.category, userId: req.user.id },
                { $pull: { goals: goalToDelete._id } }
            );
        }

        await Goal.updateMany(
            { parentGoalId: goalToDelete._id, userId: req.user.id },
            { $set: { parentGoalId: null } }
        );

        await Task.updateMany(
            { parentGoalId: goalToDelete._id, userId: req.user.id },
            { $set: { parentGoalId: null } }
        );

        await Goal.deleteOne({ _id: goalToDelete._id, userId: req.user.id });
        if (goalToDelete.parentGoalId) {
            await syncGoalTimeTotalsForIds({
                userId: req.user.id,
                goalIds: [goalToDelete.parentGoalId]
            });
        }

        await enqueueGoogleSync({
            userId: req.user.id,
            sourceType: 'goal',
            sourceId: goalToDelete._id
        });
        
        res.json({
            message: 'Goal deleted',
            deletedGoal: goalToDelete
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

module.exports = {
    getGoals,
    getGoalById,
    createGoal,
    updateGoal,
    deleteGoal,
};
