import apiClient from '../../api/client';

const buildAnalyticsQuery = ({ from, to, bucket } = {}) => {
  const params = new URLSearchParams();

  if (from) {
    params.set('from', from);
  }

  if (to) {
    params.set('to', to);
  }

  if (bucket) {
    params.set('bucket', bucket);
  }

  return params.toString();
};

export const fetchTimeByCategory = async ({ from, to } = {}) => {
  const query = buildAnalyticsQuery({ from, to });
  const response = await apiClient.get(
    `/analytics/time-by-category${query ? `?${query}` : ''}`
  );

  return response.data;
};

export const fetchTimeSeries = async ({ from, to, bucket } = {}) => {
  const query = buildAnalyticsQuery({ from, to, bucket });
  const response = await apiClient.get(
    `/analytics/time-series${query ? `?${query}` : ''}`
  );

  return response.data;
};
