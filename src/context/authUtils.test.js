import {
  decodeJwtPayload,
  isTestAuthToken,
  isTokenExpired
} from './authUtils';

const buildJwt = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
};

describe('authUtils', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  test('recognizes non-production test auth persona tokens', () => {
    process.env.NODE_ENV = 'test';

    expect(isTestAuthToken('test:basic')).toBe(true);
    expect(isTestAuthToken('not-a-test-token')).toBe(false);
    expect(isTestAuthToken(null)).toBe(false);
  });

  test('rejects test auth persona tokens in production', () => {
    process.env.NODE_ENV = 'production';

    expect(isTestAuthToken('test:basic')).toBe(false);
  });

  test('decodes a valid JWT payload', () => {
    const token = buildJwt({ sub: 'user-1', exp: 12345, scope: 'read' });

    expect(decodeJwtPayload(token)).toEqual({
      sub: 'user-1',
      exp: 12345,
      scope: 'read'
    });
  });

  test('returns null for malformed JWT payloads', () => {
    expect(decodeJwtPayload('')).toBeNull();
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('header.invalid-base64.signature')).toBeNull();
  });

  test('treats invalid or missing JWT expiry values as expired', () => {
    expect(isTokenExpired('')).toBe(true);
    expect(isTokenExpired(buildJwt({ sub: 'user-1' }))).toBe(true);
  });

  test('treats future expiry values as active and past expiry values as expired', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-24T12:00:00Z').getTime());

    const activeToken = buildJwt({ exp: Math.floor(Date.now() / 1000) + 60 });
    const expiredToken = buildJwt({ exp: Math.floor(Date.now() / 1000) - 60 });

    expect(isTokenExpired(activeToken)).toBe(false);
    expect(isTokenExpired(expiredToken)).toBe(true);
  });

  test('treats non-production test persona tokens as active', () => {
    process.env.NODE_ENV = 'test';

    expect(isTokenExpired('test:basic')).toBe(false);
  });
});
