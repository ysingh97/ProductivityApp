// Interop for axios passed as either a direct export or an ESM namespace.
const resolveAxios = (lib) => (lib && lib.create ? lib : lib && lib.default) || lib;

// Creates an axios instance whose auth token and 401 handling are supplied by the
// host app. `getToken` may be synchronous (web/localStorage) or asynchronous
// (mobile/SecureStore); axios request interceptors support returning a promise.
//
// `axios` is injected by the caller rather than required here so each platform
// controls how axios is bundled/resolved (e.g. the web build resolves axios's
// ESM entry, not its `.cjs` build which some bundlers treat as an asset).
const createApiClient = ({ baseURL, getToken, onUnauthorized, axios } = {}) => {
  const axiosLib = resolveAxios(axios);
  if (!axiosLib || typeof axiosLib.create !== 'function') {
    throw new Error('createApiClient requires an axios instance');
  }
  const client = axiosLib.create({ baseURL });

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
