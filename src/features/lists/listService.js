import apiClient from '../../api/client';

export const fetchLists = async () => {
  const response = await apiClient.get('/lists');
  //console.log("fetchLists: ", response.data);
  return response.data; // Returns the array of lists
};

export const createList = async (listData) => {
  const response = await apiClient.post('/lists', listData);
  return response;
}
