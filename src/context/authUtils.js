export const isTestAuthToken = (token) =>
  process.env.NODE_ENV !== 'production' &&
  typeof token === 'string' &&
  token.startsWith('test:');

export const decodeJwtPayload = (token) => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  try {
    return JSON.parse(atob(padded));
  } catch (err) {
    return null;
  }
};

export const isTokenExpired = (token) => {
  // Allow deterministic non-JWT test personas for local automation outside production.
  if (isTestAuthToken(token)) return false;
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
};
