import axios from 'axios';

export const fetchTasks = async () => {
  const response = await axios.get('http://localhost:5000/api/tasks');
  console.log("fetchTasks: ", response.data);
  return response.data; // Returns the array of tasks
};