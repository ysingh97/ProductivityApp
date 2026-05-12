import apiClient from '../../api/client';

export const fetchTasks = async () => {
  const response = await apiClient.get('/tasks');
  //console.log("fetchTasks: ", response.data);
  return response.data; // Returns the array of tasks
};

export const createTask = async (taskData) => {
  const response = await apiClient.post('/tasks', taskData);
  return response.data;
}

export const updateTask = async (taskId, updates) => {
  console.log("task service, updateTask, taskId, updates: ", taskId, updates);
  try {
    const res = await apiClient.put(`/tasks/${taskId}`, updates);
    return res.data; // updated task object
  } catch (err) {
    console.error("Error updating task:", err);
    throw err;
  }
};

export const createTaskTimeEntry = async (taskId, timeEntryData) => {
  try {
    const res = await apiClient.post(`/tasks/${taskId}/time-entries`, timeEntryData);
    return res.data;
  } catch (err) {
    console.error("Error creating task time entry:", err);
    throw err;
  }
};

export const fetchTaskTimeEntries = async (taskId) => {
  try {
    const res = await apiClient.get(`/tasks/${taskId}/time-entries`);
    return res.data;
  } catch (err) {
    console.error("Error fetching task time entries:", err);
    throw err;
  }
};

export const deleteTaskTimeEntry = async (taskId, entryId) => {
  try {
    const res = await apiClient.delete(`/tasks/${taskId}/time-entries/${entryId}`);
    return res.data;
  } catch (err) {
    console.error("Error deleting task time entry:", err);
    throw err;
  }
};

export const updateTaskTimeEntry = async (taskId, entryId, timeEntryData) => {
  try {
    const res = await apiClient.put(`/tasks/${taskId}/time-entries/${entryId}`, timeEntryData);
    return res.data;
  } catch (err) {
    console.error("Error updating task time entry:", err);
    throw err;
  }
};

export const deleteTask = async (taskId) => {
  const response = await apiClient.delete(`/tasks/${taskId}`);
  return response.data;
}

export const fetchTaskById = async (taskId) => {
  console.log(`fetchTaskById`);
  const response = await apiClient.get(`/tasks/${taskId}`);
  console.log('fetchTaskbyId response: ', response.data);
  return response.data;
}

export const fetchTasksByListId = async (listId) => {
  const response = await apiClient.get(`/tasks/list/${listId}`);
  return response.data;
}
