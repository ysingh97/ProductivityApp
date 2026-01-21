import apiClient from '../../api/client';

export const fetchGoals = async () => {
  const response = await apiClient.get('/goals');
  //console.log("fetchTasks: ", response.data);
  return response.data; // Returns the array of goals
};

export const createGoal = async (goalData) => {
  const response = await apiClient.post('/goals', goalData);
  return response;  
}

export const deleteGoal = async (goalId) => {
  const response = await apiClient.delete(`/goals/${goalId}`);
  return response;
}

export const fetchGoalById = async (goalId) => {
  const response = await apiClient.get(`/goals/${goalId}`);
  return response.data;
}
