const express = require('express');
const router = express.Router();
const {
  getTasks,
  createTask,
  deleteTask,
  getTasksByListId,
  getTaskById,
  updateTask,
  createTaskTimeEntry
} = require('../controllers/taskController');

router.get('/', getTasks);
router.post('/', createTask);
router.post('/:id/time-entries', createTaskTimeEntry);
router.delete('/:id', deleteTask);
router.get('/list/:listId', getTasksByListId);
router.get('/:id', getTaskById);
router.put('/:id', updateTask); // Add this line to handle task updates

module.exports = router;
