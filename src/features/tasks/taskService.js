import axios from 'axios';

export const fetchTasks = async () => {
  const response = await axios.get('http://localhost:5000/api/tasks');
  //console.log("fetchTasks: ", response.data);
  return response; // Returns the array of tasks
};

export const createTask = async (taskData) => {
  const response = await axios.post('http://localhost:5000/api/tasks', taskData);
  return response;  
}

export const deleteTask = async (taskId) => {
  const response = await axios.delete(`http://localhost:5000/api/tasks/${taskId}`);
  return response;
}