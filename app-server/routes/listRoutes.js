const express = require('express');
const router = express.Router();
const {
  getLists,
  createList,
  getListByGoalId
} = require('../controllers/listController'); // Import the List model

router.get('/', getLists);
router.post('/', createList);
router.get('/:goalId', getListByGoalId);

module.exports = router;