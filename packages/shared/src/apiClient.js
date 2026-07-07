const axiosModule = require('axios');
// Interop for both CommonJS builds and ESM-default mocks/bundles of axios.
const axios = axiosModule.default || axiosModule;

// Creates an axios instance whose auth token and 401 handling are supplied by the
// host app. `getToken` may be synchronous (web/localStorage) or asynchronous
// (mobile/SecureStore); axios request interceptors support returning a promise.
const createApiClient = ({ baseURL, getToken, onUnauthorized } = {}) => {
  const client = axios.create({ baseURL });

  const applyToken = (config, token) => {
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  };

  client.interceptors.request.use((config) => {
    if (!getToken) {
      return config;
    }
    const maybeToken = getToken();
    // Support both synchronous token stores (web/localStorage) and asynchronous
    // ones (mobile/SecureStore) without forcing every request to be async.
    if (maybeToken && typeof maybeToken.then === 'function') {
      return maybeToken.then((token) => applyToken(config, token));
    }
    return applyToken(config, maybeToken);
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401 && typeof onUnauthorized === 'function') {
        onUnauthorized();
      }
      return Promise.reject(error);
    }
  );

  return client;
};

module.exports = { createApiClient };
