const test = require('node:test');
const assert = require('node:assert/strict');

const { isTestAuthToken, decodeJwtPayload, isTokenExpired } = require('./authUtils');

const base64url = (obj) =>
  Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const makeJwt = (payload) => `header.${base64url(payload)}.signature`;

test('isTestAuthToken', async (t) => {
  const original = process.env.NODE_ENV;

  await t.test('true for test: prefixed tokens outside production', () => {
    process.env.NODE_ENV = 'development';
    assert.equal(isTestAuthToken('test:basic'), true);
  });

  await t.test('false in production even for test tokens', () => {
    process.env.NODE_ENV = 'production';
    assert.equal(isTestAuthToken('test:basic'), false);
  });

  await t.test('false for non-test strings and non-strings', () => {
    process.env.NODE_ENV = 'development';
    assert.equal(isTestAuthToken('real-token'), false);
    assert.equal(isTestAuthToken(null), false);
    assert.equal(isTestAuthToken(undefined), false);
    assert.equal(isTestAuthToken(123), false);
  });

  process.env.NODE_ENV = original;
});

test('decodeJwtPayload', async (t) => {
  await t.test('decodes a valid JWT payload', () => {
    const payload = { sub: 'abc', email: 'user@example.com', exp: 123 };
    assert.deepEqual(decodeJwtPayload(makeJwt(payload)), payload);
  });

  await t.test('returns null for empty / malformed tokens', () => {
    assert.equal(decodeJwtPayload(''), null);
    assert.equal(decodeJwtPayload(null), null);
    assert.equal(decodeJwtPayload('onlyonepart'), null);
    assert.equal(decodeJwtPayload('header.not-base64-json.sig'), null);
  });
});

test('isTokenExpired', async (t) => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';

  await t.test('false for deterministic test personas', () => {
    assert.equal(isTokenExpired('test:power'), false);
  });

  await t.test('true for an expired JWT', () => {
    const exp = Math.floor(Date.now() / 1000) - 60;
    assert.equal(isTokenExpired(makeJwt({ exp })), true);
  });

  await t.test('false for a JWT with a future expiry', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    assert.equal(isTokenExpired(makeJwt({ exp })), false);
  });

  await t.test('true when payload is missing or has no exp', () => {
    assert.equal(isTokenExpired('garbage'), true);
    assert.equal(isTokenExpired(makeJwt({ sub: 'x' })), true);
  });

  process.env.NODE_ENV = original;
});
