import axios from 'axios';

export const fetchTasks = async () => {
  const response = await axios.get(`${process.env.REACT_APP_API_URL}/tasks`);
  //console.log("fetchTasks: ", response.data);
  return response.data; // Returns the array of tasks
};

export const createTask = async (taskData) => {
  const response = await axios.post(`${process.env.REACT_APP_API_UR}/tasks`, taskData);
  return response.data;  
}

export const updateTask = async (taskId, updates) => {
  try {
    const res = await axios.put(`${process.env.REACT_APP_API_URL}/tasks/${taskId}`, updates);
    return res.data; // updated task object
  } catch (err) {
    console.error("Error updating task:", err);
    throw err;
  }
};

export const deleteTask = async (taskId) => {
  const response = await axios.delete(`${process.env.REACT_APP_API_URL}/tasks/${taskId}`);
  return response.data;
}

export const fetchTaskById = async (taskId) => {
  console.log(`fetchTaskById`);
  const response = await axios.get(`${process.env.REACT_APP_API_URL}/tasks/${taskId}`);
  console.log('fetchTaskbyId response: ', response.data);
  return response.data;
}

export const fetchTasksByListId = async (listId) => {
  const response = await axios.get(`${process.env.REACT_APP_API_URL}/tasks/lists/${listId}`);
  return response.data;
}