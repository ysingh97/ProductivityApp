const request = require('supertest');
const createApp = require('../app');

const originalNodeEnv = process.env.NODE_ENV;
const originalCorsAllowedOrigins = process.env.CORS_ALLOWED_ORIGINS;
let consoleErrorSpy;

beforeAll(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalCorsAllowedOrigins === undefined) {
    delete process.env.CORS_ALLOWED_ORIGINS;
  } else {
    process.env.CORS_ALLOWED_ORIGINS = originalCorsAllowedOrigins;
  }
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

test('health endpoint is reachable without authentication or an Origin header', async () => {
  delete process.env.CORS_ALLOWED_ORIGINS;
  process.env.NODE_ENV = 'test';

  const app = createApp();

  await request(app)
    .get('/api/health')
    .expect(200)
    .expect({ status: 'ok' });
});

test('app allows requests from explicitly configured CORS origins', async () => {
  process.env.NODE_ENV = 'production';
  process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com, https://staging.example.com';

  const app = createApp();

  await request(app)
    .get('/api/health')
    .set('Origin', 'https://staging.example.com')
    .expect(200)
    .expect('Access-Control-Allow-Origin', 'https://staging.example.com');
});

test('app rejects requests from disallowed CORS origins', async () => {
  process.env.NODE_ENV = 'production';
  process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com';

  const app = createApp();

  await request(app)
    .get('/api/health')
    .set('Origin', 'https://evil.example.com')
    .expect(500);
});
