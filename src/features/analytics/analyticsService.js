import apiClient from '../../api/client';

export const fetchTimeByCategory = async ({ from, to } = {}) => {
  const params = new URLSearchParams();

  if (from) {
    params.set('from', from);
  }

  if (to) {
    params.set('to', to);
  }

  const query = params.toString();
  const response = await apiClient.get(
    `/analytics/time-by-category${query ? `?${query}` : ''}`
  );

  return response.data;
};
