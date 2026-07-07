import services from '../../api/services';

export const {
  fetchGoogleCalendarConnectUrl,
  fetchGoogleCalendarStatus,
  fetchGoogleCalendars,
  saveGoogleCalendarSettings,
  syncGoogleCalendarNow,
  disconnectGoogleCalendar
} = services;
