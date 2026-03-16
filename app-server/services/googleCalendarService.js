const { google } = require('googleapis');
const { getAuthorizedGoogleOAuthClient } = require('./googleOAuthService');

const getGoogleCalendarApi = (connection) => {
  const auth = getAuthorizedGoogleOAuthClient(connection);
  return google.calendar({ version: 'v3', auth });
};

const listAvailableCalendars = async (connection) => {
  const calendarApi = getGoogleCalendarApi(connection);
  const response = await calendarApi.calendarList.list();
  return (response.data.items || []).map((item) => ({
    id: item.id,
    summary: item.summary,
    primary: Boolean(item.primary),
    accessRole: item.accessRole
  }));
};

const createCalendarEvent = async ({ connection, calendarId, payload }) => {
  const calendarApi = getGoogleCalendarApi(connection);
  const response = await calendarApi.events.insert({
    calendarId,
    requestBody: payload
  });
  return response.data;
};

const updateCalendarEvent = async ({ connection, calendarId, eventId, payload }) => {
  const calendarApi = getGoogleCalendarApi(connection);
  const response = await calendarApi.events.update({
    calendarId,
    eventId,
    requestBody: payload
  });
  return response.data;
};

const deleteCalendarEvent = async ({ connection, calendarId, eventId }) => {
  const calendarApi = getGoogleCalendarApi(connection);
  await calendarApi.events.delete({
    calendarId,
    eventId
  });
};

module.exports = {
  listAvailableCalendars,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
};
