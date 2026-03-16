const crypto = require('crypto');
const { google } = require('googleapis');
const User = require('../models/user');
const GoogleCalendarConnection = require('../models/googleCalendarConnection');

const getRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const getEncryptionKey = () =>
  crypto
    .createHash('sha256')
    .update(getRequiredEnv('GOOGLE_CALENDAR_TOKEN_SECRET'))
    .digest();

const encryptToken = (value) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
};

const decryptToken = (value) => {
  const [ivHex, authTagHex, encryptedHex] = value.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
};

const getOAuthClient = () =>
  new google.auth.OAuth2(
    getRequiredEnv('GOOGLE_CLIENT_ID'),
    getRequiredEnv('GOOGLE_CLIENT_SECRET'),
    getRequiredEnv('GOOGLE_CALENDAR_REDIRECT_URI')
  );

const buildSignedState = (payload) => {
  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getRequiredEnv('GOOGLE_CALENDAR_STATE_SECRET'))
    .update(serialized)
    .digest('base64url');
  return `${serialized}.${signature}`;
};

const parseSignedState = (state) => {
  const [serialized, signature] = String(state || '').split('.');
  if (!serialized || !signature) {
    throw new Error('Invalid Google Calendar OAuth state');
  }

  const expectedSignature = crypto
    .createHmac('sha256', getRequiredEnv('GOOGLE_CALENDAR_STATE_SECRET'))
    .update(serialized)
    .digest('base64url');

  if (signature !== expectedSignature) {
    throw new Error('Google Calendar OAuth state verification failed');
  }

  return JSON.parse(Buffer.from(serialized, 'base64url').toString('utf8'));
};

const buildGoogleCalendarConnectUrl = ({ userId }) => {
  const oauthClient = getOAuthClient();
  const state = buildSignedState({
    userId,
    redirectPath: '/settings/google-calendar',
    issuedAt: Date.now()
  });

  return oauthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
    ],
    state
  });
};

const completeGoogleCalendarOAuth = async ({ code, state }) => {
  const oauthClient = getOAuthClient();
  const { tokens } = await oauthClient.getToken(code);
  const parsedState = parseSignedState(state);

  const user = await User.findById(parsedState.userId);
  if (!user) {
    throw new Error('Unable to find the user for Google Calendar connection');
  }

  const existingConnection = await GoogleCalendarConnection.findOne({ userId: user._id });
  const refreshToken =
    tokens.refresh_token ||
    (existingConnection ? decryptToken(existingConnection.refreshTokenEncrypted) : null);

  if (!refreshToken) {
    throw new Error(
      'Google did not return a refresh token. Disconnect and reconnect with consent again.'
    );
  }

  const connection = await GoogleCalendarConnection.findOneAndUpdate(
    { userId: user._id },
    {
      googleEmail: user.email,
      googleSub: user.googleId,
      refreshTokenEncrypted: encryptToken(refreshToken),
      syncEnabled: true,
      lastSyncError: ''
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const appUrl = getRequiredEnv('APP_URL');
  const redirectPath = parsedState.redirectPath || '/settings/google-calendar';

  return {
    connection,
    redirectUrl: `${appUrl}${redirectPath}?googleCalendar=connected`
  };
};

const getAuthorizedGoogleOAuthClient = (connection) => {
  const oauthClient = getOAuthClient();
  oauthClient.setCredentials({
    refresh_token: decryptToken(connection.refreshTokenEncrypted)
  });
  return oauthClient;
};

module.exports = {
  buildGoogleCalendarConnectUrl,
  completeGoogleCalendarOAuth,
  getAuthorizedGoogleOAuthClient
};
