const { getAllowedAudiences } = require('../middleware/auth');

const originalClientId = process.env.GOOGLE_CLIENT_ID;
const originalAllowedAudiences = process.env.GOOGLE_ALLOWED_AUDIENCES;

const restore = (key, value) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

afterEach(() => {
  restore('GOOGLE_CLIENT_ID', originalClientId);
  restore('GOOGLE_ALLOWED_AUDIENCES', originalAllowedAudiences);
});

test('returns just the web client id when no extra audiences are configured', () => {
  process.env.GOOGLE_CLIENT_ID = 'web-client';
  delete process.env.GOOGLE_ALLOWED_AUDIENCES;

  expect(getAllowedAudiences()).toEqual(['web-client']);
});

test('includes comma-separated extra audiences and trims whitespace', () => {
  process.env.GOOGLE_CLIENT_ID = 'web-client';
  process.env.GOOGLE_ALLOWED_AUDIENCES = ' ios-client , android-client ';

  expect(getAllowedAudiences()).toEqual(['web-client', 'ios-client', 'android-client']);
});

test('de-duplicates audiences and ignores empty entries', () => {
  process.env.GOOGLE_CLIENT_ID = 'web-client';
  process.env.GOOGLE_ALLOWED_AUDIENCES = 'web-client,,ios-client,ios-client';

  expect(getAllowedAudiences()).toEqual(['web-client', 'ios-client']);
});
