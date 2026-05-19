const express = require('express');
const router = express.Router();
const {
  getTasks,
  createTask,
  deleteTask,
  getTasksByListId,
  getTaskById,
  updateTask,
  createTaskTimeEntry,
  updateTaskTimeEntry,
  getTaskTimeEntries,
  deleteTaskTimeEntry
} = require('../controllers/taskController');

router.get('/', getTasks);
router.post('/', createTask);
router.post('/:id/time-entries', createTaskTimeEntry);
router.put('/:id/time-entries/:entryId', updateTaskTimeEntry);
router.delete('/:id/time-entries/:entryId', deleteTaskTimeEntry);
router.delete('/:id', deleteTask);
router.get('/:id/time-entries', getTaskTimeEntries);
router.get('/list/:listId', getTasksByListId);
router.get('/:id', getTaskById);
router.put('/:id', updateTask); // Add this line to handle task updates

module.exports = router;
