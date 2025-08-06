const express = require('express');
const router = express.Router();
const {
  getTasks,
  createTask,
  deleteTask,
  getTasksByListId,
  getTaskById
} = require('../controllers/taskController');

router.get('/', getTasks);
router.post('/', createTask);
router.delete('/:id', deleteTask);
router.get('/list/:listId', getTasksByListId);
router.get('/:id', getTaskById);

module.exports = router;