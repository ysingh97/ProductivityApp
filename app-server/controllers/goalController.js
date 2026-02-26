const Goal = require('../models/goal'); // Import the Goal model

// Get all goals
const getGoals = async (req, res) => {
    try {
        const goals = await Goal.find({ userId: req.user.id });
        res.status(200).json(goals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getGoalById = async (req, res) => {
    try {
        const goal = await Goal.findOne({ _id: req.params.id, userId: req.user.id });
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
        let parentGoal = null;
        if (req.body.parentGoalId) {
            parentGoal = await Goal.findOne({ _id: req.body.parentGoalId, userId: req.user.id });
            if (!parentGoal) {
                return res.status(400).json({ message: "Invalid parentGoal ID" });
            }
        }

        const newGoal = new Goal({
            ...req.body,
            userId: req.user.id
        });
        const savedGoal = await newGoal.save();
        res.status(201).json(savedGoal);

        if (parentGoal) {
            parentGoal.subGoals.push(savedGoal._id);
            await parentGoal.save();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const updateGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, ...updates } = req.body;

        const existingGoal = await Goal.findOne({ _id: id, userId: req.user.id });
        if (!existingGoal) {
            return res.status(404).json({ message: "Goal not found" });
        }

        const hasParentUpdate = Object.prototype.hasOwnProperty.call(updates, 'parentGoalId');
        if (hasParentUpdate && updates.parentGoalId === '') {
            updates.parentGoalId = null;
        }

        if (hasParentUpdate && updates.parentGoalId) {
            if (String(updates.parentGoalId) === String(id)) {
                return res.status(400).json({ message: "Goal cannot be its own parent" });
            }
            const parentGoal = await Goal.findOne({ _id: updates.parentGoalId, userId: req.user.id });
            if (!parentGoal) {
                return res.status(400).json({ message: "Invalid parentGoal ID" });
            }
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
            const previousParentId = existingGoal.parentGoalId ? String(existingGoal.parentGoalId) : null;
            const nextParentId = updates.parentGoalId ? String(updates.parentGoalId) : null;

            if (previousParentId && previousParentId !== nextParentId) {
                await Goal.updateOne(
                    { _id: previousParentId, userId: req.user.id },
                    { $pull: { subGoals: existingGoal._id } }
                );
            }

            if (nextParentId && previousParentId !== nextParentId) {
                await Goal.updateOne(
                    { _id: nextParentId, userId: req.user.id },
                    { $addToSet: { subGoals: existingGoal._id } }
                );
            }
        }

        res.status(200).json(updatedGoal);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const deleteGoal = async (req, res) => {
    try {
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

        await Goal.updateMany(
            { parentGoalId: goalToDelete._id, userId: req.user.id },
            { $set: { parentGoalId: null } }
        );

        await Goal.deleteOne({ _id: goalToDelete._id, userId: req.user.id });
        
        res.json({
            message: 'Goal deleted',
            deletedTask: goalToDelete
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
