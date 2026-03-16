const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getGoogleCalendarConnectUrl,
  handleGoogleCalendarCallback,
  getGoogleCalendarStatus,
  getGoogleCalendars,
  saveGoogleCalendarSettings,
  syncGoogleCalendarNow,
  disconnectGoogleCalendar
} = require('../controllers/googleCalendarController');

const router = express.Router();

// Google calls the callback URL directly, so this endpoint cannot rely on the auth middleware.
router.get('/callback', handleGoogleCalendarCallback);

router.use(requireAuth);

router.get('/connect-url', getGoogleCalendarConnectUrl);
router.get('/status', getGoogleCalendarStatus);
router.get('/calendars', getGoogleCalendars);
router.put('/settings', saveGoogleCalendarSettings);
router.post('/sync-now', syncGoogleCalendarNow);
router.delete('/disconnect', disconnectGoogleCalendar);

module.exports = router;
