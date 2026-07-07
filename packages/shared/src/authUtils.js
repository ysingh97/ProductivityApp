const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Portable base64 decode so token parsing works in the browser, Node, and React
// Native (Hermes) without relying on a global `atob`.
const decodeBase64 = (input) => {
  if (typeof atob === 'function') {
    return atob(input);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'base64').toString('binary');
  }
  let str = String(input).replace(/=+$/, '');
  let output = '';
  let bc = 0;
  let bs = 0;
  for (let i = 0; i < str.length; i += 1) {
    const buffer = BASE64_CHARS.indexOf(str.charAt(i));
    if (buffer === -1) continue;
    bs = bc % 4 ? bs * 64 + buffer : buffer;
    if (bc % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
    bc += 1;
  }
  return output;
};

const isTestAuthToken = (token) =>
  process.env.NODE_ENV !== 'production' &&
  typeof token === 'string' &&
  token.startsWith('test:');

const decodeJwtPayload = (token) => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  try {
    return JSON.parse(decodeBase64(padded));
  } catch (err) {
    return null;
  }
};

const isTokenExpired = (token) => {
  // Allow deterministic non-JWT test personas for local automation outside production.
  if (isTestAuthToken(token)) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
};

module.exports = {
  isTestAuthToken,
  decodeJwtPayload,
  isTokenExpired
};
