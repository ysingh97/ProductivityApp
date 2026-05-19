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
  return testAuthUsers[persona] || null;
};

module.exports = {
  getTestAuthPayload,
  isTestAuthEnabled,
  testAuthUsers
};
