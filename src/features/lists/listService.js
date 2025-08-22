import axios from 'axios';

export const fetchLists = async () => {
  const response = await axios.get(`${process.env.REACT_APP_API_URL}/lists`);
  //console.log("fetchLists: ", response.data);
  return response.data; // Returns the array of lists
};

export const createList = async (listData) => {
  const response = await axios.post(`${process.env.REACT_APP_API_URL}/lists`, listData);
  return response;
}