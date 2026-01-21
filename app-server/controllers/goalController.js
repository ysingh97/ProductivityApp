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
    //TODO
}

const deleteGoal = async (req, res) => {
    try {
        const deletedTask = await Goal.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

        if (!deletedTask) {
            return res.status(404).json({ message: "Goal not found" });
        }
        
        res.json({
            message: 'Goal deleted',
            deletedTask
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
