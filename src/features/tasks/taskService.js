import services from '../../api/services';

export const {
  fetchTasks,
  createTask,
  updateTask,
  createTaskTimeEntry,
  fetchTaskTimeEntries,
  deleteTaskTimeEntry,
  updateTaskTimeEntry,
  deleteTask,
  fetchTaskById,
  fetchTasksByListId
} = services;
