const List = require('../models/list'); // Import the List model

const getLists = async (req, res) => {
    try {
        //console.log("get lists");
        const lists = await List.find();
        res.status(200).json(lists);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const createList = async (req, res) => {
    try {
        const newList = new List(req.body);
        const savedList = await newList.save();
        res.status(201).json(savedList);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const getListsByGoalId = async (req, res) => {
    try {
        //console.log("list get for goal");
        const lists = await List.find({ goalId: req.params.goalId });
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

  
  