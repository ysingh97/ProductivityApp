const test = require('node:test');
const assert = require('node:assert/strict');

const { createApiClient } = require('./apiClient');

// A fake axios that records the interceptors registered by createApiClient so we
// can invoke them directly without a real network layer.
const makeFakeAxios = () => {
  const state = {};
  const instance = {
    interceptors: {
      request: { use: (fn) => { state.request = fn; } },
      response: { use: (onFulfilled, onRejected) => {
        state.responseFulfilled = onFulfilled;
        state.responseRejected = onRejected;
      } }
    }
  };
  return {
    state,
    create: (config) => {
      state.config = config;
      return instance;
    }
  };
};

test('createApiClient requires an axios instance', () => {
  assert.throws(() => createApiClient({ baseURL: '/api' }), /requires an axios instance/);
  assert.throws(() => createApiClient({ axios: {} }), /requires an axios instance/);
});

test('accepts axios as an ESM namespace (default export)', () => {
  const fake = makeFakeAxios();
  assert.doesNotThrow(() => createApiClient({ axios: { default: fake }, baseURL: '/api' }));
  assert.deepEqual(fake.state.config, { baseURL: '/api' });
});

test('request interceptor adds a bearer token from a synchronous store', () => {
  const fake = makeFakeAxios();
  createApiClient({ axios: fake, getToken: () => 'sync-token' });

  const config = fake.state.request({ headers: {} });
  assert.equal(config.headers.Authorization, 'Bearer sync-token');
});

test('request interceptor awaits a token from an asynchronous store', async () => {
  const fake = makeFakeAxios();
  createApiClient({ axios: fake, getToken: () => Promise.resolve('async-token') });

  const config = await fake.state.request({ headers: {} });
  assert.equal(config.headers.Authorization, 'Bearer async-token');
});

test('request interceptor leaves requests untouched without a token or getToken', () => {
  const fake = makeFakeAxios();
  createApiClient({ axios: fake });
  const noGetToken = fake.state.request({ headers: {} });
  assert.equal(noGetToken.headers.Authorization, undefined);

  const fake2 = makeFakeAxios();
  createApiClient({ axios: fake2, getToken: () => null });
  const noToken = fake2.state.request({ headers: {} });
  assert.equal(noToken.headers.Authorization, undefined);
});

test('response interceptor invokes onUnauthorized only on 401', async () => {
  const fake = makeFakeAxios();
  let called = 0;
  createApiClient({ axios: fake, onUnauthorized: () => { called += 1; } });

  await assert.rejects(fake.state.responseRejected({ response: { status: 401 } }));
  assert.equal(called, 1);

  await assert.rejects(fake.state.responseRejected({ response: { status: 500 } }));
  assert.equal(called, 1);

  await assert.rejects(fake.state.responseRejected({ message: 'network error' }));
  assert.equal(called, 1);
});
