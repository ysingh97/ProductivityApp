const testAuthUsers = {
  empty: {
    sub: 'test-empty',
    email: 'viz-empty@example.test',
    name: 'Viz Empty',
    picture: ''
  },
  basic: {
    sub: 'test-basic',
    email: 'viz-basic@example.test',
    name: 'Viz Basic',
    picture: ''
  },
  power: {
    sub: 'test-power',
    email: 'viz-power@example.test',
    name: 'Viz Power',
    picture: ''
  },
  edge: {
    sub: 'test-edge',
    email: 'viz-edge@example.test',
    name: 'Viz Edge',
    picture: ''
  }
};

const sanitizeTestSessionKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatSessionName = (sessionKey) =>
  sessionKey
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Session';

const buildTestSessionPayload = (sessionKey) => {
  const normalizedKey = sanitizeTestSessionKey(sessionKey);
  if (!normalizedKey) {
    return null;
  }

  return {
    sub: `test-session-${normalizedKey}`,
    email: `viz-${normalizedKey}@example.test`,
    name: `Viz ${formatSessionName(normalizedKey)}`,
    picture: ''
  };
};

const isTestAuthEnabled = () =>
  process.env.NODE_ENV !== 'production' && process.env.ALLOW_TEST_AUTH === 'true';

const getTestAuthPayload = (token) => {
  if (!isTestAuthEnabled() || typeof token !== 'string') {
    return null;
  }

  if (!token.startsWith('test:')) {
    return null;
  }

  const persona = token.slice('test:'.length);
  if (persona.startsWith('session:')) {
    return buildTestSessionPayload(persona.slice('session:'.length));
  }

  return testAuthUsers[persona] || null;
};

module.exports = {
  buildTestSessionPayload,
  getTestAuthPayload,
  isTestAuthEnabled,
  sanitizeTestSessionKey,
  testAuthUsers
};
