import axios from 'axios';
import { createApiClient } from '@productivity/shared';

const apiClient = createApiClient({
  axios,
  baseURL: process.env.REACT_APP_API_URL,
  getToken: () => localStorage.getItem('authToken'),
  onUnauthorized: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('authExpired', '1');
      if (window.location.pathname !== '/') {
        window.location.assign('/');
      }
    }
  }
});

export default apiClient;
