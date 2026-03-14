const GoogleCalendarConnection = require('../models/googleCalendarConnection');
const {
  buildGoogleCalendarConnectUrl,
  completeGoogleCalendarOAuth
} = require('../services/googleOAuthService');
const { listAvailableCalendars } = require('../services/googleCalendarService');
const { enqueueGoogleSyncForUser } = require('../services/calendarSyncService');

const getGoogleCalendarConnectUrl = async (req, res) => {
  try {
    const url = buildGoogleCalendarConnectUrl({ userId: req.user.id });
    res.status(200).json({ url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const handleGoogleCalendarCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.status(400).send('Missing OAuth callback parameters.');
    }

    const { redirectUrl } = await completeGoogleCalendarOAuth({ code, state });
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('Google Calendar OAuth callback failed', err);
    const appUrl = process.env.APP_URL || '';
    res.redirect(`${appUrl}/settings/google-calendar?googleCalendar=error`);
  }
};

const getGoogleCalendarStatus = async (req, res) => {
  try {
    const connection = await GoogleCalendarConnection.findOne({ userId: req.user.id });
    if (!connection) {
      return res.status(200).json({
        connected: false
      });
    }

    res.status(200).json({
      connected: true,
      googleEmail: connection.googleEmail,
      selectedCalendarId: connection.selectedCalendarId,
      selectedCalendarSummary: connection.selectedCalendarSummary,
      syncEnabled: connection.syncEnabled,
      lastSyncAt: connection.lastSyncAt,
      lastSyncError: connection.lastSyncError
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getGoogleCalendars = async (req, res) => {
  try {
    const connection = await GoogleCalendarConnection.findOne({ userId: req.user.id });
    if (!connection) {
      return res.status(404).json({ message: 'Google Calendar is not connected.' });
    }

    const calendars = await listAvailableCalendars(connection);
    res.status(200).json(calendars);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const saveGoogleCalendarSettings = async (req, res) => {
  try {
    const { selectedCalendarId, selectedCalendarSummary, syncEnabled } = req.body;
    const connection = await GoogleCalendarConnection.findOne({ userId: req.user.id });

    if (!connection) {
      return res.status(404).json({ message: 'Google Calendar is not connected.' });
    }

    if (typeof syncEnabled === 'boolean') {
      connection.syncEnabled = syncEnabled;
    }

    if (selectedCalendarId) {
      connection.selectedCalendarId = selectedCalendarId;
      connection.selectedCalendarSummary = selectedCalendarSummary || selectedCalendarId;
    }

    connection.lastSyncError = '';
    await connection.save();

    // Changing sync settings or the selected calendar should enqueue a full user resync.
    await enqueueGoogleSyncForUser({ userId: req.user.id });

    res.status(200).json({
      connected: true,
      googleEmail: connection.googleEmail,
      selectedCalendarId: connection.selectedCalendarId,
      selectedCalendarSummary: connection.selectedCalendarSummary,
      syncEnabled: connection.syncEnabled
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const syncGoogleCalendarNow = async (req, res) => {
  try {
    await enqueueGoogleSyncForUser({ userId: req.user.id });
    res.status(202).json({ message: 'Google Calendar sync queued.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const disconnectGoogleCalendar = async (req, res) => {
  try {
    await GoogleCalendarConnection.deleteOne({ userId: req.user.id });
    res.status(200).json({ message: 'Google Calendar disconnected.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getGoogleCalendarConnectUrl,
  handleGoogleCalendarCallback,
  getGoogleCalendarStatus,
  getGoogleCalendars,
  saveGoogleCalendarSettings,
  syncGoogleCalendarNow,
  disconnectGoogleCalendar
};
