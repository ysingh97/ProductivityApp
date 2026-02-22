import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('authExpired', '1');
        if (window.location.pathname !== '/') {
          window.location.assign('/');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
