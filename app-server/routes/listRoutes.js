const express = require('express');
const router = express.Router();
const {
  getLists,
  createList,
  getListsByGoalId
} = require('../controllers/listController'); // Import the List model

router.get('/', getLists);
router.post('/', createList);
router.get('/:goalId', getListsByGoalId);

module.exports = router;