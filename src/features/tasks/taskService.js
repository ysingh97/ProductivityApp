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
