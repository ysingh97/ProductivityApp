const Goal = require('../models/goal'); // Import the Goal model

// Get all goals
const getGoals = async (req, res) => {
    try {
        //console.log("goal get");
        const goals = await Goal.find();
        res.status(200).json(goals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const getGoalById = async (req, res) => {
    try {
      //console.log("delete task request: ", req, ". params: ", req.params);
        const goal = await Goal.findById(req.params.id);
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
        const newGoal = new Goal(req.body);
        const savedGoal = await newGoal.save();
        res.status(201).json(savedGoal);

        if (req.body.parentGoalId) {
        const parentGoal = await Goal.findById(req.body.parentGoalId);
        if (!parentGoal) {
            return res.status(400).json({ message: "Invalid parentGoal ID" });
        }
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
        const deletedTask = await Goal.findByIdAndDelete(req.params.id);

        if (!deletedTask) {
            return res.status(404).json({ message: "Task not found" });
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