import axios from 'axios';

export const fetchGoals = async () => {
  const response = await axios.get('http://localhost:5000/api/goals');
  //console.log("fetchTasks: ", response.data);
  return response.data; // Returns the array of goals
};

export const createGoal = async (goalData) => {
  const response = await axios.post('http://localhost:5000/api/goals', goalData);
  return response;  
}

export const deleteGoal = async (goalId) => {
  const response = await axios.delete(`http://localhost:5000/api/goals/${goalId}`);
  return response;
}

export const fetchGoalById = async (goalId) => {
  const goals = await fetchGoals();
  console.log("fetchgoalsbyid goals: ", goals);
  return goals.find(goal => goal._id === goalId);
}