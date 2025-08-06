import axios from 'axios';

export const fetchTasks = async () => {
  const response = await axios.get('http://localhost:5000/api/tasks');
  //console.log("fetchTasks: ", response.data);
  return response.data; // Returns the array of tasks
};

export const createTask = async (taskData) => {
  const response = await axios.post('http://localhost:5000/api/tasks', taskData);
  return response.data;  
}

export const deleteTask = async (taskId) => {
  const response = await axios.delete(`http://localhost:5000/api/tasks/${taskId}`);
  return response.data;
}

export const fetchTaskById = async (taskId) => {
  console.log(`fetchTaskById`);
  const response = await axios.get(`http://localhost:5000/api/tasks/${taskId}`);
  console.log('fetchTaskbyId response: ', response.data);
  return response.data;
}

export const fetchTasksByListId = async (listId) => {
  const response = await axios.get(`http://localhost:5000/api/tasks/lists/${listId}`);
  return response.data;
}