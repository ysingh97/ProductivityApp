import apiClient from '../../api/client';

export const fetchCategories = async () => {
  const response = await apiClient.get('/categories');
  return response.data;
};
