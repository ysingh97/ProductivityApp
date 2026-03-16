import apiClient from '../../api/client';

export const fetchGoogleCalendarConnectUrl = async () => {
  const response = await apiClient.get('/integrations/google-calendar/connect-url');
  return response.data;
};

export const fetchGoogleCalendarStatus = async () => {
  const response = await apiClient.get('/integrations/google-calendar/status');
  return response.data;
};

export const fetchGoogleCalendars = async () => {
  const response = await apiClient.get('/integrations/google-calendar/calendars');
  return response.data;
};

export const saveGoogleCalendarSettings = async (settings) => {
  const response = await apiClient.put('/integrations/google-calendar/settings', settings);
  return response.data;
};

export const syncGoogleCalendarNow = async () => {
  const response = await apiClient.post('/integrations/google-calendar/sync-now');
  return response.data;
};

export const disconnectGoogleCalendar = async () => {
  const response = await apiClient.delete('/integrations/google-calendar/disconnect');
  return response.data;
};
