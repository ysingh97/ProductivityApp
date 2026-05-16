const List = require('../models/list'); // Import the List model
const Goal = require('../models/goal');

const getLists = async (req, res) => {
    try {
        const lists = await List.find({ userId: req.user.id });
        res.status(200).json(lists);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const createList = async (req, res) => {
    try {
        const { userId, tasks, ...listBody } = req.body;

        if (listBody.goalId) {
            const goal = await Goal.findOne({ _id: listBody.goalId, userId: req.user.id });
            if (!goal) {
                return res.status(400).json({ message: "Invalid goal for this user" });
            }
        }

        const newList = new List({
            ...listBody,
            tasks: [],
            userId: req.user.id
        });
        const savedList = await newList.save();
        res.status(201).json(savedList);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const getListsByGoalId = async (req, res) => {
    try {
        const lists = await List.find({ goalId: req.params.goalId, userId: req.user.id });
        res.status(200).json(lists);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getLists,
    createList,
    getListsByGoalId
};

  
  
