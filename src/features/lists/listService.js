import axios from 'axios';

export const fetchLists = async () => {
  const response = await axios.get('http://localhost:5000/api/lists');
  //console.log("fetchLists: ", response.data);
  return response.data; // Returns the array of lists
};

export const createList = async (listData) => {
  const response = await axios.post('http://localhost:5000/api/lists', listData);
  return response;
}