jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    req.user = {
      id: req.headers['x-user-id'] || '000000000000000000000001'
    };
    next();
  }
}));

jest.mock('../services/googleOAuthService', () => ({
  buildGoogleCalendarConnectUrl: jest.fn(),
  completeGoogleCalendarOAuth: jest.fn()
}));

jest.mock('../services/googleCalendarService', () => ({
  listAvailableCalendars: jest.fn()
}));

jest.mock('../services/calendarSyncService', () => ({
  enqueueGoogleSyncForUser: jest.fn()
}));

const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const googleCalendarRoutes = require('../routes/googleCalendarRoutes');
const GoogleCalendarConnection = require('../models/googleCalendarConnection');
const {
  buildGoogleCalendarConnectUrl,
  completeGoogleCalendarOAuth
} = require('../services/googleOAuthService');
const { listAvailableCalendars } = require('../services/googleCalendarService');
const { enqueueGoogleSyncForUser } = require('../services/calendarSyncService');

jest.setTimeout(60000);

const originalAppUrl = process.env.APP_URL;

let app;
let mongoServer;
let consoleErrorSpy;

beforeAll(async () => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app = express();
  app.use(express.json());
  app.use('/api/integrations/google-calendar', googleCalendarRoutes);
});

afterEach(async () => {
  jest.clearAllMocks();
  await GoogleCalendarConnection.deleteMany({});
  process.env.APP_URL = originalAppUrl;
});

afterAll(async () => {
  consoleErrorSpy.mockRestore();
  if (originalAppUrl === undefined) {
    delete process.env.APP_URL;
  } else {
    process.env.APP_URL = originalAppUrl;
  }

  await mongoose.disconnect();
  await mongoServer.stop();
});

test('connect-url returns the generated Google Calendar OAuth URL', async () => {
  buildGoogleCalendarConnectUrl.mockReturnValue('https://accounts.example/connect');

  await request(app)
    .get('/api/integrations/google-calendar/connect-url')
    .set('x-user-id', '111111111111111111111111')
    .expect(200)
    .expect({
      url: 'https://accounts.example/connect'
    });

  expect(buildGoogleCalendarConnectUrl).toHaveBeenCalledWith({
    userId: '111111111111111111111111'
  });
});

test('callback rejects missing OAuth parameters', async () => {
  await request(app)
    .get('/api/integrations/google-calendar/callback')
    .expect(400)
    .expect('Missing OAuth callback parameters.');
});

test('callback redirects to the success URL returned by the OAuth completion service', async () => {
  completeGoogleCalendarOAuth.mockResolvedValue({
    redirectUrl: 'http://localhost:3000/settings/google-calendar?googleCalendar=connected'
  });

  await request(app)
    .get('/api/integrations/google-calendar/callback?code=auth-code&state=signed-state')
    .expect(302)
    .expect('Location', 'http://localhost:3000/settings/google-calendar?googleCalendar=connected');

  expect(completeGoogleCalendarOAuth).toHaveBeenCalledWith({
    code: 'auth-code',
    state: 'signed-state'
  });
});

test('callback redirects to the error state when OAuth completion fails', async () => {
  process.env.APP_URL = 'http://localhost:3000';
  completeGoogleCalendarOAuth.mockRejectedValue(new Error('oauth failure'));

  await request(app)
    .get('/api/integrations/google-calendar/callback?code=auth-code&state=signed-state')
    .expect(302)
    .expect('Location', 'http://localhost:3000/settings/google-calendar?googleCalendar=error');
});

test('status reports disconnected when no Google Calendar connection exists', async () => {
  await request(app)
    .get('/api/integrations/google-calendar/status')
    .set('x-user-id', '111111111111111111111111')
    .expect(200)
    .expect({
      connected: false
    });
});

test('status reports the saved Google Calendar connection details', async () => {
  await GoogleCalendarConnection.create({
    userId: new mongoose.Types.ObjectId('111111111111111111111111'),
    googleEmail: 'calendar@example.com',
    googleSub: 'google-sub',
    refreshTokenEncrypted: 'encrypted-token',
    selectedCalendarId: 'primary',
    selectedCalendarSummary: 'Primary Calendar',
    syncEnabled: false,
    lastSyncAt: new Date('2026-01-12T18:00:00.000Z'),
    lastSyncError: 'previous failure'
  });

  await request(app)
    .get('/api/integrations/google-calendar/status')
    .set('x-user-id', '111111111111111111111111')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        connected: true,
        googleEmail: 'calendar@example.com',
        selectedCalendarId: 'primary',
        selectedCalendarSummary: 'Primary Calendar',
        syncEnabled: false,
        lastSyncError: 'previous failure'
      });
      expect(body.lastSyncAt).toBe('2026-01-12T18:00:00.000Z');
    });
});

test('calendars returns 404 when Google Calendar is not connected', async () => {
  await request(app)
    .get('/api/integrations/google-calendar/calendars')
    .set('x-user-id', '111111111111111111111111')
    .expect(404)
    .expect({
      message: 'Google Calendar is not connected.'
    });
});

test('calendars returns the available calendars for the saved connection', async () => {
  const connection = await GoogleCalendarConnection.create({
    userId: new mongoose.Types.ObjectId('111111111111111111111111'),
    googleEmail: 'calendar@example.com',
    googleSub: 'google-sub',
    refreshTokenEncrypted: 'encrypted-token',
    selectedCalendarId: 'primary',
    selectedCalendarSummary: 'Primary Calendar',
    syncEnabled: true
  });

  listAvailableCalendars.mockResolvedValue([
    { id: 'primary', summary: 'Primary Calendar', primary: true, accessRole: 'owner' }
  ]);

  await request(app)
    .get('/api/integrations/google-calendar/calendars')
    .set('x-user-id', '111111111111111111111111')
    .expect(200)
    .expect([
      { id: 'primary', summary: 'Primary Calendar', primary: true, accessRole: 'owner' }
    ]);

  expect(listAvailableCalendars).toHaveBeenCalledWith(
    expect.objectContaining({
      _id: connection._id,
      googleEmail: 'calendar@example.com'
    })
  );
});

test('settings saves selected calendar state, clears sync errors, and queues a full resync', async () => {
  await GoogleCalendarConnection.create({
    userId: new mongoose.Types.ObjectId('111111111111111111111111'),
    googleEmail: 'calendar@example.com',
    googleSub: 'google-sub',
    refreshTokenEncrypted: 'encrypted-token',
    selectedCalendarId: null,
    selectedCalendarSummary: null,
    syncEnabled: false,
    lastSyncError: 'stale failure'
  });

  await request(app)
    .put('/api/integrations/google-calendar/settings')
    .set('x-user-id', '111111111111111111111111')
    .send({
      selectedCalendarId: 'team-calendar',
      selectedCalendarSummary: 'Team Calendar',
      syncEnabled: true
    })
    .expect(200)
    .expect({
      connected: true,
      googleEmail: 'calendar@example.com',
      selectedCalendarId: 'team-calendar',
      selectedCalendarSummary: 'Team Calendar',
      syncEnabled: true
    });

  const persistedConnection = await GoogleCalendarConnection.findOne({
    userId: new mongoose.Types.ObjectId('111111111111111111111111')
  }).lean();

  expect(persistedConnection.selectedCalendarId).toBe('team-calendar');
  expect(persistedConnection.selectedCalendarSummary).toBe('Team Calendar');
  expect(persistedConnection.syncEnabled).toBe(true);
  expect(persistedConnection.lastSyncError).toBe('');
  expect(enqueueGoogleSyncForUser).toHaveBeenCalledWith({
    userId: '111111111111111111111111'
  });
});

test('sync-now queues a full Google Calendar resync for the authenticated user', async () => {
  await request(app)
    .post('/api/integrations/google-calendar/sync-now')
    .set('x-user-id', '111111111111111111111111')
    .expect(202)
    .expect({
      message: 'Google Calendar sync queued.'
    });

  expect(enqueueGoogleSyncForUser).toHaveBeenCalledWith({
    userId: '111111111111111111111111'
  });
});

test('disconnect removes the saved Google Calendar connection', async () => {
  await GoogleCalendarConnection.create({
    userId: new mongoose.Types.ObjectId('111111111111111111111111'),
    googleEmail: 'calendar@example.com',
    googleSub: 'google-sub',
    refreshTokenEncrypted: 'encrypted-token',
    selectedCalendarId: 'primary',
    selectedCalendarSummary: 'Primary Calendar',
    syncEnabled: true
  });

  await request(app)
    .delete('/api/integrations/google-calendar/disconnect')
    .set('x-user-id', '111111111111111111111111')
    .expect(200)
    .expect({
      message: 'Google Calendar disconnected.'
    });

  const persistedConnection = await GoogleCalendarConnection.findOne({
    userId: new mongoose.Types.ObjectId('111111111111111111111111')
  }).lean();

  expect(persistedConnection).toBeNull();
});
