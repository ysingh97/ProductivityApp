import { createApiClient } from '@productivity/shared';
import { API_URL } from '../config/env';
import { getToken } from './tokenStore';

let unauthorizedHandler = null;

// Lets the auth layer react to 401s (e.g. sign the user out) without creating a
// circular import between the API client and the auth context.
export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

const apiClient = createApiClient({
  baseURL: API_URL,
  getToken,
  onUnauthorized: () => {
    if (typeof unauthorizedHandler === 'function') {
      unauthorizedHandler();
    }
  }
});

export default apiClient;
