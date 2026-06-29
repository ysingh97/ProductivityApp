const {
  buildTestSessionPayload,
  getTestAuthPayload,
  isTestAuthEnabled
} = require('../utils/testAuth');

const originalNodeEnv = process.env.NODE_ENV;
const originalAllowTestAuth = process.env.ALLOW_TEST_AUTH;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalAllowTestAuth === undefined) {
    delete process.env.ALLOW_TEST_AUTH;
  } else {
    process.env.ALLOW_TEST_AUTH = originalAllowTestAuth;
  }
});

test('test auth is disabled unless explicitly enabled', () => {
  process.env.NODE_ENV = 'test';
  delete process.env.ALLOW_TEST_AUTH;

  expect(isTestAuthEnabled()).toBe(false);
  expect(getTestAuthPayload('test:basic')).toBeNull();
});

test('test auth returns deterministic mock user payloads when enabled', () => {
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_TEST_AUTH = 'true';

  expect(getTestAuthPayload('test:basic')).toEqual({
    sub: 'test-basic',
    email: 'viz-basic@example.test',
    name: 'Viz Basic',
    picture: ''
  });
});

test('test auth remains disabled in production even if the flag is set', () => {
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_TEST_AUTH = 'true';

  expect(isTestAuthEnabled()).toBe(false);
  expect(getTestAuthPayload('test:basic')).toBeNull();
});

test('unknown test personas are rejected', () => {
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_TEST_AUTH = 'true';

  expect(getTestAuthPayload('test:unknown')).toBeNull();
});

test('dynamic test sessions are mapped to deterministic mock users', () => {
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_TEST_AUTH = 'true';

  expect(getTestAuthPayload('test:session:goals-overview-123')).toEqual(
    buildTestSessionPayload('goals-overview-123')
  );
});
