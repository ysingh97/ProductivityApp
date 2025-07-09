const express = require('express');
const router = express.Router();
const {
  getTasks,
  createTask,
  deleteTask,
  getTasksByListId
} = require('../controllers/taskController');

router.get('/', getTasks);
router.post('/', createTask);
router.delete('/:id', deleteTask);
router.get('/:listId', getTasksByListId);

module.exports = router;